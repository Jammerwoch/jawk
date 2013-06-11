#!/usr/bin/env node

var fs = require('fs'),
	vm = require('vm'),
	readlines = require('./lib/readlines').readlines;

var opts = require('nomnom')
	.script('jawk')
	.option( 'file', {
		abbr: 'f',
		flag: false,
		help: 'Script file'
	})
	.option( 'verbose', {
		flag: true,
		help: 'Verbose output'
	})
	.parse();

var program;
var inputFname;
var inputEncoding = 'utf8';

if( opts.file ) {
	program = fs.readFileSync( opts.file, 'utf8' ).replace(/\r/g,'');
	// TODO: handle case of console input
	if( opts._.length === 0 ) {
		console.log( 'error: you must specify an input file (console input not currently supported).' );
		process.exit( 1 );
	} else if( opts._.length === 1 ) {
		inputFname = opts[0];
	} else {
		console.log( 'error: too many arguments.' );
		process.exit( 1 );
	}
} else {
	if( opts._.length < 2 ) {
		console.log( 'error: you must specify a jawk program and an input file (console input not currently supported).' );
		process.exit( 1 );
	} else if( opts._.length === 2 ) {
		program = opts[0].replace(/\r/g,'');
		// TODO: handle case of console input
		inputFname = opts[1];
	} else {
		console.log( 'error: too many arguments.' );
		process.exit( 1 );
	}
}

// note that for functions below, this!=jawkContext, so we have to use jawkContext explicitly.  this is a little
// fragile, but it works, so i'm leaving it for now....
var jawkContext = vm.createContext({
	RS: '\\s+',
	NR: 0,
	print: function(s) { console.log( s===undefined ? jawkContext.$0 : s ); },
	length: function(x) { return x===undefined ? jawkContext.$0.length : x.length; }
});

var begin, end,
	rules = [];

var lineRegex = /^(.*?)\s*(\{.*?\})?\s*(#.*)?$/;

var programLineNumber = 0;
program.split('\n').forEach( function(line) {
	programLineNumber++;
	var m = line.match( lineRegex );
	if( !m ) return;
	// note that rules can consist only of a pattern (with no action; the action defaults to printing the whole input line)
	if( m[2]===undefined ) m[2] = 'print($0)';
	// construct the rule; note that we remove the brackets from the action
	var rule = { line: line, lineNumber: programLineNumber, pattern: m[1], action: m[2].replace(/^\{(.*)\}$/,'$1').trim(), comment: m[3] };
	if( rule.pattern.trim() === 'BEGIN' ) {
		begin = rule;
	} else if( rule.pattern.trim() === 'END' ) {
		end = rule;
	} else {
		// the rule may already have slashes around it, so we remove those
		rule.regex = new RegExp( rule.pattern.replace(/^\/?(.*?)\/?$/,'$1') );
		rules.push( rule );
	}
});

function executeAction( rule, context ) {
	try {
		vm.runInContext( rule.action, context );
	} catch( ex ) {
		console.log( 'invalid jawk rule:' );
		console.log( rule.lineNumber + ': ' + rule.line );
		if( opts.verbose ) console.log( ex );
		process.exit( 1 );
	}
}

// taken from http://stackoverflow.com/questions/281264/remove-empty-elements-from-an-array-in-javascript
Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

if( begin ) executeAction( begin, jawkContext );

readlines( inputFname, 'utf8', function(line) {
	jawkContext.NR++;
	for( var i=0; i<rules.length; i++ ) {
		if( line.match( rules[i].regex ) ) {
			jawkContext.$0 = line;
			// build record fields
			var fields = line.split( new RegExp( jawkContext.RS ) ).clean('');
			jawkContext.NR = fields.length;
			var j;
			for( j=0; j<fields.length; j++ ) jawkContext['$'+(j+1)] = fields[j];
			for( j=fields.length; j<1000; j++ ) jawkContext['$'+(j+1)] = '';
			executeAction( rules[i], jawkContext );
			continue;		// once we've found a matching rule, we're done; move to the next input line
		}
	}
});

if( end ) executeAction( end, jawkContext );
