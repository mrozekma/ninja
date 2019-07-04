import { makeDef, ToolInst, Input } from '@/tools';

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

export default [
	makeDef(StringEncode, 'Encode', 'String encode'),
	makeDef(StringDecode, 'Decode', 'String decode'),
	makeDef(TextSplit, 'Split', 'Split text'),
	makeDef(TextArrayIndex, 'Index', 'Index into an array'),
];
