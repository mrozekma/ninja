import { Point } from './types';
import importSchema, { Tools as ImportedData } from './tools.schema';

import { Base64 } from 'js-base64';
//@ts-ignore No declaration file
import cleanDeep from 'clean-deep';
import { Validator } from 'jsonschema';

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

interface OutputCommon {
	name: string;
	description: string;
	tool: ToolInst;
}
type OutputStringText = OutputCommon & {
	type: 'string' | 'text';
	val: string;
}
type OutputBoolean = OutputCommon & {
	type: 'boolean';
	labels?: [ string, string ]; // [ enabled, disabled ]
	val: boolean;
}
type OutputNumber = OutputCommon & {
	type: 'number';
	min?: number;
	max?: number;
	val: number;
}
type OutputEnum = OutputCommon & {
	type: 'enum';
	options: string[];
	val: string;
}

export type Output<T = string | boolean | number> =
	T extends string ? OutputStringText | OutputEnum :
	T extends boolean ? OutputBoolean :
	T extends number ? OutputNumber :
	never

// An input is just like an output but with an extra field to track if it's connected to another tool's output
export type Input<T = string | boolean | number> = Output<T> & {
	connection: RemoteConnection | undefined; // This is mandatory (i.e. not "connection?: RemoteConnection") so that Vue has a chance to attach a setter
}

export interface ToolError {
	tool: ToolInst;
	input?: Input;
	error: string;
}

export function convertToString(val: string | boolean | number): string {
	switch(typeof val) {
		case 'string': return val;
		case 'boolean': return val ? 'true' : 'false';
		case 'number': return '' + val;
	}
}

export function convertToBoolean(val: string | boolean | number): boolean {
	switch(typeof val) {
		case 'string': return ['true', 'yes'].indexOf(val.toLowerCase()) >= 0;
		case 'boolean': return val;
		case 'number': return val != 0;
	}
}

