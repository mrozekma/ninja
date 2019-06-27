import { makeDef, ToolInst, Input, Output, ToolDef } from '@/tools';

const MAX_PIECES = 5;
class TextSplit extends ToolInst {
	private inp: Input<string> = {
		tool: this,
		name: 'in',
		description: "Input",
		type: 'text',
		val: '',
		connection: undefined,
	};

	private split: Input<string> = {
		tool: this,
		name: 'on',
		description: "Split",
		type: 'string',
		val: ',',
		connection: undefined,
	};

	private numOuts = 5;
	// There's a max number of outputs, but not all of these are necessarily used
	private outs: Output<string>[] = Array.from({length: MAX_PIECES}, (_, idx): Output<string> => ({
		tool: this,
		name: `out${idx + 1}`,
		description: `Piece #${idx + 1}`,
		type: 'string',
		val: '',
	}));

	readonly inputs: Input[] = [ this.inp, this.split ];
	get outputs(): Output[] {
		return this.outs.slice(0, this.numOuts);
	}

	async runImpl() {
		this.numOuts = 0;
		this.inp.val.split(this.split.val, MAX_PIECES).forEach((piece, idx) => {
			this.outs[idx].val = piece;
			this.numOuts = idx + 1;
		});
	}
}

export default [
	makeDef(TextSplit, 'Split', 'Split text'),
];
