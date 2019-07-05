import { makeDef, ToolInst, Input, ToolDef } from '@/tools';

//@ts-ignore No declaration file
import { encrypt as caesarShift, decrypt as caesarUnshift } from 'caesar-shift';
import crypto from 'crypto';

const modes: {
	name: string;
	hasIv: boolean;
	hasTag: boolean;
}[] = [
	{ name: 'ECB', hasIv: false, hasTag: false },
	{ name: 'CBC', hasIv: true,  hasTag: false },
	{ name: 'CFB', hasIv: true,  hasTag: false },
	{ name: 'OFB', hasIv: true,  hasTag: false },
	{ name: 'CTR', hasIv: true,  hasTag: false },
	{ name: 'GCM', hasIv: true,  hasTag: true  },
];

class AESTool extends ToolInst {
	private in = this.makeBytesInput('', '');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encrypt', 'Decrypt' ]);
	private mode = this.makeEnumInput('mode', 'Mode', 'CBC', modes.map(mode => mode.name));
	private key = this.makeBytesInput('key', 'Key');
	private iv = this.makeBytesInput('iv', 'Initialization Vector');
	private tagIn = this.makeBytesInput('tag', 'Authentication Tag');
	private out = this.makeBytesOutput('', '');
	private tagOut = this.makeBytesOutput('tag', 'Authentication Tag');

	readonly inputDeserializeOrder = [ 'dir', 'mode' ]

	private get modeInfo() {
		return modes.find(mode => mode.name == this.mode.val)!;
	}

	get inputs() {
		const rtn = [ this.in, this.dir, this.mode, this.key ];
		if(this.modeInfo.hasIv) {
			rtn.push(this.iv);
		}
		if(this.modeInfo.hasTag && !this.dir.val) {
			rtn.push(this.tagIn);
		}
		return rtn;
	}

	get outputs() {
		const rtn = [ this.out ];
		if(this.modeInfo.hasTag && this.dir.val) {
			rtn.push(this.tagOut);
		}
		return rtn;
	}

	get pt() {
		return this.dir.val ? this.in : this.out;
	}

	get ct() {
		return this.dir.val ? this.out : this.in;
	}

	protected onInputSet(input: Input) {
		switch(input) {
			case this.dir:
				this.pt.name = 'pt';
				this.pt.description = 'Plaintext';
				this.ct.name = 'ct';
				this.ct.description = 'Ciphertext';
				break;
			case this.key:
				//TODO Check key length
				break;
		}
	}

	async runImpl() {
		const keyLen = this.key.val.length;
		if(keyLen != 16 && keyLen != 20 && keyLen != 24) {
			throw new Error(`Invalid ${keyLen * 8}-bit key. Must be 128, 160, or 192 bits`);
		}

		const ctor = this.dir.val ? crypto.createCipheriv : crypto.createDecipheriv;
		const cipher = ctor(`aes-${keyLen * 8}-${this.mode.val.toLowerCase()}`, this.key.val, this.modeInfo.hasIv ? this.iv.val : '');
		cipher.setAutoPadding(false);
		if(!this.dir.val && this.modeInfo.hasTag) {
			//@ts-ignore TODO Why is this commented out in the declaration file?
			(cipher as crypto.Decipher).setAuthTag(this.tagIn.val);
		}
		this.out.val = Buffer.concat([ cipher.update(this.in.val), cipher.final() ]);
		if(this.dir.val && this.modeInfo.hasTag) {
			//@ts-ignore TODO Why is this commented out in the declaration file?
			this.tagOut.val = (cipher as crypto.Cipher).getAuthTag();
		}
	}
}

class CaesarTool extends ToolInst {
	private inp = this.makeStringInput('in', '');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Shift', 'Unshift' ]);
	private key = this.makeNumberInput('key', 'Shift amount', 0, 0, 25);
	private out = this.makeStringOutput('out', '');

	protected onInputSet(input: Input) {
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
	makeDef(AESTool, 'AES', 'AES'),
	makeDef(CaesarTool, "Caesar shift", "Caesar shift"),
];
