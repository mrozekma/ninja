import { ToolDef, ToolInst, ToolInstInput } from '@/types';

class AddTool extends ToolInst {
	constructor(def: ToolDef, private fst: number = 0, private snd: number = 0) {
		super(def);
	}

	get inputs(): ToolInstInput[] {
		return [{
			name: 'fst',
			type: 'number',
			val: this.fst,
		}, {
			name: 'snd',
			type: 'number',
			val: this.snd,
		}];
	}
}

function makeDef(ctor: { new(def: ToolDef): ToolInst }, name: string, description: string, editor?: () => Promise<any>): ToolDef {
	const rtn: ToolDef = {
		name,
		description,
		gen: () => new ctor(rtn),
		editor,
	}
	return rtn;
}

// const tools: ToolDef[] = [{
// 	name: 'Add',
// 	description: 'Add two numbers',
// 	gen: () => new AddTool(this),
// }];
const tools: ToolDef[] = [
	makeDef(AddTool, 'Add', 'Add two numbers'),
];
export default tools;
