import { ToolDef, makeDef, ToolInst, Input, Output } from '@/types';

class AddTool extends ToolInst {
	constructor(def: ToolDef, name: string, private fst: number = 0, private snd: number = 0) {
		super(def, name);
	}

	get inputs(): Input[] {
		return [{
			tool: this,
			name: 'fst',
			type: 'number',
			val: this.fst,
		}, {
			tool: this,
			name: 'snd',
			type: 'number',
			val: this.snd,
		}];
	}

	get outputs(): Output[] { return []; }
}

class FormTestTool extends ToolInst {
	constructor(def: ToolDef, name: string) {
		super(def, name);
	}

	get inputs(): Input[] {
		return [
			{ tool: this, name: 'string', type: 'string', val: 'string' },
			{ tool: this, name: 'text', type: 'text', val: 'text' },
			{ tool: this, name: 'number', type: 'number', val: 10 },
			{ tool: this, name: 'boolean', type: 'boolean', val: true },
			{ tool: this, name: 'enum', type: 'enum', options: ['foo', 'bar', 'baz'], val: 'bar' },
		];
	}

	get outputs(): Output[] { return []; }
}

// const tools: ToolDef[] = [{
// 	name: 'Add',
// 	description: 'Add two numbers',
// 	gen: () => new AddTool(this),
// }];
const tools: ToolDef[] = [
	makeDef(AddTool, 'Add', 'Add two numbers'),
	makeDef(FormTestTool, 'Form test', 'Form test tool'),
];
export default tools;
