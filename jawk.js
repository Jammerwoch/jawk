#!/usr/bin/env node

var fs = require('fs'),
	vm = require('vm'),
	readlines = require('./lib/readlines').readlines;

var opts = require('nomnom')
	.option( 'file', {
		abbr: 'f',
		flag: false,
		help: 'Script file'
	})
	.option( 'verbose', {
		abbr: 'v',
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
	inputFname = opts[0];
} else {
	program = opts[0].replace(/\r/g,'');
	// TODO: handle case of console input
	inputFname = opts[1];
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

if( begin ) executeAction( begin, jawkContext );

readlines( inputFname, 'utf8', function(line) {
	jawkContext.NR++;
	for( var i=0; i<rules.length; i++ ) {
		if( line.match( rules[i].regex ) ) {
			jawkContext.$0 = line;
			// build record fields
			var fields = line.split( new RegExp( jawkContext.RS ) );
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
