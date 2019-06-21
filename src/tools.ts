import { Point } from './types';

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

export interface RemoteConnection {
	output: Output;
	upToDate: boolean;
	error: string | undefined;
}

export type Output = {
	name: string;
	description: string;
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
	connection: RemoteConnection | undefined; // This is mandatory (i.e. not "connection?: RemoteConnection") so that Vue has a chance to attach a setter
}

function convertToString(val: string | boolean | number): string {
	switch(typeof val) {
		case 'string': return val;
		case 'boolean': return val ? 'true' : 'false';
		case 'number': return '' + val;
	}
}

function convertToBoolean(val: string | boolean | number): boolean {
	switch(typeof val) {
		case 'string': return ['true', 'yes'].indexOf(val.toLowerCase()) >= 0;
		case 'boolean': return val;
		case 'number': return val != 0;
	}
}

function convertToNumber(val: string | boolean | number): number {
	switch(typeof val) {
		case 'string':
			const rtn = parseInt(val, 10);
			if(isNaN(rtn)) {
				throw new Error(`Not a number: ${val}`);
			}
			return rtn;
		case 'boolean': return val ? 1 : 0;
		case 'number': return val;
	}
}

function convertToInputType(val: string | boolean | number, input: Input): string | boolean | number {
	switch(input.type) {
		case 'string':
		case 'text':
			return convertToString(val);
		case 'enum': {
			const rtn = convertToString(val);
			if(input.options.indexOf(rtn) < 0) {
				throw new Error(`Invalid enum value: ${rtn}`);
			}
			return rtn; }
		case 'boolean':
			return convertToBoolean(val);
		case 'number': {
			const rtn = convertToNumber(val);
			if(input.min && rtn < input.min) {
				throw new Error(`${rtn} < minimum ${input.min}`);
			} else if(input.max && rtn > input.max) {
				throw new Error(`${rtn} > maximum ${input.max}`);
			}
			return rtn; }
	}
}

export enum ToolState { stale, running, good, failed }

export abstract class ToolInst {
	private _name: string;
	private _loc: Point;
	private _state: ToolState;

	constructor(public readonly def: ToolDef, name: string) {
		this._name = name;
		this._loc = {x: 10, y: 10};
		this._state = ToolState.stale;
	}

	get name(): string { return this._name; }
	set name(name: string) { this._name = name; }

	get loc(): Point { return this._loc; }
	set loc(loc: Point) { this._loc = loc; }

	get state(): ToolState { return this._state; }
	set state(state: ToolState) { this._state = state; }

	abstract get inputs(): Input[];
	abstract get outputs(): Output[];

	// Called when the user is manually setting a input's value
	setInput(inputName: string, val: string | boolean | number): Input {
		const input = this.inputs.find(input => input.name == inputName);
		if(!input) {
			throw new Error(`Tool ${this.name} has no input '${inputName}'`);
		} else if(input.connection !== undefined) {
			throw new Error(`Input ${this.name}.${inputName} is bound to ${input.connection.output.tool.name}.${input.connection.output.name}`);
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
		this.state = ToolState.stale;
		return input;
	}

	//TODO
	// connectInput(inputName: string, output: Output) {
	// 	const input = this.inputs.find(input => input.name == inputName);
	// 	if(!input) {
	// 		throw new Error(`Tool ${this.name} has no input '${inputName}'`);
	// 	}
	// }

	async run(): Promise<void> {
		this.state = ToolState.running;
		try {
			await this.runImpl();
			this.state = ToolState.good;
		} catch(e) {
			this.state = ToolState.failed;
			throw e;
		}
	}

	abstract async runImpl(): Promise<void>;
}

//TODO It would be nice for this to get called automatically instead of by every spot that updates an input. Investigate RxJS or similar libraries
//TODO Only recompute tools that need it
let updateId = 0;
export async function updateData(tools: ToolInst[], change?: Input) {
	const myId = ++updateId;
	console.log(`Update data`); // triggered by change to ${change!.tool.name}.${change!.name}`);

	// Make dependency graph.
	const toolDependsOn: { [K: string]: ToolInst[] } = {};
	const outputConnectedTo: { [K: string]: Input[] } = {};
	for(const tool of tools) {
		tool.state = ToolState.stale;
		const myToolDeps: ToolInst[] = []
		toolDependsOn[tool.name] = myToolDeps;
		for(const input of tool.inputs) {
			if(input.connection) {
				myToolDeps.push(input.connection.output.tool);
				const outputFQN = `${input.connection.output.tool.name}.${input.connection.output.name}`;
				let myOutputDeps = outputConnectedTo[outputFQN];
				if(myOutputDeps === undefined) {
					myOutputDeps = outputConnectedTo[outputFQN] = [];
				}
				myOutputDeps.push(input);
				input.connection.upToDate = false;
			}
		}
	}

	// Figure out resolution order
	const updateOrder: ToolInst[][] = [];
	{
		const worklist: Set<ToolInst> = new Set(tools);
		while(worklist.size > 0) {
			const thisBlock: ToolInst[] = [];
			for(const tool of worklist) {
				if(toolDependsOn[tool.name].every(tool => !worklist.has(tool))) {
					thisBlock.push(tool);
				}
			}
			if(thisBlock.length > 0) {
				updateOrder.push(thisBlock);
				thisBlock.forEach(tool => worklist.delete(tool));
			} else {
				console.error('Data cycle', Array.from(worklist));
				for(const tool of worklist) {
					tool.state = ToolState.failed;
					for(const input of tool.inputs) {
						if(input.connection) {
							input.connection.error = 'Data cycle';
						}
					}
				}
				break;
			}
		}
	}

	for(const block of updateOrder) {
		if(myId != updateId) {
			console.log("Abandoning old updateData");
			return;
		}
		await Promise.all(block.map(tool => tool.run()));
		for(const tool of block) {
			for(const output of tool.outputs) {
				const depInputs = outputConnectedTo[`${tool.name}.${output.name}`];
				for(const input of depInputs || []) {
					try {
						input.val = convertToInputType(input.connection!.output.val, input);
					} catch(e) {
						input.connection!.error = `Unable to convert ${output.type} ${tool.name}.${output.name} to ${input.type} ${input.tool.name}.${input.name}: ${e.message}`;
						//TODO Keep going with other tool runs. Need to keep the dep graph instead of converting it to a linear run order
						throw new Error(input.connection!.error);
					}
					input.connection!.upToDate = true;
				}
			}
		}
	}
}
