const fs = require('fs');
const regexpu = require('regexpu');

const data = fs.readFileSync('./UnicodeData.txt').toString('utf8');
const entries = data.split('\n');


let wasMark = false, start = '', end = '';
let ranges = [];
for (let i = 0, len = entries.length; i < len; i++) {
	const entry = entries[i];
	const props = entry.split(';');

	const code = props[0];
	const charClass = props[2];
	const isMark = (charClass === 'Mc' || charClass === 'Me' || charClass === 'Mn');

	if (isMark) {
		if (wasMark) {
			// just extend previous range
			end = code;
		} else {
			start = code;
			end = code;
		}
	} else {
		if (wasMark) {
			ranges.push({ start, end });
		}
	}

	wasMark = isMark;
}
if (wasMark) {
	ranges.push({ start, end });
}

fs.writeFileSync('mark-code-ranges.txt', ranges.map(r => `${r.start}-${r.end}`).join('\n'));

console.log(ranges);
