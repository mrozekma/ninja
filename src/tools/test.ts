import { makeDef, ToolInst, Input, Output } from '@/tools';

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

	async runImpl() {
		if(this.inputs[0].val === 'break') {
			throw new Error("Intentional failure");
		}
	}
}

class SleepTool extends ToolInst {
	//TODO Generics so inp.type could match out.type? Doubt this comes up in real tools
	private inp: Input = {
		tool: this,
		name: 'inp',
		description: 'Input',
		type: 'number',
		val: 0,
		connection: undefined,
	};
	private secs: Input = {
		tool: this,
		name: 'secs',
		description: 'Seconds to sleep',
		type: 'number',
		val: 3,
		connection: undefined,
	};
	private out: Output = {
		tool: this,
		name: 'out',
		description: 'Output',
		type: 'number',
		val: 0,
	};

	readonly inputs: Input[] = [ this.inp, this.secs ];
	readonly outputs: Output[] = [ this.out ];

	runImpl(): Promise<void> {
		return new Promise(resolve => setTimeout(() => {
			this.out.val = this.inp.val;
			resolve();
		}, this.secs.val as number * 1000));
	}
}

export default [
	makeDef(AddTool, 'Add', 'Add two numbers'),
	makeDef(FormTestTool, 'Form test', 'Form test tool'),
	makeDef(SleepTool, 'Sleep', 'Sleep for set amount of time'),
];
