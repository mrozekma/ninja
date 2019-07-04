import { makeDef, ToolInst, Input, Output, convertToInputType } from '@/tools';

class AssertEqual extends ToolInst {
	private in1: Input = this.makeNumberInput('in1', 'Input #1');
	private in2: Input = this.makeNumberInput('in2', 'Input #2');
	private type = this.makeEnumInput('type', 'Input/output type', 'number', [ 'string', 'number', 'boolean', 'bytes', 'string[]', 'number[]', 'boolean[]' ]);
	private eq: Output = this.makeBooleanOutput('eq', 'Equal?');

	protected onInputSet(input: Input, oldVal: string | number | boolean) {
		if(input === this.type) {
			this.in1.type = this.in2.type = this.type.val;
			//TODO This throws an exception if the val isn't convertable. Same problem in PassthroughTool
			this.in1.val = convertToInputType(this.in1.val, this.in1);
			this.in2.val = convertToInputType(this.in2.val, this.in2);
		}
	}

	async runImpl() {
		const val1 = this.in1.val, val2 = this.in2.val;
		if(Array.isArray(val1) && Array.isArray(val2)) {
			const arr1 = val1 as (string | boolean | number)[], arr2 = val2 as (string | boolean | number)[];
			this.eq.val = !arr1.some((e, idx) => e != arr2[idx]);
		} else {
			this.eq.val = val1 == val2;
		}
	}
}

export default [
	makeDef(AssertEqual, 'Assert equal', 'Assert equal'),
];
