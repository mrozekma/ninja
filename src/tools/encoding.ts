import { makeDef, ToolInst, Input, Output, ToolDef } from '@/tools';

import { Base64 } from 'js-base64';

class Base64Tool extends ToolInst {
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
		labels: [ 'Encode', 'Decode' ],
		val: true,
		connection: undefined,
	}, {
		set: (inp, k, v) => {
			try {
				return Reflect.set(inp, k, v);
			} finally {
				if(k == 'val') {
					this.updateDescriptions();
				}
			}
		},
	});

	private out: Output<string> = {
		tool: this,
		name: 'out',
		description: '',
		type: 'text',
		val: '',
	};

	readonly inputs: Input[] = [ this.inp, this.dir ];
	readonly outputs: Output[] = [ this.out ];

	constructor(def: ToolDef, name: string) {
		super(def, name);
		this.updateDescriptions();
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
