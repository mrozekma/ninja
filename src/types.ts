export interface ToolGroup {
	name: string;
	icon: string;
	tools: ToolDef[];
}

// export type ToolDef = {
// 	name: string;
// 	description: string;
// 	form?: () => Promise<any>;
// } & ({
// 	form: undefined;
// 	inputs: {
// 		name: string;
// 		type: 'string' | 'text' | 'enum' | 'boolean';
// 	}[];
// } | {
// 	form: () => Promise<any>;
// })

export type ToolDef = {
	name: string;
	description: string;
	gen: (name: string) => ToolInst;
	editor?: () => Promise<any>;
}

export function makeDef(ctor: { new(def: ToolDef, name: string): ToolInst }, name: string, description: string, editor?: () => Promise<any>): ToolDef {
	const rtn: ToolDef = {
		name,
		description,
		gen: (name: string) => new ctor(rtn, name),
		editor,
	}
	return rtn;
}

export interface Point {
	x: number;
	y: number;
}

export function isPoint(pt: any): pt is Point {
	return pt.x !== undefined && pt.y !== undefined;
}

/*
export interface Input {
	name: string;
	connectedTo?: {
		tool: ToolInst;
		outputName: string;
	}
}

export interface Output {
	name: string;
}

export interface ToolInst {
	name: string;
	loc: Point;
	inputs: Input[];
	outputs: Output[];
	ephemeral: boolean;
}
*/

export interface RootData {
	tools: ToolInst[];
	selectedTool?: ToolInst;
}

export interface RemoteConnection {
	tool: ToolInst;
	outputName: string;
	output: Output;
	upToDate: boolean;
}

export type Output = {
	name: string;
	tool: ToolInst;
} & ({
	type: 'string' | 'text';
	val: string;
} | {
	type: 'boolean';
	val: boolean;
} | {
	type: 'number';
	min?: number;
	max?: number;
	val: number;
} | {
	type: 'enum';
	options: string[];
	val: string;
})

// An input is just like an output but with an extra field to track if it's connected to another tool's output
export type Input = Output & {
	connection?: RemoteConnection;
}

function convertToString(val: string | boolean | number): string | Error {
	return (typeof val === 'string') ? val :
	       (typeof val === 'boolean') ? (val ? 'true' : 'false') :
	       (typeof val === 'number') ? '' + val :
	       new Error('Impossible');
}

function convertToBoolean(val: string | boolean | number): boolean | Error {
	return (typeof val === 'string') ? (['true', 'yes'].indexOf(val.toLowerCase()) >= 0) :
	       (typeof val === 'boolean') ? val :
	       (typeof val === 'number') ? (val != 0) :
	       new Error('Impossible');
}

function convertToNumber(val: string | boolean | number): number | Error {
	if(typeof val === 'string') {
		const rtn = parseInt(val, 10);
		return !isNaN(rtn) ? rtn : new Error(`Not a number: ${val}`);
	}
	return (typeof val === 'boolean') ? (val ? 1 : 0) :
	       (typeof val === 'number') ? val :
	       new Error('Impossible');
}

export abstract class ToolInst {
	private _name: string = '';

	constructor(public readonly def: ToolDef, name: string) {
		this.name = name;
	}

	get name(): string {
		return this._name;
	}

	set name(name: string) {
		this._name = name;
	}

	abstract get inputs(): Input[];
	abstract get outputs(): Output[];

	// Called when the user is manually setting a input's value
	setInput(inputName: string, val: string | boolean | number) {
		const input = this.inputs.find(input => input.name == inputName);
		if(!input) {
			throw new Error(`Tool ${this.name} has no input '${inputName}'`);
		} else if(input.connection !== undefined) {
			throw new Error(`Input ${this.name}.${inputName} is bound to ${input.connection.tool.name}.${input.connection.outputName}`);
		}

		const expectedType = (input.type === 'text' || input.type === 'enum') ? 'string' : input.type;
		if(expectedType != typeof val) {
			throw new Error(`Tried to set ${this.name}.${input.name} to a ${typeof val}, but expected a ${expectedType}`);
		}
		if(input.type === 'enum' && input.options.indexOf(val as string) < 0) {
			throw new Error(`Tried to set ${this.name}.${input.name} to an invalid enum value`);
		}

		console.log(`${this.name}.${input.name} = ${val}`);
		input.val = val;
	}
}
