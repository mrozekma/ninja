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
	private start = this.makeNumberInput('start', 'Start Index');
	private end = this.makeNumberInput('end', 'End Index');

	protected onInputSet(input: Input) {
		super.onInputSet(input);
		if(input === this.inp) {
			const len = Buffer.isBuffer(input.val) ? input.val.length : (input.val as any[]).length;
			for(const numberInp of [ this.start, this.end ]) {
				numberInp.min = -len;
				numberInp.max = len;
				if(numberInp.val < numberInp.min) {
					numberInp.val = numberInp.min;
				} else if(numberInp.val > numberInp.max) {
					numberInp.val = numberInp.max;
				}
			}
		}
	}

	async runImpl() {
		const len = Buffer.isBuffer(this.inp.val) ? this.inp.val.length : (this.inp.val as any[]).length;
		const start = this.start.val + ((this.start.val < 0) ? len : 0);
		const end = this.end.val + ((this.end.val < 0) ? len : 0);
		this.out.val = (this.inp.val as Buffer | any[]).slice(start, end);
	}
}

export default [
	makeDef(SliceTool, 'Slice', 'Slice'),
];
