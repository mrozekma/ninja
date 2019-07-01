import { makeDef, ToolInst, Output, StringArrayOutput, Input } from '@/tools';

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
	makeDef(TextSplit, 'Split', 'Split text'),
	makeDef(TextArrayIndex, 'Index', 'Index into an array'),
];
