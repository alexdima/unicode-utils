const fs = require('fs');
// const regexpu = require('regexpu');

const data = fs.readFileSync('./GraphemeBreakProperty.txt').toString('utf8');
const entries = data.split('\n');

const typeToInt = {
	'Prepend': 1,
	'CR': 2,
	'LF': 3,
	'Control': 4,
	'Extend': 5,
	'Regional_Indicator': 6,
	'SpacingMark': 7,
	'L': 8,
	'V': 9,
	'T': 10,
	'LV': 11,
	'LVT': 12,
	'ZWJ': 13,
}

let tuples = [];
for (let i = 0; i < entries.length; i++) {
	let line = entries[i];
	line = line.replace(/#.*/, '');
	line = line.trim();
	if (line.length === 0) {
		continue;
	}

	let parts = line.split(';').map(s => s.trim());
	const type = typeToInt[parts[1]];

	let from;
	let to;
	if (/\.\./.test(parts[0])) {
		const range = parts[0].split('..');
		from = parseInt(range[0], 16);
		to = parseInt(range[1], 16);
	} else {
		from = to = parseInt(parts[0], 16);
	}

	tuples.push({ from, to, type });

	// console.log(from, to, type);
}

tuples.sort((t1, t2) => t1.from - t2.from);

let tuplesTree = [];
function buildTree(fromIndex, toIndex, outIndex) {
	const midIndex = ((fromIndex + toIndex) / 2) | 0;
	tuplesTree[outIndex] = tuples[midIndex];

	if (fromIndex < midIndex) {
		// left subtree
		buildTree(fromIndex, midIndex - 1, 2 * outIndex);
	}
	if (midIndex < toIndex) {
		// right subtree
		buildTree(midIndex + 1, toIndex, 2 * outIndex + 1);
	}
}
buildTree(0, tuples.length - 1, 1);

let result = [0,0,0];
tuplesTree.forEach(t => result.push(t.from, t.to, t.type));

console.log(JSON.stringify(result));
