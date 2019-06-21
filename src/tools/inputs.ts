import { ToolDef, makeDef, ToolInst, Input, Output } from '@/tools';

class AddTool extends ToolInst {
	private fst: Input = {
		tool: this,
		name: 'fst',
		description: "First operand",
		type: 'number',
		val: 0,
		connection: undefined,
	};
	private snd: Input = {
		tool: this,
		name: 'snd',
		description: "Second operand",
		type: 'number',
		val: 0,
		connection: undefined,
	}
	private sum: Output = {
		tool: this,
		name: 'sum',
		description: "Sum of fst and snd",
		type: 'number',
		val: 0,
	}

	readonly inputs: Input[] = [this.fst, this.snd];
	readonly outputs: Output[] = [this.sum];

	async runImpl(): Promise<void> {
		this.sum.val = (this.fst.val as number) + (this.snd.val as number);
		// return new Promise(resolve => setTimeout(() => {
		// 	this.sum.val = (this.fst.val as number) + (this.snd.val as number);
		// 	resolve();
		// }, 3000));
	}
}

class FormTestTool extends ToolInst {
	readonly inputs: Input[] = [
		{ tool: this, name: 'string', description: "String input", type: 'string', val: 'string', connection: undefined},
		{ tool: this, name: 'text', description: "Text input", type: 'text', val: 'text', connection: undefined},
		{ tool: this, name: 'number', description: "Number input", type: 'number', val: 10, min: 5, max: 15, connection: undefined},
		{ tool: this, name: 'boolean', description: "Bool input", type: 'boolean', val: true, connection: undefined},
		{ tool: this, name: 'enum', description: "Enum input", type: 'enum', options: ['foo', 'bar', 'baz'], val: 'bar', connection: undefined},
	];
	readonly outputs: Output[] = [
		{ tool: this, name: 'string', description: "String input", type: 'string', val: 'string' },
		{ tool: this, name: 'text', description: "Text input", type: 'text', val: 'text' },
		{ tool: this, name: 'number', description: "Number input", type: 'number', val: 10 },
		{ tool: this, name: 'boolean', description: "Bool input", type: 'boolean', val: true },
		{ tool: this, name: 'enum', description: "Enum input", type: 'enum', options: ['foo', 'bar', 'baz'], val: 'bar' },
	];

	async runImpl() {}
}

export default [
	makeDef(AddTool, 'Add', 'Add two numbers'),
	makeDef(FormTestTool, 'Form test', 'Form test tool'),
];
