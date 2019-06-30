import { makeDef, ToolInst, Input, Output, ToolDef, StringOutput } from '@/tools';

const MAX_PIECES = 5;
class TextSplit extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private split = this.makeStringInput('on', 'Split');

	// There's a max number of outputs, but not all of these are necessarily used
	private numOuts = 5;
	private outs = Array.from({length: MAX_PIECES}, (_, idx) => this.makeStringOutput(`out${idx + 1}`, `Piece #${idx + 1}`));

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
