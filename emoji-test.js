var fs = require('fs');
var regexpu = require('regexpu');

// Generate a map of all codes that appear in emojis
var emojiCodesMap = {};
(function () {
	var emojiTestData = fs.readFileSync('./unicode/emoji-test.txt').toString('utf8');
	var emojiTestEntries = emojiTestData.split('\n');

	for (var i = 0, len = emojiTestEntries.length; i < len; i++) {
		var entry = emojiTestEntries[i];

		// strip comments
		entry = entry.replace(/#.*/, '');
		entry = entry.trim();

		// strip status
		entry = entry.replace(/;.*/, '');
		entry = entry.trim();

		if (entry.indexOf(' ') > 0) {
			// ignore combined
			continue;
		}

		if (entry.length === 0) {
			// ignore empty lines
			continue;
		}

		emojiCodesMap[parseInt(entry, 16)] = true;
	}
})();

const getCodeBlock = (function() {
	function parseLine(line) {
		line = line.replace(/#.*/, '');
		line = line.trim();
		if (line.length === 0) {
			return null;
		}

		let parts = line.split(';').map(s => s.trim());

		if (/\.\./.test(parts[0])) {
			const range = parts[0].split('..');
			return { from: parseInt(range[0], 16), to: parseInt(range[1], 16), type: parts[1] };
		}

		return { from: parseInt(parts[0], 16), to: parseInt(parts[0], 16), type: parts[1] };
	}

	function parseFile(filename) {
		const fileContents = fs.readFileSync(filename).toString('utf8');
		const lines = fileContents.split('\n');
		const result = [];
		for (let i = 0; i < lines.length; i++) {
			let line = parseLine(lines[i]);
			if (line) {
				result.push(line);
			}
		}
		return result;
	}

	const items = parseFile('./unicode/Blocks.txt');
	return function getCodeBlock(codePoint) {
		for (const item of items) {
			if (codePoint >= item.from && codePoint <= item.to) {
				return item.type;
			}
		}
	}
})();

function toUnicodeCode(n) {
	return n.toString(16).toUpperCase();
}

// Read entire UnicodeData.txt and find contiguous ranges of emojis
var emojiCodes = [];
var BREAK_SIGNAL = -1;
(function () {
	var data = fs.readFileSync('./unicode/UnicodeData.txt').toString('utf8');
	var entries = data.split('\n');

	var prevWasEmoji = false;
	for (var i = 0, len = entries.length; i < len; i++) {
		var entry = entries[i];
		var props = entry.split(';');

		var code = parseInt(props[0], 16);
		var _isEmoji = isEmoji(code, emojiCodesMap[code]);

		if (_isEmoji) {
			emojiCodes.push(code);
			prevWasEmoji = true;
		} else if (prevWasEmoji) {
			prevWasEmoji = false;
			emojiCodes.push(BREAK_SIGNAL);
		}
	}
	fs.writeFileSync('generated/emoji-codes.txt', emojiCodes.filter(code => code !== BREAK_SIGNAL).map(toUnicodeCode).join('\n'));
})();

var emojiCodeRanges = [];
(function () {
	var startCode = emojiCodes[0];
	var prevCode = emojiCodes[0];
	for (var i = 1; i < emojiCodes.length; i++) {
		var code = emojiCodes[i];
		if (code === BREAK_SIGNAL) {
			continue;
		}
		if (prevCode + 1 !== code) {
			emojiCodeRanges.push({
				from: startCode,
				to: prevCode
			});
			startCode = code;
		}
		prevCode = code;
	}
	emojiCodeRanges.push({
		from: startCode,
		to: prevCode
	});
})();

fs.writeFileSync('generated/emoji-code-ranges.txt', emojiCodeRanges.map(function (entry) {
	var from = toUnicodeCode(entry.from);
	var to = toUnicodeCode(entry.to);
	if (from === to) {
		return from;
	}
	return from + '-' + to;
}).join('\n'));


var fuzzy = [], fuzzyLength = 0, breakSignal = false;
fuzzy[fuzzyLength++] = {
	from: emojiCodes[0],
	to: emojiCodes[0]
};
for (var i = 1; i < emojiCodes.length; i++) {
	var code = emojiCodes[i];

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

fs.writeFileSync('generated/emoji-code-ranges-fuzzy.txt', fuzzy.map(function (entry) {
	var from = toUnicodeCode(entry.from);
	var to = toUnicodeCode(entry.to);
	if (from === to) {
		return from;
	}
	return from + '-' + to;
}).join('\n'));

var isEmojiFuzzy = fuzzy.map(function(entry) {
	var from = '\\u{'+toUnicodeCode(entry.from)+'}';
	var to = '\\u{'+toUnicodeCode(entry.to)+'}';
	if (from === to) {
		return from;
	}
	return from + '-' + to;
}).join('');

var isEmojiVeryImprecise = fuzzy.map(function(entry) {
	if (entry.from + 1 === entry.to) {
		return `(x === ${entry.from}) || (x === ${entry.to})`;
	}
	if (entry.from === entry.to) {
		return `(x === ${entry.from})`;
	}
	return `(x >= ${entry.from} && x <= ${entry.to})`;
}).join(' || ');

console.log('very imprecise test :: (x >= 0x1F1E6 && x <= 0x1F1FF) || ' + isEmojiVeryImprecise);

// Flags use two code points, but they usually start with 1F1E6 - 1F1FF
// REGIONAL INDICATOR SYMBOL LETTER A -> REGIONAL INDICATOR SYMBOL LETTER Z
isEmojiFuzzy += '\\u{1F1E6}-\\u{1F1FF}';


// TODO:
// use U+FE0F as a hint
// http://emojipedia.org/variation-selector-16/
// Variation Selector-16
// An invisible codepoint which specifies that the preceding character should be displayed with emoji presentation. Only required if the preceding character defaults to text presentation.
var regex = '[' + isEmojiFuzzy + ']';

console.log('UNICODE CODE-POINTS RANGES:');
console.log(regex);

var r = regexpu.rewritePattern(regex, 'u');
console.log('------');
console.log(r);
console.log('------');

// GOTTEN FROM ABOVE RESULT
var containsEmoji = /(?:[\u231A\u231B\u23F0\u23F3\u2600-\u27BF\u2B50\u2B55]|\uD83C[\uDDE6-\uDDFF\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F\uDE80-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD00-\uDDFF\uDE70-\uDED6])/;

// SANITY CHECK the regex
(function () {
	var emojiTestData = fs.readFileSync('./unicode/emoji-test.txt').toString('utf8');
	var emojiTestEntries = emojiTestData.split('\n');

	var MISSING = [];

	for (var i = 0, len = emojiTestEntries.length; i < len; i++) {
		var original = emojiTestEntries[i];
		var entry = emojiTestEntries[i];

		// strip comments
		entry = entry.replace(/#.*/, '');
		entry = entry.trim();

		// strip status
		entry = entry.replace(/;.*/, '');
		entry = entry.trim();

		if (entry.length === 0) {
			// ignore empty lines
			continue;
		}

		var codes = entry.split(' ').map(function(code) {
			return parseInt(code, 16);
		});

		var str = 'some ';
		for (var j = 0; j < codes.length; j++) {
			str += String.fromCodePoint(codes[j]);
		}
		str += ' text';

		if (containsEmoji.test(str)) {
			// regex captures this input
			continue;
		}

		MISSING.push(original);
	}

	fs.writeFileSync('generated/emoji-missed.txt', 'THE FOLLOWING ARE NOT CAPTURED BY THE REGEX: \n' + MISSING.join('\n'));
})();


function isEmoji(code, isInEmojiTest) {
	var block = getCodeBlock(code);

	// Exclude some codes in emoji-test.txt that don't look like emojis.

	if (block === 'Latin-1 Supplement') {
		// e.g. 00A9 © copyright
		return false;
	}
	if (block === 'General Punctuation') {
		// e.g. 203C ‼️ double exclamation mark
		return false;
	}
	if (block === 'Letterlike Symbols') {
		// e.g. 2122 ️️™️ trade mark
		return false;
	}
	if (block === 'Arrows') {
		// e.g. 2194 ↔ left-right arrow
		return false;
	}
	if (block === 'Miscellaneous Technical') {
		// U+2300 -> U+23FE
		if (code === 0x231A) { // ⌚ watch
			return true;
		}
		if (code === 0x231B) { // ⌛ hourglass
			return true;
		}
		if (code === 0x23F0) { // ⏰ alarm clock
			return true;
		}
		if (code === 0x23F3) { // ⏳ hourglass with flowing sand
			return true;
		}
		return false;
	}

	if (block === 'Enclosed Alphanumerics') {
		// e.g. 24C2 Ⓜ circled M
		return false;
	}
	if (block === 'Geometric Shapes') {
		// e.g. 25AA ▪ black small square
		return false;
	}
	if (block === 'Supplemental Arrows-B') {
		// e.g. 2934 ⤴ right arrow curving up
		return false;
	}
	if (block === 'Miscellaneous Symbols and Arrows') {
		if (code === 0x2B50) { // ⭐ white medium star
			return true;
		}
		if (code === 0x2B55) { // ⭕ heavy large circle
			return true;
		}
		return false;
	}
	if (block === 'CJK Symbols and Punctuation') {
		// e.g. 303D 〽 part alternation mark
		return false;
	}
	if (block === 'Enclosed CJK Letters and Months') {
		// e.g. 3297 ㊗ Japanese “congratulations” button
		return false;
	}
	if (block === 'Mahjong Tiles') {
		// e.g. 1F004 🀄 mahjong red dragon
		return false;
	}
	if (block === 'Playing Cards') {
		// e.g. 1F0CF 🃏 joker
		return false;
	}
	if (block === 'Enclosed Alphanumeric Supplement') {
		// e.g. 1F170 🅰 A button (blood type)
		return false;
	}
	if (block === 'Enclosed Ideographic Supplement') {
		// e.g. 1F201 🈁 Japanese “here” button
		return false;
	}

	// include some blocks that look like emojis
	if (block === 'Miscellaneous Symbols') {
		return true;
	}
	if (block === 'Dingbats') {
		return true;
	}
	if (block === 'Miscellaneous Symbols and Pictographs') {
		return true;
	}
	if (block === 'Emoticons') {
		return true;
	}
	if (block === 'Transport and Map Symbols') {
		return true;
	}
	if (block === 'Supplemental Symbols and Pictographs') {
		return true;
	}

	return isInEmojiTest;
}
