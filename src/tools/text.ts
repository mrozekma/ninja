import { makeDef, ToolInst, Input, Output } from '@/tools';

class StringEncode extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private encoding = this.makeEnumInput<BufferEncoding>('fmt', 'Encoding', 'utf8', [ "ascii", "utf8", "utf-8", "utf16le", "ucs2", "ucs-2", "base64", "latin1", "binary", "hex" ]);
	private out = this.makeBytesOutput('out', 'Output');

	async runImpl() {
		this.out.val = Buffer.from(this.inp.val, this.encoding.val);
	}
}

class StringDecode extends ToolInst {
	private inp = this.makeBytesInput('in', 'Input');
	private encoding = this.makeEnumInput<BufferEncoding>('fmt', 'Encoding', 'utf8', [ "ascii", "utf8", "utf-8", "utf16le", "ucs2", "ucs-2", "base64", "latin1", "binary", "hex" ]);
	private out = this.makeStringOutput('out', 'Output');

	async runImpl() {
		this.out.val = this.inp.val.toString(this.encoding.val);
	}
}

class TextSplit extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private split = this.makeStringInput('on', 'Split');
	private out = this.makeStringArrayOutput('out', 'Parts');

	async runImpl() {
		this.out.val = this.inp.val.split(this.split.val);
	}
}

class RegexMatch extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private regex = this.makeStringInput('pat', 'Regex pattern');
	//TODO Flags?
	private out = this.makeStringArrayOutput('out', 'Groups');

	async runImpl() {
		const match = this.inp.val.match(new RegExp(this.regex.val));
		if(match === null) {
			throw new Error("Pattern does not match");
		}
		this.out.val = Array.from(match).slice(1);
	}
}

class TextArrayIndex extends ToolInst {
	private inp = this.makeStringArrayInput('in', 'Input');
	private idx = this.makeNumberInput('idx', 'Index', 0, 0, 0);
	private out = this.makeStringOutput('out', 'Entry 0');

	protected onInputSet(input: Input) {
		if(input === this.inp) {
			this.idx.max = this.inp.val.length - 1;
			if(this.idx.val > this.idx.max) {
				this.setInputVal(this.idx, 0);
			}
		} else if(input === this.idx) {
			this.out.description = `Entry ${this.idx.val}`;
		}
	}

	async runImpl() {
		this.out.val = this.inp.val[this.idx.val];
	}
}

class Base64Tool extends ToolInst {
	private inp: Input = this.makeStringInput('in', '');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encode', 'Decode' ]);
	private out: Output = this.makeStringOutput('out', '');

	protected onInputSet(input: Input) {
		if(input === this.dir) {
			const dir = this.dir.val;
			const pt = dir ? this.inp : this.out, enc = dir ? this.out : this.inp;
			pt.type = 'bytes';
			pt.description = 'Plaintext';
			enc.type = 'string';
			enc.description = 'Encoded';
		}
	}

	async runImpl() {
		if(this.dir.val) {
			this.out.val = (this.inp.val as Buffer).toString('base64');
		} else {
			this.out.val = Buffer.from(this.inp.val as string, 'base64');
		}
	}
}

export default [
	makeDef(StringEncode, 'Encode', 'String encode'),
	makeDef(StringDecode, 'Decode', 'String decode'),
	makeDef(TextSplit, 'Split', 'Split text'),
	makeDef(RegexMatch, 'Regex', 'Regular expression match'),
	makeDef(TextArrayIndex, 'Index', 'Index into an array'),
	makeDef(Base64Tool, 'Base64', 'Base64 encoder/decoder'),
];
