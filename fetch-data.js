var VERSION = '9.0.0';

var http = require('http');
var fs = require('fs');

var options = {
	hostname: 'www.unicode.org',
	port: 80,
	path: `/Public/${VERSION}/ucd/UnicodeData.txt`,
	method: 'GET'
};

var req = http.request(options, (res) => {
	var dest = fs.createWriteStream('./UnicodeData.txt');

	console.log(`STATUS: ${res.statusCode}`);
	console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
	res.pipe(dest);
});

req.on('error', (e) => {
	console.log(`problem with request: ${e.message}`);
});

// write data to request body
req.end();
