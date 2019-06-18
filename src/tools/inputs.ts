import { ToolDef, makeDef, ToolInst, Input, Output } from '@/types';

class AddTool extends ToolInst {
	private fst: Input = {
		tool: this,
		name: 'fst',
		type: 'number',
		val: 0,
	};
	private snd: Input = {
		tool: this,
		name: 'snd',
		type: 'number',
		val: 0,
	}
	private sum: Output = {
		tool: this,
		name: 'sum',
		type: 'number',
		val: 0,
	}

	readonly inputs: Input[] = [this.fst, this.snd];
	readonly outputs: Output[] = [this.sum];

	setInput(inputName: string, val: string | boolean | number) {
		super.setInput(inputName, val);
		//NO Hack for testing
		this.sum.val = (this.fst.val as number) + (this.snd.val as number);
	}
}

class FormTestTool extends ToolInst {
	readonly inputs: Input[] = [
		{ tool: this, name: 'string', type: 'string', val: 'string' },
		{ tool: this, name: 'text', type: 'text', val: 'text' },
		{ tool: this, name: 'number', type: 'number', val: 10 },
		{ tool: this, name: 'boolean', type: 'boolean', val: true },
		{ tool: this, name: 'enum', type: 'enum', options: ['foo', 'bar', 'baz'], val: 'bar' },
	];
	readonly outputs: Output[] = [];
}

export default [
	makeDef(AddTool, 'Add', 'Add two numbers'),
	makeDef(FormTestTool, 'Form test', 'Form test tool'),
];
