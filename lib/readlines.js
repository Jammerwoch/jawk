var fs = require('fs');

exports.readlines = function( inputFname, inputEncoding, processLine ) {

	try {
		var fd = fs.openSync( inputFname, 'r' );

		var bufSize = 4096,
			buf = new Buffer( bufSize ),
			bufStr,
			remainder = '',
			newlineIdx,
			bytesRead = 0;

		do {
			bytesRead = fs.readSync( fd, buf, 0, bufSize );
			// get a string representation of the buffer, and remove any pesky CRs (lines in Windows files end in CRLF, not just LF)
			bufStr = buf.toString(inputEncoding,0,bytesRead).replace(/\r/g,'');
			// we split on LFs; if there are any full lines contained within the buffer, they will be processed
			var lines = bufStr.split('\n');
			if( lines.length > 1 ) {
				// process first line (which starts with the last buffer's remainder)
				processLine( remainder + lines[0] );
				remainder = '';
				// process everything but the last line (which will become the remainder)...
				for( var i=1; i<lines.length-1; i++ ) {
					// process line
					processLine( lines[i] );
				}
			}
			// the last line becomes the remainder
			remainder += lines[lines.length-1];
		} while( bytesRead > 0 );
		// if the line isn't terminated with a line ending, there will be a remainder
		if( remainder.length ) processLine( remainder );

	} finally {
		if( fd ) fs.close( fd );
	}

}

