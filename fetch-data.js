
var http = require('http');
var fs = require('fs');

function fetchFile(PATH, DEST) {

	var options = {
		hostname: 'www.unicode.org',
		port: 80,
		path: PATH,
		method: 'GET'
	};

	var req = http.request(options, (res) => {
		var dest = fs.createWriteStream(DEST);

		console.log(`STATUS: ${res.statusCode}`);
		console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.pipe(dest);
	});

	req.on('error', (e) => {
		console.log(`problem with request: ${e.message}`);
	});

	// write data to request body
	req.end();
}

fetchFile(`/Public/14.0.0/ucd/UnicodeData.txt`, './unicode/UnicodeData.txt');

fetchFile(`/Public/14.0.0/ucd/Blocks.txt`, './unicode/Blocks.txt');

fetchFile(`/Public/emoji/14.0/emoji-test.txt`, './unicode/emoji-test.txt');

fetchFile(`/Public/14.0.0/ucd/auxiliary/GraphemeBreakProperty.txt`, './unicode/GraphemeBreakProperty.txt');

fetchFile(`/Public/14.0.0/ucd/emoji/emoji-data.txt`, './unicode/emoji-data.txt');
