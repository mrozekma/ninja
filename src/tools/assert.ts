import { makeDef, ToolInst, Input, Output, convertToInputType } from '@/tools';

class AssertEqual extends ToolInst {
	private type = this.makeEnumInput('type', 'Input/output type', 'string', [ 'string', 'number', 'boolean', 'bytes', 'string[]', 'number[]', 'boolean[]' ]);
	private in1: Input = this.makeStringInput('in1', 'Input #1');
	private in2: Input = this.makeStringInput('in2', 'Input #2');
	private eq: Output = this.makeBooleanOutput('eq', 'Equal?');

	protected onInputSet(input: Input) {
		switch(input) {
			case this.type:
				this.in1.type = this.in2.type = this.type.val;
				//TODO This throws an exception if the val isn't convertable. Same problem in PassthroughTool
				this.propagateInputVal(this.in1);
				this.propagateInputVal(this.in2);
				break;
			case this.in1:
			case this.in2:
				if(input.connection !== undefined) {
					// If a connection was made, dynamically change type to the type of the connected output
					const type = input.connection.output.type;
					this.setInputVal(this.type, (type == 'enum') ? 'string' : (type == 'enum[]') ? 'string[]' : type);
				}
				break;
		}
	}

	async runImpl() {
		const val1 = this.in1.val, val2 = this.in2.val;
		if(Array.isArray(val1) && Array.isArray(val2)) {
			const arr1 = val1 as (string | boolean | number)[], arr2 = val2 as (string | boolean | number)[];
			this.eq.val = !arr1.some((e, idx) => e != arr2[idx]);
		} else if(Buffer.isBuffer(val1) && Buffer.isBuffer(val2)) {
			this.eq.val = val1.equals(val2);
		} else {
			this.eq.val = val1 == val2;
		}
	}
}

export default [
	makeDef(AssertEqual, 'Assert equal', 'Assert equal'),
];
