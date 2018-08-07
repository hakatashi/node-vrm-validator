const {promisify} = require('util');
const fs = require('fs');
const assert = require('assert');

const binary = require('binary');
const validator = require('gltf-validator');
const Ajv = require('ajv');

const vrmSchema = require('./vrm.schema.json');

(async () => {
	if (process.argv.length !== 3) {
		console.error('Usage: node index.js <filename>');
		process.exit();
	}

	const data = await promisify(fs.readFile)(process.argv[2]);

	// validate as gltf
	await validator.validateBytes(data);

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

			const ajv = new Ajv({allErrors: true});
			const isValid = ajv.validate(vrmSchema, data.extensions.VRM);

			if (!isValid) {
				throw new Error(ajv.errors.map(({message}) => message).join('\n'));
			}

			console.log('VRM Extension Data:', data.extensions);

			return;
		}

		// Binary
		if (chunkType === 0x004E4942) {
			return;
		}

		assert(false, 'Unknown chunk type');
	});
})();
