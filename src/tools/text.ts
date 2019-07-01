import { makeDef, ToolInst, Input, Output, ToolDef, StringOutput, StringArrayOutput } from '@/tools';

class TextSplit extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private split = this.makeStringInput('on', 'Split');

	private out: StringArrayOutput = {
		tool: this,
		io: 'output',
		name: 'out',
		description: 'Parts',
		type: 'string[]',
		val: [],
		watch: false,
	}

	outputs: Output[] = [this.out];

	async runImpl() {
		this.out.val = this.inp.val.split(this.split.val);
	}
}

export default [
	makeDef(TextSplit, 'Split', 'Split text'),
];
