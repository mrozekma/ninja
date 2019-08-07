import { makeDef, ToolInst, Input, Output } from '@/tools';

abstract class ArrayTool extends ToolInst {
	protected type = this.makeEnumInput('type', 'Input/output type', 'bytes', [ 'bytes', 'string[]', 'number[]', 'boolean[]' ]);
	protected inp: Input = this.makeBytesInput('inp', 'Input');
	protected out: Output = this.makeBytesOutput('out', 'Output');

	inputDeserializeOrder = [ 'type' ];

	private deduceMyTypeFromConnection(type: Output['type']) {
		switch(type) {
			case 'boolean':
			case 'boolean[]':
				return 'boolean[]';
			case 'number':
			case 'number[]':
				return 'number[]';
			case 'string':
			case 'string[]':
			case 'enum':
			case 'enum[]':
				return 'string[]';
			case 'bytes':
				return 'bytes';
		}
	}

	protected onInputSet(input: Input) {
		if(input === this.type) {
			this.setInputType(this.inp, this.type.val);
			this.setOutputType(this.out, this.type.val);
			this.propagateInputVal(this.inp);
		} else if(input === this.inp && input.connection !== undefined) {
			// If a connection was made, dynamically change type to the type of the connected output
			this.setInputVal(this.type, this.deduceMyTypeFromConnection(input.connection.output.type));
		}
	}
}

class SliceTool extends ArrayTool {
	private endType = this.makeEnumInput('etyp', 'End Type', 'Index', ['Index', 'Length'])
	private start = this.makeNumberInput('start', 'Start Index');
	private end = this.makeNumberInput('end', 'End Index');

	inputDeserializeOrder = [ 'type', 'etyp' ];

	protected onInputSet(input: Input) {
		if(input === this.endType) {
			switch(this.endType.val) {
				case 'Index':
					this.end.name = 'end';
					this.end.description = 'End Index';
					this.end.min = undefined;
					break;
				case 'Length':
					this.end.name = 'len';
					this.end.description = 'Length';
					this.end.min = 0;
					if(this.end.val < 0) {
						this.setInputVal(this.end, 0);
					}
					break;
			}
		}
	}

	async runImpl() {
		const len = Buffer.isBuffer(this.inp.val) ? this.inp.val.length : (this.inp.val as any[]).length;
		let start = this.start.val + ((this.start.val < 0) ? len : 0);
		let end = this.end.val + ((this.end.val < 0) ? len : 0);
		if(start >= len || (this.endType.val === 'Index' && start >= end)) {
			start = end = 0;
		} else if(this.endType.val === 'Length') {
			end += start;
		}
		this.out.val = (this.inp.val as Buffer | any[]).slice(start, end);
	}
}

class ReadNumberTool extends ToolInst {
	private buf = this.makeBytesInput('buf', 'Buffer');
	private off = this.makeNumberInput('off', 'Offset');
	private size = this.makeEnumInput('size', 'Size', 'leuint32', [ 'int8', 'uint8', 'beint16', 'leint16', 'beuint16', 'leuint16', 'beint32', 'leint32', 'beuint32', 'leuint32' ]);
	private out = this.makeNumberOutput('out', 'Output');

	private readNumber(): number {
		const buf = this.buf.val;
		const off = this.off.val;
		switch(this.size.val) {
			case 'int8': return buf.readInt8(off);
			case 'uint8': return buf.readUInt8(off);
			case 'beint16': return buf.readInt16BE(off);
			case 'leint16': return buf.readInt16LE(off);
			case 'beuint16': return buf.readUInt16BE(off);
			case 'leuint16': return buf.readUInt16LE(off);
			case 'beint32': return buf.readInt32BE(off);
			case 'leint32': return buf.readInt32LE(off);
			case 'beuint32': return buf.readUInt32BE(off);
			case 'leuint32': return buf.readUInt32LE(off);
		}
	}

	async runImpl() {
		this.out.val = this.readNumber();
	}
}

export default [
	makeDef(SliceTool, 'Slice', 'Slice'),
	makeDef(ReadNumberTool, 'Read Number', 'Read Number'),
];
