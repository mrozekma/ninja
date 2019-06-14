export interface Point {
	x: number;
	y: number;
}

export interface Input {
	name: string;
	connectedTo?: {
		task: Task;
		outputName: string;
	}
}

export interface Output {
	name: string;
}

export interface Task {
	name: string;
	loc: Point;
	inputs: Input[];
	outputs: Output[];
}

export function isPoint(pt: any): pt is Point {
	return pt.x !== undefined && pt.y !== undefined;
}
