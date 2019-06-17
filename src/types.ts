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
	gen: () => ToolInst;
	editor?: () => Promise<any>;
}

export interface Point {
	x: number;
	y: number;
}

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

/*
export interface ToolInst {
	name: string;
	loc: Point;
	inputs: Input[];
	outputs: Output[];
	ephemeral: boolean;
}
*/

export function isPoint(pt: any): pt is Point {
	return pt.x !== undefined && pt.y !== undefined;
}

export interface RootData {
	tools: ToolInst[];
	selectedTool?: ToolInst;
}

export interface RemoteConnection {
	tool: ToolInst;
	outputName: string;
}

export type ToolInstInput = {
	name: string;
} & ({
	type: 'string' | 'text';
	val: string | RemoteConnection;
} | {
	type: 'boolean';
	val: boolean | RemoteConnection;
} | {
	type: 'number';
	min?: number;
	max?: number;
	val: number | RemoteConnection;
} | {
	type: 'enum';
	options: string[];
	val: string | RemoteConnection;
})

export abstract class ToolInst {
	private _name: string = '';

	constructor(public readonly def: ToolDef) {}

	get name(): string {
		return this._name;
	}

	set name(name: string) {
		this._name = name;
	}

	abstract get inputs(): ToolInstInput[];
}
