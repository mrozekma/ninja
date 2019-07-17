import importSchema, { Tools as SerializedData } from './tools.schema';

import { Validator } from 'jsonschema';

export type ToolDef<T extends ToolInst = ToolInst> = {
	name: string;
	description: string;
	gen: (name: string) => T;
	editor?: () => Promise<any>;
	viewer?: () => Promise<any>;
}

export function makeDef<T extends ToolInst>(ctor: { new(def: ToolDef<T>, name: string): T }, name: string, description: string, editor?: () => Promise<any>, viewer?: () => Promise<any>): ToolDef<T> {
	const rtn: ToolDef<T> = {
		name,
		description,
		gen: (name: string) => new ctor(rtn, name),
		editor,
		viewer,
	}
	return rtn;
}

export interface RemoteConnection {
	output: Output;
	upToDate: boolean;
	error: string | undefined;
}

//TODO Add bytes type?
interface OutputMixin {
	io: 'output',
	tool: ToolInst;
	name: string;
	description: string;
	watch: boolean;
}

// An input is just like an output but with an extra field to track if it's connected to another tool's output
type InputMixin = Omit<OutputMixin, 'io'> & {
	io: 'input',
	connection: RemoteConnection | undefined; // This is mandatory (i.e. not "connection?: RemoteConnection") so that Vue has a chance to attach a setter
}

interface StringMixin {
	type: 'string';
	val: string;
}
interface StringArrayMixin {
	type: 'string[]';
	val: string[];
}
interface BooleanMixin {
	type: 'boolean';
	labels?: [ string, string ]; // [ enabled, disabled ]
	val: boolean;
}
interface BooleanArrayMixin {
	type: 'boolean[]';
	labels?: [ string, string ]; // [ enabled, disabled ]
	val: boolean[];
}
interface NumberMixin {
	type: 'number';
	min?: number;
	max?: number;
	val: number;
}
interface NumberArrayMixin {
	type: 'number[]';
	min?: number;
	max?: number;
	val: number[];
}
interface EnumMixin<T = string> {
	type: 'enum';
	options: T[];
	val: T;
}
interface EnumArrayMixin<T = string> {
	type: 'enum[]';
	options: T[];
	val: T[];
}
interface BytesMixin {
	type: 'bytes';
	val: Buffer;
}

// It should be possible to do this with generic Input<T> and Output<T> types, but having lots of problems with makeInput/Output()
export type StringInput = InputMixin & StringMixin
export type StringArrayInput = InputMixin & StringArrayMixin
export type BooleanInput = InputMixin & BooleanMixin
export type BooleanArrayInput = InputMixin & BooleanArrayMixin
export type NumberInput = InputMixin & NumberMixin
export type NumberArrayInput = InputMixin & NumberArrayMixin
export type EnumInput<T = string> = InputMixin & EnumMixin<T>
export type EnumArrayInput<T = string> = InputMixin & EnumArrayMixin<T>
export type BytesInput = InputMixin & BytesMixin
export type Input = StringInput | BooleanInput | NumberInput | EnumInput | BytesInput
                  | StringArrayInput | BooleanArrayInput | NumberArrayInput | EnumArrayInput

export type StringOutput = OutputMixin & StringMixin
export type StringArrayOutput = OutputMixin & StringArrayMixin
export type BooleanOutput = OutputMixin & BooleanMixin
export type BooleanArrayOutput = OutputMixin & BooleanArrayMixin
export type NumberOutput = OutputMixin & NumberMixin
export type NumberArrayOutput = OutputMixin & NumberArrayMixin
export type EnumOutput<T = string> = OutputMixin & EnumMixin<T>
export type EnumArrayOutput<T = string> = OutputMixin & EnumArrayMixin<T>
export type BytesOutput = OutputMixin & BytesMixin
export type Output = StringOutput | BooleanOutput | NumberOutput | EnumOutput | BytesOutput
                   | StringArrayOutput | BooleanArrayOutput | NumberArrayOutput | EnumArrayOutput

export type IOValTypes = string | boolean | number | string[] | boolean[] | number[] | Buffer

export interface ToolError {
	tool: ToolInst;
	input?: Input;
	error: string;
}

