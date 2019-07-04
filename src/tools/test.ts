import { makeDef, ToolInst, Input, Output, PassthroughTool } from '@/tools';

class ConstantTool extends PassthroughTool {
	// Literally just the passthrough interface
}

class AddTool extends ToolInst {
	private fst = this.makeNumberInput('fst', 'First addend');
	private snd = this.makeNumberInput('snd', 'Second addend');
	private sum = this.makeNumberOutput('sum', 'Sum of fst and snd');

	async runImpl(): Promise<void> {
		this.sum.val = this.fst.val + this.snd.val;
	}
}

class FormTestTool extends ToolInst {
	readonly inputs: Input[] = [
		{ io: 'input', tool: this, name: 'string', description: "String input", type: 'string', val: 'string', connection: undefined, watch: false },
		// { io: 'input', tool: this, name: 'text', description: "Text input", type: 'text', val: 'text', connection: undefined, watch: false },
		{ io: 'input', tool: this, name: 'number', description: "Number input", type: 'number', val: 10, min: 5, max: 15, connection: undefined, watch: false },
		{ io: 'input', tool: this, name: 'boolean', description: "Bool input", type: 'boolean', val: true, connection: undefined, watch: false },
		{ io: 'input', tool: this, name: 'enum', description: "Enum input", type: 'enum', options: ['foo', 'bar', 'baz'], val: 'bar', connection: undefined, watch: false },
	];
	readonly outputs: Output[] = [
		{ io: 'output', tool: this, name: 'string', description: "String input", type: 'string', val: 'string', watch: false },
		// { io: 'output', tool: this, name: 'text', description: "Text input", type: 'text', val: 'text', watch: false },
		{ io: 'output', tool: this, name: 'number', description: "Number input", type: 'number', val: 10, watch: false },
		{ io: 'output', tool: this, name: 'boolean', description: "Bool input", type: 'boolean', val: true, watch: false },
		{ io: 'output', tool: this, name: 'enum', description: "Enum input", type: 'enum', options: ['foo', 'bar', 'baz'], val: 'bar', watch: false },
	];

	async runImpl() {
		if(this.inputs[0].val === 'break') {
			throw new Error("Intentional failure");
		}
	}
}

class SleepTool extends PassthroughTool {
	private secs = this.makeNumberInput('secs', 'Seconds to sleep', 3);

	runImpl(): Promise<void> {
		return new Promise(resolve => setTimeout(async () => {
			await super.runImpl();
			resolve();
		}, this.secs.val * 1000));
	}
}

class LipsumTool extends ToolInst {
	private out = this.makeStringOutput('out', 'Output', "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec porta augue, at vestibulum mauris. Curabitur dapibus auctor eros, sed auctor justo suscipit eget. Pellentesque tellus dolor, vehicula ut urna ut, viverra ultrices lectus. Praesent convallis diam quis augue consequat, eu volutpat justo posuere. Donec eu ligula arcu. Morbi in neque in nulla placerat rutrum. Vestibulum eu mauris vel tortor finibus molestie quis quis dolor. Donec bibendum, tellus eget aliquet posuere, diam diam egestas augue, vel vehicula mauris magna nec nisl. Aenean ipsum ex, interdum eget risus nec, commodo dictum nisl. Quisque maximus, metus quis blandit pulvinar, massa nisi pretium libero, sed gravida turpis ligula non arcu. Ut fringilla tempus elementum. Donec sed dapibus nisl. Phasellus maximus, magna tincidunt efficitur sollicitudin, lorem odio aliquet tellus, in elementum tortor lectus ac nisi. Integer id libero fringilla, vestibulum sem et, ultricies augue. Pellentesque lacinia non neque non consequat.");

	async runImpl() {}
}

export default [
	makeDef(ConstantTool, 'Constant', 'Emit/passthrough a constant'),
	makeDef(AddTool, 'Add', 'Add two numbers'),
	makeDef(FormTestTool, 'Form test', 'Form test tool'),
	makeDef(SleepTool, 'Sleep', 'Sleep for set amount of time'),
	makeDef(LipsumTool, 'Lipsum', 'Emit static lorem ipsum text'),
];
