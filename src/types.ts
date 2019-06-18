import { ToolDef, ToolInst } from './tools';

export interface ToolGroup {
	name: string;
	icon: string;
	tools: ToolDef[];
}

export interface Point {
	x: number;
	y: number;
}

export function isPoint(pt: any): pt is Point {
	return pt.x !== undefined && pt.y !== undefined;
}

export interface RootData {
	tools: ToolInst[];
	selectedTool?: ToolInst;
}
