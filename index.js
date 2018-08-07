const fs = require('fs');
const binary = require('binary');
const assert = require('assert');

if (process.argv.length !== 3) {
	console.error('Usage: node index.js <filename>');
	process.exit();
}

const data = fs.readFileSync(process.argv[2]);

const parser = binary.parse(data);

parser.word32lu('magic');
parser.word32lu('version');
parser.word32lu('length');

assert(parser.vars.magic === 0x46546C67);
assert(parser.vars.version === 2);

parser.loop(function (end) {
	this.word32lu('chunkLength');

	if (this.vars.chunkLength === null) {
		end();
		return;
	}

	this.word32lu('chunkType');
	this.buffer('chunkData', this.vars.chunkLength);

	const {chunkLength, chunkType, chunkData} = this.vars;

	// JSON
	if (chunkType === 0x4E4F534A) {
		const json = chunkData.toString();
		const data = JSON.parse(json);
		console.log('Extension Data:', data.extensions);
		return;
	}

	// Binary
	if (chunkType === 0x004E4942) {
		console.log('Binary Payload:', chunkData);
		return;
	}

	assert(false, 'Unknown chunk type');
});
