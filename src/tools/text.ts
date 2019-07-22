import { makeDef, ToolInst, Input, Output, ReversibleTool, ToolDef } from '@/tools';

class StringEncodeDecodeTool extends ReversibleTool {
	private inp: Input = this.makeStringInput('str', 'String');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encode', 'Decode' ]);
	private encoding = this.makeEnumInput<BufferEncoding>('fmt', 'Encoding', 'utf8', [ "ascii", "utf8", "utf-8", "utf16le", "ucs2", "ucs-2", /* "base64", */ "latin1", "binary", "hex" ]);
	private out: Output = this.makeBytesOutput('enc', 'Encoded');

	constructor(def: ToolDef<StringEncodeDecodeTool>, name: string) {
		super(def, name);
		this.registerFields(this.dir, this.inp, this.out);
	}

	async runForward() {
		this.out.val = Buffer.from(this.inp.val as string, this.encoding.val);
	}

	async runBackward() {
		this.out.val = (this.inp.val as Buffer).toString(this.encoding.val);
	}
}

class TextSplitTool extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private split = this.makeStringInput('on', 'Split');
	private out = this.makeStringArrayOutput('out', 'Parts');

	async runImpl() {
		this.out.val = this.inp.val.split(this.split.val);
	}
}

class RegexMatchTool extends ToolInst {
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

class TextArrayIndexTool extends ToolInst {
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

class Base64Tool extends ReversibleTool {
	private inp: Input = this.makeBytesInput('data', 'Data');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encode', 'Decode' ]);
	private out: Output = this.makeStringOutput('enc', 'Encoded');

	constructor(def: ToolDef<Base64Tool>, name: string) {
		super(def, name);
		this.registerFields(this.dir, this.inp, this.out);
	}

	async runForward() {
		this.out.val = (this.inp.val as Buffer).toString('base64');
	}

	async runBackward() {
		this.out.val = Buffer.from(this.inp.val as string, 'base64');
	}
}

export class JSONDisplayTool extends ToolInst {
	private str = this.makeStringInput('str', 'JSON string');
	get json() { return this.str.val; }
	async runImpl() {}
}

export default [
	makeDef(StringEncodeDecodeTool, 'Encode/Decode', 'String encode/decode'),
	makeDef(TextSplitTool, 'Split', 'Split text'),
	makeDef(RegexMatchTool, 'Regex', 'Regular expression match'),
	makeDef(TextArrayIndexTool, 'Index', 'Index into an array'),
	makeDef(Base64Tool, 'Base64', 'Base64 encoder/decoder'),
	makeDef(JSONDisplayTool, 'JSON display', 'JSON display', undefined, () => import('@/tools/json-viewer.vue')),
];
