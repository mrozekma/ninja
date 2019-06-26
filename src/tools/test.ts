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

class LipsumTool extends ToolInst {
	private out: Output = {
		tool: this,
		name: 'out',
		description: 'Output',
		type: 'text',
		val: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec porta augue, at vestibulum mauris. Curabitur dapibus auctor eros, sed auctor justo suscipit eget. Pellentesque tellus dolor, vehicula ut urna ut, viverra ultrices lectus. Praesent convallis diam quis augue consequat, eu volutpat justo posuere. Donec eu ligula arcu. Morbi in neque in nulla placerat rutrum. Vestibulum eu mauris vel tortor finibus molestie quis quis dolor. Donec bibendum, tellus eget aliquet posuere, diam diam egestas augue, vel vehicula mauris magna nec nisl. Aenean ipsum ex, interdum eget risus nec, commodo dictum nisl. Quisque maximus, metus quis blandit pulvinar, massa nisi pretium libero, sed gravida turpis ligula non arcu. Ut fringilla tempus elementum. Donec sed dapibus nisl. Phasellus maximus, magna tincidunt efficitur sollicitudin, lorem odio aliquet tellus, in elementum tortor lectus ac nisi. Integer id libero fringilla, vestibulum sem et, ultricies augue. Pellentesque lacinia non neque non consequat.",
	};

	readonly inputs: Input[] = [];
	readonly outputs: Output[] = [ this.out ];

	async runImpl() {}
}

export default [
	makeDef(AddTool, 'Add', 'Add two numbers'),
	makeDef(FormTestTool, 'Form test', 'Form test tool'),
	makeDef(SleepTool, 'Sleep', 'Sleep for set amount of time'),
	makeDef(LipsumTool, 'Lipsum', 'Emit static lorem ipsum text'),
];
