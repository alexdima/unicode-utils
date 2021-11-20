var fs = require('fs');
var regexpu = require('regexpu');

var data = fs.readFileSync('./unicode/UnicodeData.txt').toString('utf8');
var entries = data.split('\n');

var rtlCodes = [], rtlCodesLength = 0;
var BREAK_SIGNAL = -1;

function toUnicodeCode(n) {
	return n.toString(16).toUpperCase();
}

var prevWasRTL = false;
for (var i = 0, len = entries.length; i < len; i++) {
	var entry = entries[i];
	var props = entry.split(';');

	var code = props[0];
	var dir = props[4];

	if (dir === 'R' || dir === 'AL') {
		rtlCodes[rtlCodesLength++] = parseInt(code, 16);
		prevWasRTL = true;
	} else if (prevWasRTL) {
		prevWasRTL = false;
		rtlCodes[rtlCodesLength++] = BREAK_SIGNAL;
	}
}
fs.writeFileSync('generated/rtl-codes.txt', rtlCodes.filter(code => code !== BREAK_SIGNAL).map(toUnicodeCode).join('\n'));

var rtlCodeRanges = [], rtlCodeRangesLength = 0;

var startCode = rtlCodes[0];
var prevCode = rtlCodes[0];
for (var i = 1; i < rtlCodesLength; i++) {
	var code = rtlCodes[i];
	if (code === BREAK_SIGNAL) {
		continue;
	}
	if (prevCode + 1 !== code) {
		rtlCodeRanges[rtlCodeRangesLength++] = {
			from: startCode,
			to: prevCode
		};
		startCode = code;
	}
	prevCode = code;
}
rtlCodeRanges[rtlCodeRangesLength++] = {
	from: startCode,
	to: prevCode
};

fs.writeFileSync('generated/rtl-code-ranges.txt', rtlCodeRanges.map(function(entry) {
	var from = toUnicodeCode(entry.from);
	var to = toUnicodeCode(entry.to);
	if (from === to) {
		return from;
	}
	return from + '-' + to;
}).join('\n'));

var fuzzy = [], fuzzyLength = 0, breakSignal = false;
fuzzy[fuzzyLength++] = {
	from: rtlCodes[0],
	to: rtlCodes[0]
};
for (var i = 1; i < rtlCodesLength; i++) {
	var code = rtlCodes[i];

	if (code === BREAK_SIGNAL) {
		breakSignal = true;
		continue;
	}

	if (breakSignal) {
		fuzzy[fuzzyLength++] = {
			from: code,
			to: code
		};
	} else {
		fuzzy[fuzzyLength - 1].to = code;
	}

	breakSignal = false;
}

fs.writeFileSync('generated/rtl-code-ranges-fuzzy.txt', fuzzy.map(function(entry) {
	var from = toUnicodeCode(entry.from);
	var to = toUnicodeCode(entry.to);
	if (from === to) {
		return from;
	}
	return from + '-' + to;
}).join('\n'));

var isRTLFuzzy = fuzzy.map(function(entry) {
	var from = '\\u{'+toUnicodeCode(entry.from)+'}';
	var to = '\\u{'+toUnicodeCode(entry.to)+'}';
	if (from === to) {
		return from;
	}
	return from + '-' + to;
}).join('');

var regex = '[' + isRTLFuzzy + ']';

console.log('UNICODE CODE-POINTS RANGES:');
console.log(regex);

var r = regexpu.rewritePattern(regex, 'u');
console.log('------');
console.log(r);
console.log('------');

fs.writeFileSync('generated/rtl-test.ts', `
/**
 * Generated using https://github.com/alexdima/unicode-utils/blob/main/rtl-test.js
 */
const CONTAINS_RTL = /${r}/;

`);