export function convertToString(val: IOValTypes): string {
	if(Array.isArray(val)) {
		val = val[0];
	}
	if(Buffer.isBuffer(val)) {
		return val.toString('utf8');
	}
	switch(typeof val) {
		case 'string': return val;
		case 'boolean': return val ? 'true' : 'false';
		case 'number': return '' + val;
	}
}

export function convertToBoolean(val: IOValTypes): boolean {
	if(Array.isArray(val)) {
		val = val[0];
	}
	if(Buffer.isBuffer(val)) {
		return val.length > 0;
	}
	switch(typeof val) {
		case 'string': return ['true', 'yes'].indexOf(val.toLowerCase()) >= 0;
		case 'boolean': return val;
		case 'number': return val != 0;
	}
}

export function convertToNumber(val: IOValTypes): number {
	if(Array.isArray(val)) {
		val = val[0];
	}
	if(Buffer.isBuffer(val)) {
		return val.readUInt8(0);
	}
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

export function convertToBytes(val: IOValTypes): Buffer {
	if(Array.isArray(val)) {
		// (string[] | number[] | boolean[]) can't be mapped, but (string | number | boolean)[] can
		const val2: (string | number | boolean)[] = val;
		const nums = val2.map(convertToNumber);
		return Buffer.from(nums);
	}
	if(Buffer.isBuffer(val)) {
		return val;
	}
	switch(typeof val) {
		case 'string': return Buffer.from(val, 'utf8');
		case 'boolean': return Buffer.from([convertToNumber(val)]);
		case 'number': return Buffer.from([val]);
	}
}

export function convertToPrimitiveInputType(val: IOValTypes, input: Input): Exclude<IOValTypes, any[] | Buffer> {
	switch(input.type) {
		case 'string':
		case 'string[]':
			return convertToString(val);
		case 'enum':
		case 'enum[]': {
			const rtn = convertToString(val);
			if(input.options.indexOf(rtn) < 0) {
				throw new Error(`Invalid enum value: ${rtn}`);
			}
			return rtn; }
		case 'boolean':
		case 'boolean[]':
			return convertToBoolean(val);
		case 'number':
		case 'number[]': {
			const rtn = convertToNumber(val);
			if(input.min && rtn < input.min) {
				throw new Error(`${rtn} < minimum ${input.min}`);
			} else if(input.max && rtn > input.max) {
				throw new Error(`${rtn} > maximum ${input.max}`);
			}
			return rtn; }
		case 'bytes':
			throw new Error("Not a primitive type");
	}
}

export function convertToInputType(val: IOValTypes, input: Input): IOValTypes {
	if(input.type == 'bytes') {
		return convertToBytes(val);
	}
	if(input.type.endsWith('[]')) { // Input is array
		if(Array.isArray(val)) {
			const val2: (string | number | boolean)[] = val;
			//@ts-ignore ...
			return val2.map(e => convertToPrimitiveInputType(e, input));
		} else {
			const conv = convertToPrimitiveInputType(val, input);
			//@ts-ignore ...
			return [conv];
		}
	} else { // Input is not array
		if(Array.isArray(val)) {
			return convertToPrimitiveInputType(val[0], input);
		} else {
			return convertToPrimitiveInputType(val, input);
		}
	}
}

export interface Point {
	x: number;
	y: number;
}

export function isPoint(pt: any): pt is Point {
	return pt.x !== undefined && pt.y !== undefined;
}

export interface Viewport {
	translation: Point,
	scale: number,
}

export enum ToolState { stale = 'stale', running = 'running', good = 'good', badInputs = 'bad-inputs', failed = 'failed', cycle = 'cycle' }

export abstract class ToolInst {
	private _name: string;
	private _loc: Point | undefined;
	private _state: ToolState;
	private _error: string | undefined;

	protected allInputs: Input[] = [];
	protected allOutputs: Output[] = [];

	constructor(public readonly def: ToolDef, name: string) {
		this._name = name;
		this._loc = {x: 10, y: 10};
		this._state = ToolState.stale;
		this._error = undefined;
	}

	get name(): string { return this._name; }
	set name(name: string) { this._name = name; }

	get loc(): Point | undefined { return this._loc; }
	set loc(loc: Point | undefined) { this._loc = loc; }

	get state(): ToolState { return this._state; }
	set state(state: ToolState) { this._state = state; }

	get stateInfo(): { type: string; text: string } | undefined {
		switch(this.state) {
			case ToolState.good: return undefined;
			case ToolState.badInputs: return { type: 'is-danger', text: "Invalid inputs prevented this tool from running." };
			case ToolState.failed: return { type: 'is-danger', text: `This tool failed to run: ${this.error}.` };
			case ToolState.cycle: return { type: 'is-warning', text: "A circular dependency prevented this tool from running." };
		}
	}

	get error(): string | undefined { return this._error; }

	//NB: Tools can dynamically hide inputs and outputs, but should keep reusing the same instances so connections can come back.
	// It's also important for every input/output to exist on construction or saves depending on missing IOs can't be loaded.
	//TODO ^-- Can this be fixed? Would need to change ToolManager.deserialize() somehow
	get inputs(): Readonly<Input[]> {
		return this.allInputs;
	}

	set inputs(inputs: Readonly<Input[]>) {
		this.allInputs.splice(0, this.allInputs.length, ...inputs);
	}

	get outputs(): Readonly<Output[]> {
		return this.allOutputs;
	}

	set outputs(outputs: Readonly<Output[]>) {
		this.allOutputs.splice(0, this.allOutputs.length, ...outputs);
	}

	getDeclaredInput(name: string): Input {
		const rtn = this.allInputs.find(input => input.name == name) || this.inputs.find(input => input.name === name);
		if(rtn === undefined) {
			throw new Error(`Unknown input: ${this.name}.${name}`);
		}
		return rtn;
	}

	getDeclaredOutput(name: string): Output {
		const rtn = this.allOutputs.find(output => output.name == name) || this.outputs.find(output => output.name === name);
		if(rtn === undefined) {
			throw new Error(`Unknown input: ${this.name}.${name}`);
		}
		return rtn;
	}

	setInputVal(input: Input, val: IOValTypes) {
		if(input.tool != this) {
			throw new Error(`Input for wrong tool`);
		} else if(input.connection !== undefined) {
			throw new Error(`Input ${this.name}.${input.name} is bound to ${input.connection.output.tool.name}.${input.connection.output.name}`);
		}

		switch(input.type) {
			case 'bytes':
				if(!Buffer.isBuffer(val)) {
					throw new Error(`Tried to set ${this.name}.${input.name} to a ${typeof val}, but expected bytes`);
				}
				break;
			case 'enum':
				if(typeof val !== 'string') {
					throw new Error(`Tried to set ${this.name}.${input.name} to a ${typeof val}, but expected a string`);
				} else if(input.type === 'enum' && input.options.indexOf(val as string) < 0) {
					throw new Error(`Tried to set ${this.name}.${input.name} to an invalid enum value`);
				}
				break;
			default:
				if(input.type != typeof val) {
					throw new Error(`Tried to set ${this.name}.${input.name} to a ${typeof val}, but expected a ${input.type}`);
				}
				break;
		}

		console.log(`${this.name}.${input.name} = ${val}`);
		const oldVal = input.val;
		(input.val as IOValTypes) = val;
		this.state = ToolState.stale;
		this.onInputSet(input, oldVal);
	}

	propagateInputVal(input: Input) {
		if(input.tool != this) {
			throw new Error(`Input for wrong tool`);
		} else if(input.connection === undefined) {
			throw new Error(`Input ${input.tool.name}.${input.name} is unbound`);
		}
		const oldVal = input.val;
		const output = input.connection.output;
		try {
			const val = convertToInputType(output.val, input);
			input.val = val;
		} catch(e) {
			input.connection.error = `Unable to convert ${output.type} ${output.tool.name}.${output.name} to ${input.type} ${input.tool.name}.${input.name}: ${e.message}`;
			return;
		}
		input.connection.upToDate = true;
		this.state = ToolState.stale;
		this.onInputSet(input, oldVal);
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
			console.error(e);
			this.state = ToolState.failed;
			this._error = e.message;
		}
	}

	protected abstract async runImpl(): Promise<void>;

	protected onInputSet(input: Input, oldVal: IOValTypes | undefined) {}

	//TODO This seems pretty hacky. Should have a better way to properly deserialize tools
	readonly inputDeserializeOrder: string[] = [];

	serialize() {
		type SerializedIOValTypes = Exclude<IOValTypes, Buffer> | { type: 'Buffer', data: number[] };
		return {
			type: this.def.name,
			name: this.name,
			loc: this.loc || null,
			inputs: this.inputs.reduce<{ [K: string]: SerializedIOValTypes }>((map, input) => {
				if(input.connection === undefined) {
					map[input.name] = Buffer.isBuffer(input.val) ? input.val.toJSON() : input.val;
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

	private recordInput<T extends Input>(inp: T): T {
		this.allInputs.push(inp);
		// Need to wait until after this function has returned and the result assigned to a class field
		setTimeout(() => this.onInputSet(inp, undefined), 0);
		return inp;
	}

	private recordOutput<T extends Output>(out: T): T {
		this.allOutputs.push(out);
		return out;
	}

	private commonInputOpts = {
		io: 'input' as const,
		tool: this,
		connection: undefined,
		watch: false,
	}
	private commonOutputOpts = {
		io: 'output' as const,
		tool: this,
		watch: false,
	}

	// These make me so sad. See the above comment about generic Input<T>/Output<T>
	protected makeStringInput = (name: string, description: string, val: string = ''): StringInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'string', val });
	protected makeStringArrayInput = (name: string, description: string, val: string[] = []): StringArrayInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'string[]', val });
	protected makeBooleanInput = (name: string, description: string, val: boolean = false, labels?: [ string, string ]): BooleanInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'boolean', val, labels });
	protected makeBooleanArrayInput = (name: string, description: string, val: boolean[] = [], labels?: [ string, string ]): BooleanArrayInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'boolean[]', val, labels });
	protected makeNumberInput = (name: string, description: string, val: number = 0, min?: number, max?: number): NumberInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'number', val, min, max });
	protected makeNumberArrayInput = (name: string, description: string, val: number[] = [], min?: number, max?: number): NumberArrayInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'number[]', val, min, max });
	protected makeEnumInput = <T extends string = string>(name: string, description: string, val: T, options: T[]): EnumInput<T> => this.recordInput({ ...this.commonInputOpts, name, description, type: 'enum', val, options });
	protected makeEnumArrayInput = (name: string, description: string, val: string[] = [], options: string[]): EnumArrayInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'enum[]', val, options });
	protected makeBytesInput = (name: string, description: string, val: Buffer = Buffer.alloc(0)): BytesInput => this.recordInput({ ...this.commonInputOpts, name, description, type: 'bytes', val });

	protected makeStringOutput = (name: string, description: string, val: string = ''): StringOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'string', val });
	protected makeStringArrayOutput = (name: string, description: string, val: string[] = []): StringArrayOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'string[]', val });
	protected makeBooleanOutput = (name: string, description: string, val: boolean = false, labels?: [ string, string ]): BooleanOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'boolean', val, labels });
	protected makeBooleanArrayOutput = (name: string, description: string, val: boolean[] = [], labels?: [ string, string ]): BooleanArrayOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'boolean[]', val, labels });
	protected makeNumberOutput = (name: string, description: string, val: number = 0, min?: number, max?: number): NumberOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'number', val, min, max });
	protected makeNumberArrayOutput = (name: string, description: string, val: number[] = [], min?: number, max?: number): NumberArrayOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'number[]', val, min, max });
	protected makeEnumOutput = (name: string, description: string, val: string, options: string[]): EnumOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'enum', val, options });
	protected makeEnumArrayOutput = (name: string, description: string, val: string[] = [], options: string[]): EnumArrayOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'enum[]', val, options });
	protected makeBytesOutput = (name: string, description: string, val: Buffer = Buffer.alloc(0)): BytesOutput => this.recordOutput({ ...this.commonOutputOpts, name, description, type: 'bytes', val });
}