export function convertToNumber(val: string | boolean | number): number {
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

export function convertToInputType(val: string | boolean | number, input: Input): string | boolean | number {
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

export enum ToolState { stale = 'stale', running = 'running', good = 'good', badInputs = 'bad-inputs', failed = 'failed', cycle = 'cycle' }

export abstract class ToolInst {
	private _name: string;
	private _loc: Point;
	private _state: ToolState;
	private _error: string | undefined;

	constructor(public readonly def: ToolDef, name: string) {
		this._name = name;
		this._loc = {x: 10, y: 10};
		this._state = ToolState.stale;
		this._error = undefined;
	}

	get name(): string { return this._name; }
	set name(name: string) { this._name = name; }

	get loc(): Point { return this._loc; }
	set loc(loc: Point) { this._loc = loc; }

	get state(): ToolState { return this._state; }
	set state(state: ToolState) { this._state = state; }

	get error(): string | undefined { return this._error; }

	abstract get inputs(): Input[];
	abstract get outputs(): Output[];

	// Called when the user is manually setting a input's value
	setInput(input: Input, val: string | boolean | number) {
		if(input.tool != this) {
			throw new Error(`Input for wrong tool`);
		} else if(input.connection !== undefined) {
			throw new Error(`Input ${this.name}.${input.name} is bound to ${input.connection.output.tool.name}.${input.connection.output.name}`);
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
	}

	async run(): Promise<void> {
		const badInputs = this.inputs.filter(input => input.connection && input.connection.error !== undefined);
		if(badInputs.length > 0) {
			this.state = ToolState.badInputs;
			this._error = `Unresolved ${(badInputs.length == 1) ? 'input' : 'inputs'}: ${badInputs.map(input => input.name).join(', ')}`;
			return;
		}
		this.state = ToolState.running;
		try {
			await this.runImpl();
			this.state = ToolState.good;
		} catch(e) {
			this.state = ToolState.failed;
			this._error = e.message;
		}
	}

	abstract async runImpl(): Promise<void>;

	serialize(): object {
		return {
			type: this.def.name,
			name: this.name,
			loc: this.loc,
			inputs: this.inputs.reduce<{ [K: string]: string | boolean | number }>((map, input) => {
				if(input.connection === undefined) {
					map[input.name] = input.val;
				}
				return map;
			}, {}),
			connections: this.inputs.reduce<{ [K: string]: [ string, string ] }>((map, input) => {
				if(input.connection !== undefined) {
					map[input.name] = [ input.connection.output.tool.name, input.connection.output.name ];
				}
				return map;
			}, {}),
		};
	}
}

class SetWithChangedFlag<T> extends Set<T> {
	private _changed = false;

	get changed() { return this._changed; }
	clearFlag() { this._changed = false; }

	add(val: T): this {
		if(!this.has(val)) {
			super.add(val);
			this._changed = true;
		}
		return this;
	}

	delete(val: T): boolean {
		if(super.delete(val)) {
			this._changed = true;
			return true;
		} else {
			return false;
		}
	}

	clear() {
		const size = this.size;
		super.clear();
		if(size > 0) {
			this._changed = true;
		}
	}
}

class MapWithDefault<K, V> extends Map<K, V> {
	constructor(private makeDefaultFn: () => V) {
		super();
	}

	get(key: K): V {
		let rtn = super.get(key);
		if(rtn === undefined) {
			rtn = this.makeDefaultFn();
			this.set(key, rtn);
		}
		return rtn;
	}
}

export class ToolManager {
	constructor(private _tools: ToolInst[] = []) {}

	get tools(): Readonly<ToolInst[]> {
		return this._tools;
	}

	set tools(tools: Readonly<ToolInst[]>) {
		this._tools.splice(0, this._tools.length, ...tools);
		this.updateData();
	}

	swapToolList(tools: ToolInst[]): ToolInst[] {
		const old = this._tools;
		this._tools = tools;
		this.updateData();
		return old;
	}

	addTool(def: ToolDef): ToolInst {
		// Find a free name based on the tool name
		const names = new Set(this.tools.map(tool => tool.name));
		const name: string = (() => {
			if(!names.has(def.name)) {
				return def.name;
			}
			for(let i = 2; ; i++) {
				const name = `${def.name}-${i}`;
				if(!names.has(name)) {
					return name;
				}
			}
		})();
		const tool = def.gen(name);
		this._tools.push(tool);
		this.updateData(tool);
		return tool;
	}

	removeTool(tool: ToolInst) {
		let idx: number | undefined = undefined;
		for(const [seekIdx, seek] of this.tools.entries()) {
			if(seek === tool) {
				idx = seekIdx;
				continue;
			}
			for(const input of seek.inputs) {
				if(input.connection && input.connection.output.tool == tool) {
					input.connection = undefined;
				}
			}
		}
		if(idx === undefined) {
			throw new Error(`Unrecognized tool: ${tool.name}`);
		}
		this._tools.splice(idx, 1);
	}

	connect(input: Input, output: Output) {
		input.connection = {
			output,
			error: undefined,
			upToDate: false,
		};
		this.setInputIndirect(input);
		this.updateData(input);
	}

	disconnect(input: Input) {
		if(input.connection === undefined) {
			throw new Error(`Tried to disconnect independent input ${input.tool.name}.${input.name}`);
		}
		const upToDate = input.connection.upToDate;
		input.connection = undefined;
		// It's unlikely that a disconnection requires an update, but it might be fixing a cycle
		if(!upToDate) {
			this.updateData(input);
		}
	}

	setInput(input: Input, val: string | boolean | number) {
		input.tool.setInput(input, val);
		this.updateData(input);
	}

	//TODO It's weird that setInput delegates to the input but setInputIndirect mutates input.val itself
	setInputIndirect(input: Input) {
		if(input.connection === undefined) {
			throw new Error(`Input ${input.tool.name}.${input.name} is unbound`);
		}
		const output = input.connection.output;
		try {
			input.val = convertToInputType(output.val, input);
			input.connection!.upToDate = true;
		} catch(e) {
			input.connection!.error = `Unable to convert ${output.type} ${output.tool.name}.${output.name} to ${input.type} ${input.tool.name}.${input.name}: ${e.message}`;
		}
	}

	*iterErrors(): Iterable<ToolError> {
		for(const tool of this.tools) {
			switch(tool.state) {
				case ToolState.good:
				case ToolState.running:
				case ToolState.stale:
					break;
				case ToolState.cycle:
					yield { tool, error: "Part of a circular dependency" };
					break;
				case ToolState.failed:
					yield { tool, error: tool.error || "Unspecified run failure" };
					break;
				case ToolState.badInputs:
					for(const input of tool.inputs) {
						if(input.connection && input.connection.error) {
							yield { tool, input, error: input.connection.error };
						}
					}
					break;
			}
		}
	}

	private async updateSetRecursively<T>(set: SetWithChangedFlag<T>, updateFn: (set: Set<T>) => void | Promise<void>) {
		do {
			set.clearFlag();
			await updateFn(set);
		} while(set.changed);
	}

	private updateId = 0;
	//TODO It would be nice for this to get called automatically instead of by every spot that updates an input. Investigate RxJS or similar libraries
	//TODO Remove debug output
	async updateData(change?: Input | ToolInst) {
		const myId = ++this.updateId;
		console.log('Update data', myId, change);

		// Find every tool affected by this change
		const outOfDate = new SetWithChangedFlag<ToolInst>((() => {
			if(change === undefined) {
				return this.tools;
			} else if((change as Input).tool) {
				return [(change as Input).tool];
			} else {
				return [change as ToolInst];
			}
		})());
		for(const tool of outOfDate) {
			tool.state = ToolState.stale;
		}
		try {
			const connections = new MapWithDefault<Output, Set<Input>>(() => new Set<Input>());
			await this.updateSetRecursively(outOfDate, set => {
				for(const tool of this.tools) {
					for(const input of tool.inputs) {
						if(myId != this.updateId) {
							throw 'superceded';
						}
						if(input.connection) {
							console.log(`${input.connection.output.name} -> ${input.name}`);
							connections.get(input.connection.output).add(input);
							if(set.has(input.connection.output.tool)) {
								input.connection.upToDate = false;
								input.connection.error = undefined;
								set.add(tool);
							}
						}
					}
				}
			});

			console.log(`Update ${myId}`, outOfDate, connections);

			// Recompute tools
			//TODO Not positive this is guaranteed to resolve in certain cycle conditions, but can't come up with any to prove it
			await this.updateSetRecursively(outOfDate, async (set) => {
				console.log('Running. Remaining:', [...set].map(x => x.name));
				const promises: Promise<void>[] = [];
				for(const tool of set) {
					if(myId != this.updateId) {
						throw 'superceded';
					}
					if(tool.inputs.every(input => input.connection === undefined || input.connection.upToDate || input.connection.error)) {
						set.delete(tool);
						promises.push(tool.run().then(() => {
							console.log(`  Finished with ${tool.name}`);
							for(const output of tool.outputs) {
								console.log(`    Setting ${output.name}`);
								for(const input of connections.get(output)) {
									console.log(`      Connected to ${input.name}`);
									this.setInputIndirect(input);
									if(input.connection!.error !== undefined) {
										input.tool.state = ToolState.failed;
									}
									set.add(input.tool);
								}
							}
						}));
					}
				}
				await Promise.all(promises);
			});
		} catch(e) {
			if(e === 'superceded') {
				console.log(`Update ${myId} superceded`);
				return;
			}
			throw e;
		}

		console.log('Done. Remaining:', outOfDate.size);

		for(const tool of outOfDate) {
			tool.state = ToolState.cycle;
		}
	}

	serialize(fmt: 'compact' | 'friendly' | 'base64'): string {
		const obj = {
			version: 1,
			tools: this.tools.map(tool => tool.serialize()),
		};
		switch(fmt) {
			case 'compact': return JSON.stringify(cleanDeep(obj));
			case 'friendly': return JSON.stringify(obj, null, '\t');
			case 'base64': return Base64.encodeURI(JSON.stringify(obj));
		}
	}

	// availableDefs is passed in here because importing toolGroups causes a circular dependency I can't easily resolve
	deserialize(data: string, availableDefs: ToolDef[]) {
		if(!data.startsWith('{')) {
			data = Base64.decode(data);
		}
		const obj: ImportedData = JSON.parse(data);
		new Validator().validate(obj, importSchema, { throwError: true });
		console.log('Importing', obj);

		// Instantiate all the tools and set their locations and fixed inputs
		const insts = new Map<String, ToolInst>();
		for(const tool of obj.tools) {
			const def = availableDefs.find(def => def.name == tool.type);
			if(def === undefined) {
				throw new Error(`Unknown tool type: ${tool.type}`);
			}
			const inst = def.gen(tool.name);
			insts.set(tool.name, inst);
			inst.loc = tool.loc;
			for(const [ name, val ] of Object.entries(tool.inputs || {})) {
				const input = inst.inputs.find(input => input.name == name);
				if(input === undefined) {
					throw new Error(`Unknown input: ${tool.name}.${name}`);
				}
				inst.setInput(input, val);
			}
		}

		// Now that all tools are instantiated, go back and wire connections
		for(const tool of obj.tools) {
			if(tool.connections) {
				const inst = insts.get(tool.name)!;
				for(const [ inputName, [ outputToolName, outputName ]] of Object.entries(tool.connections)) {
					const input = inst.inputs.find(input => input.name == inputName);
					if(input === undefined) {
						throw new Error(`Unknown input: ${tool.name}.${inputName}`);
					}
					const outputTool = insts.get(outputToolName);
					if(outputTool === undefined) {
						throw new Error(`Unknown output tool connected to ${tool.name}.${inputName}: ${outputToolName}`);
					}
					const output = outputTool.outputs.find(output => output.name == outputName);
					if(output === undefined) {
						throw new Error(`Unknown output: ${outputToolName}.${outputName}`);
					}
					input.connection = {
						output,
						error: undefined,
						upToDate: false,
					};
				}
			}
		}

		// Success. Replace the existing tools with the loaded set
		this.tools = Array.from(insts.values());
	}
}
