import { makeDef, ToolInst, Input, Output, ToolDef } from '@/tools';

//@ts-ignore No declaration file
import { encrypt as caesarShift, decrypt as caesarUnshift } from 'caesar-shift';

class CaesarTool extends ToolInst {
	private inp: Input<string> = {
		tool: this,
		name: 'in',
		description: '',
		type: 'text',
		val: '',
		connection: undefined,
	};

	private dir: Input<boolean> = new Proxy({
		tool: this,
		name: 'dir',
		description: 'Direction',
		type: 'boolean',
		labels: [ 'Shift', 'Unshift' ],
		val: true,
		connection: undefined,
	}, {
		set: (inp, k, v) => {
			const rtn = Reflect.set(inp, k, v);
			if(k == 'val') {
				this.updateDescriptions();
			}
			return rtn;
		},
	});

	private key: Input<number> = {
		tool: this,
		name: 'key',
		description: 'Shift amount',
		type: 'number',
		min: 0,
		max: 25,
		val: 0,
		connection: undefined,
	};

	private out: Output<string> = {
		tool: this,
		name: 'out',
		description: '',
		type: 'text',
		val: '',
	};

	readonly inputs: Input[] = [ this.inp, this.dir, this.key ];
	readonly outputs: Output[] = [ this.out ];

	constructor(def: ToolDef, name: string) {
		super(def, name);
		this.updateDescriptions();
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