// Abstract interface for a tool that passes its input through to its output
export class PassthroughTool extends ToolInst {
	protected type = this.makeEnumInput('type', 'Input/output type', 'number', [ 'string', 'number', 'boolean', 'string[]', 'number[]', 'boolean[]', 'bytes' ]);
	protected inp: Input = this.makeNumberInput('inp', 'Input');
	protected out: Output = this.makeNumberOutput('out', 'Output');

	inputDeserializeOrder = [ 'type' ];

	protected onInputSet(input: Input, oldVal?: string | number | boolean) {
		if(input === this.type) {
			this.inp.type = this.out.type = this.type.val as 'string' | 'number' | 'boolean' | 'bytes' | 'string[]' | 'number[]' | 'boolean[]';
			this.inp.val = convertToInputType(this.inp.val, this.inp);
		}
	}

	async runImpl() {
		this.out.val = this.inp.val;
	}
}

export class ConstantTool extends PassthroughTool {
	constructor(def: ToolDef<ConstantTool>, name: string) {
		super(def, name);
		this.type.description = 'Type';
		this.inp.description = 'Value';
	}

	get loc() {
		return undefined;
	}
	set loc(pt: Point | undefined) {
		if(pt !== undefined) {
			throw new Error("Can't set location of constant tool");
		}
	}

