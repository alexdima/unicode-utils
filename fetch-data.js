
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

fetchFile(`/Public/13.0.0/ucd/UnicodeData-13.0.0d6.txt`, './UnicodeData.txt');

fetchFile(`/Public/emoji/12.1/emoji-test.txt`, './emoji-test.txt');
