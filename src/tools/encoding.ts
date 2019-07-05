import { makeDef, ToolInst, Input, Output } from '@/tools';

class Base64Tool extends ToolInst {
	private inp: Input = this.makeStringInput('in', '');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encode', 'Decode' ]);
	private out: Output = this.makeStringOutput('out', '');

	protected onInputSet(input: Input) {
		if(input === this.dir) {
			const dir = this.dir.val;
			const pt = dir ? this.inp : this.out, enc = dir ? this.out : this.inp;
			pt.type = 'bytes';
			pt.description = 'Plaintext';
			enc.type = 'string';
			enc.description = 'Encoded';
		}
	}

	async runImpl() {
		if(this.dir.val) {
			this.out.val = (this.inp.val as Buffer).toString('base64');
		} else {
			this.out.val = Buffer.from(this.inp.val as string, 'base64');
		}
	}
}

export default [
	makeDef(Base64Tool, 'Base64', "Base64 encoder/decoder"),
];