	setInputVal(input: Input, val: IOValTypes) {
		if(input === this.inp) {
			if(Buffer.isBuffer(val)) {
				super.setInputVal(this.type, 'bytes');
			} else {
				switch(typeof (Array.isArray(val) ? val[0] : val)) {
					case 'string':
						super.setInputVal(this.type, Array.isArray(val) ? 'string[]' : 'string');
						break;
					case 'number':
						super.setInputVal(this.type, Array.isArray(val) ? 'number[]' : 'number');
						break;
					case 'boolean':
						super.setInputVal(this.type, Array.isArray(val) ? 'boolean[]' : 'boolean');
						break;
					default:
						throw new Error(`Can't deduce type of value: ${val} (${typeof val})`);
				}
			}
		}
		super.setInputVal(input, val);
	}

	get input() { return this.inp; }
	get output() { return this.out; }
}

export const constantDef = makeDef(ConstantTool, 'Constant', 'Constant value', undefined, () => import('@/tools/const-viewer.vue'));

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
	public selectedTool: ToolInst | undefined = undefined;

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

	generateToolName(baseName: string) {
		// Find a free name based on the baseName
		const names = new Set(this.tools.map(tool => tool.name));
		if(!names.has(baseName)) {
			return baseName;
		}
		for(let i = 2; ; i++) {
			const name = `${baseName} #${i}`;
			if(!names.has(name)) {
				return name;
			}
		}
	}

	addTool<T extends ToolInst>(def: ToolDef<T>, baseName?: string): T {
		// Find a free name based on the baseName
		if(baseName === undefined) {
			baseName = def.name;
		}
		const names = new Set(this.tools.map(tool => tool.name));
		const name: string = (() => {
			if(!names.has(baseName)) {
				return baseName;
			}
			for(let i = 2; ; i++) {
				const name = `${baseName} #${i}`;
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

	addConstant(name: string, val: IOValTypes): ConstantTool {
		const tool = this.addTool(constantDef, name);
		tool.setInputVal(tool.input, val);
		return tool;
	}

	removeTool(tool: ToolInst) {
		const changed = new Set<ToolInst>();
		let idx: number | undefined = undefined;
		for(const [seekIdx, seek] of this.tools.entries()) {
			if(seek === tool) {
				idx = seekIdx;
				continue;
			}
			for(const input of seek.inputs) {
				if(input.connection && input.connection.output.tool == tool) {
					input.connection = undefined;
					changed.add(seek);
				}
			}
		}
		if(idx === undefined) {
			throw new Error(`Unrecognized tool: ${tool.name}`);
		}
		if(this.selectedTool === tool) {
			this.selectedTool = undefined;
		}
		this._tools.splice(idx, 1);
		if(changed.size > 0) {
			this.updateData(...changed);
		}
	}

	connect(input: Input, output: Output) {
		input.connection = {
			output,
			error: undefined,
			upToDate: false,
		};
		this.propagateInputVal(input);
		this.updateData(input);
	}

	disconnect(input: Input) {
		if(input.connection === undefined) {
			throw new Error(`Tried to disconnect independent input ${input.tool.name}.${input.name}`);
		}
		const { upToDate, output: { tool: outputTool } } = input.connection;
		input.connection = undefined;

		if(outputTool instanceof ConstantTool) {
			// Check if anything else is connected to this constant. If not, delete it
			if(!this.tools.flatMap(tool => tool.inputs).some(input => input.connection && input.connection.output.tool === outputTool)) {
				this.removeTool(outputTool);
			}
		}

		// It's unlikely that a disconnection requires an update, but it might be fixing a cycle
		if(!upToDate) {
			this.updateData(input);
		}
	}

	setInputVal(input: Input, val: IOValTypes) {
		input.tool.setInputVal(input, val);
		this.updateData(input);
	}

	propagateInputVal(input: Input) {
		input.tool.propagateInputVal(input);
		this.updateData(input);
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

	*iterWatches(includeDanglingOutputs: boolean): Iterable<Input | Output> {
		const connected = new Set<Output>();
		for(const tool of this.tools) {
			for(const input of tool.inputs) {
				if(input.watch) {
					yield input;
				}
				if(input.connection !== undefined) {
					connected.add(input.connection.output);
				}
			}
			for(const output of tool.outputs) {
				if(output.watch) {
					yield output;
				}
			}
		}
		if(includeDanglingOutputs) {
			for(const tool of this.tools) {
				for(const output of tool.outputs) {
					if(!output.watch && !connected.has(output)) {
						yield output;
					}
				}
			}
		}
	}

	private async updateSetRecursively<T>(set: SetWithChangedFlag<T>, updateFn: (set: Set<T>) => void | Promise<void>) {
		do {
			set.clearFlag();
			await updateFn(set);
		} while(set.changed);
	}

	private updateSource: Readonly<(Input | ToolInst)[]> | undefined = undefined;
	//TODO It would be nice for this to get called automatically instead of by every spot that updates an input. Investigate RxJS or similar libraries
	//TODO Remove debug output
	async updateData(...changes: Readonly<(Input | ToolInst)[]>) {
		console.log('Update data', changes);
		// Find every tool affected by this change
		if(changes.length == 0) {
			changes = this.tools;
		}
		if(this.updateSource !== undefined) {
			changes = [...this.updateSource, ...changes];
		}
		this.updateSource = changes;
		console.log(changes);

		const outOfDate = new SetWithChangedFlag<ToolInst>();
		for(const change of changes) {
			const tool: ToolInst = (change as Input).tool || (change as ToolInst);
			tool.state = ToolState.stale;
			outOfDate.add(tool);
		}
		console.log('outOfDate', outOfDate);

		try {
			const connections = new MapWithDefault<Output, Set<Input>>(() => new Set<Input>());
			await this.updateSetRecursively(outOfDate, set => {
				for(const tool of this.tools) {
					for(const input of tool.inputs) {
						if(this.updateSource !== changes) {
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

			console.log(`Update ${changes}`, outOfDate, connections);

			// Recompute tools
			//TODO Not positive this is guaranteed to resolve in certain cycle conditions, but can't come up with any to prove it
			await this.updateSetRecursively(outOfDate, async (set) => {
				console.log('Running. Remaining:', [...set].map(x => x.name));
				const promises: Promise<void>[] = [];
				for(const tool of set) {
					if(this.updateSource !== changes) {
						throw 'superceded';
					}
					if(tool.inputs.every(input => input.connection === undefined || input.connection.upToDate || input.connection.error)) {
						set.delete(tool);
						promises.push(tool.run().then(() => {
							console.log(`  Finished with ${tool.name}`);
							// Propagate this tool's outputs to any connected inputs
							for(const output of tool.outputs) {
								console.log(`    Setting ${output.name}`);
								for(const input of connections.get(output)) {
									console.log(`      Connected to ${input.name}`);
									input.tool.propagateInputVal(input);
									if(input.connection!.error !== undefined) {
										input.tool.state = ToolState.badInputs;
									}
									set.add(input.tool);
								}
							}
							// Find any inputs connected to now-missing outputs
							for(const output of connections.keys()) {
								if(output.tool === tool && tool.outputs.indexOf(output) < 0) {
									for(const input of connections.get(output)) {
										input.connection!.error = `Connected output ${output.tool.name}.${output.name} no longer exists`;
										input.tool.state = ToolState.badInputs;
									}
								}
							}
						}));
					}
				}
				await Promise.all(promises);
			});
		} catch(e) {
			if(e === 'superceded') {
				console.log(`Update superceded`);
				return;
			}
			throw e;
		}

		console.log('Done. Remaining:', outOfDate.size);

		for(const tool of outOfDate) {
			tool.state = ToolState.cycle;
		}
	}

	serialize(fmt: 'compact' | 'friendly' | 'base64', viewport?: Viewport, lockAutoLayout?: boolean): string {
		const obj: SerializedData = {
			version: 1,
			tools: this.tools.map(tool => tool.serialize()),
			viewport: (viewport === undefined) ? undefined : {
				x: viewport.translation.x,
				y: viewport.translation.y,
				scale: viewport.scale,
			},
			lockAutoLayout: (lockAutoLayout === undefined) ? undefined : lockAutoLayout,
			watches: Array.from(this.iterWatches(false)).map(io => [ io.tool.name, io.name ]),
		};
		switch(fmt) {
			//TODO Need a better way to compact obj (was using clean-deep)
			case 'compact': return JSON.stringify(obj);
			case 'friendly': return JSON.stringify(obj, null, '\t');
			case 'base64': return Buffer.from(JSON.stringify(obj)).toString('base64'); //TODO URI encoding
		}
	}

	// availableDefs is passed in here because importing toolGroups causes a circular dependency I can't easily resolve
	deserialize(data: string, availableDefs: ToolDef[]): { viewport?: Viewport, lockAutoLayout?: boolean} {
		if(!data.startsWith('{')) {
			data = Buffer.from(data, 'base64').toString('utf8');
		}
		const obj: SerializedData = JSON.parse(data);
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
			inst.loc = tool.loc || undefined;
			const inputVals = Object.entries(tool.inputs || {});
			if(inst.inputDeserializeOrder.length > 0) {
				const order = inst.inputDeserializeOrder;
				inputVals.sort(([name1, val1], [name2, val2]) => {
					const idx1 = order.findIndex(name => name == name1), idx2 = order.findIndex(name => name == name2);
					return (idx1 >= 0 && idx2 >= 0) ? idx1 - idx2 :
					       (idx1 >= 0) ? -1 :
					       (idx2 >= 0) ? 1 :
					       0;
				});
			}
			for(const [ name, val ] of inputVals) {
				const input = inst.getDeclaredInput(name);
				if(typeof val === 'object' && !Array.isArray(val)) {
					switch(val.type) {
						case 'Buffer':
							this.setInputVal(input, Buffer.from(val.data));
							break;
						default:
							throw new Error(`Unknown serialized object in ${tool.name}.${name} of type ${val.type}`);
					}
				} else {
					inst.setInputVal(input, val);
				}
			}
		}

		// Now that all tools are instantiated, go back and wire connections
		for(const tool of obj.tools) {
			if(tool.connections) {
				const inst = insts.get(tool.name)!;
				for(const [ inputName, [ outputToolName, outputName ]] of Object.entries(tool.connections)) {
					const input = inst.getDeclaredInput(inputName);
					const outputTool = insts.get(outputToolName);
					if(outputTool === undefined) {
						throw new Error(`Unknown output tool connected to ${tool.name}.${inputName}: ${outputToolName}`);
					}
					const output = outputTool.getDeclaredOutput(outputName);
					input.connection = {
						output,
						error: undefined,
						upToDate: false,
					};
				}
			}
		}

		// Set watches
		if(obj.watches) {
			for(const [ toolName, name ] of obj.watches) {
				const tool = insts.get(toolName);
				if(tool === undefined) {
					throw new Error(`Unknown watched tool: ${toolName}`);
				}
				const input = tool.inputs.find(input => input.name == name);
				if(input) {
					input.watch = true;
				} else {
					const output = tool.outputs.find(output => output.name == name);
					if(output) {
						output.watch = true;
					} else {
						throw new Error(`Unknown watched IO: ${toolName}.${name}`);
					}
				}
			}
		}

		// Success. Replace the existing tools with the loaded set
		this.tools = Array.from(insts.values());

		return {
			viewport: obj.viewport ? {
				translation: {
					x: obj.viewport.x,
					y: obj.viewport.y,
				},
				scale: obj.viewport.scale,
			} : undefined,
			lockAutoLayout: obj.lockAutoLayout,
		};
	}
}
