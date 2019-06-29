import { makeDef, ToolInst, Input, Output, ToolDef } from '@/tools';

import { Base64 } from 'js-base64';

class Base64Tool extends ToolInst {
	private inp = this.makeStringInput('in', '', 'text');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encode', 'Decode' ]);
	private out = this.makeStringOutput('out', '', 'text');

	constructor(def: ToolDef, name: string) {
		super(def, name);
		this.updateDescriptions();
	}

	protected onInputSet(input: Input, oldVal: string | number | boolean) {
		if(input === this.dir) {
			this.updateDescriptions();
		}
	}

	private updateDescriptions() {
		const dir = this.dir.val;
		this.inp.description = dir ? "Plaintext" : "Encoded";
		this.out.description = dir ? "Encoded" : "Plaintext";
	}

	async runImpl() {
		const fn = this.dir.val ? Base64.encode : Base64.decode;
		this.out.val = fn(this.inp.val);
	}
}

export default [
	makeDef(Base64Tool, 'Base64', "Base64 encoder/decoder"),
];
