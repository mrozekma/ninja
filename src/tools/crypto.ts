import { makeDef, ToolInst, Input, Output, ToolDef } from '@/tools';

//@ts-ignore No declaration file
import { encrypt as caesarShift, decrypt as caesarUnshift } from 'caesar-shift';

class CaesarTool extends ToolInst {
	private inp = this.makeStringInput('in', '');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Shift', 'Unshift' ]);
	private key = this.makeNumberInput('key', 'Shift amount', 0, 0, 25);
	private out = this.makeStringOutput('out', '');

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
		this.inp.description = dir ? "Plaintext" : "Ciphertext";
		this.out.description = dir ? "Ciphertext" : "Plaintext";
	}

	async runImpl() {
		const fn = this.dir.val ? caesarShift : caesarUnshift;
		this.out.val = fn(this.key.val, this.inp.val);
	}
}

export default [
	makeDef(CaesarTool, "Caesar shift", "Caesar shift"),
];
