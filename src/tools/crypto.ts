import { makeDef, ToolInst, Input, ToolDef } from '@/tools';

//@ts-ignore No declaration file
import { encrypt as caesarShift, decrypt as caesarUnshift } from 'caesar-shift';
import crypto from 'crypto';

const cipherModes: {
	name: string;
	hasIv: boolean;
	hasTag: boolean;
	isStream: boolean;
}[] = [
	{ name: 'ECB', hasIv: false, hasTag: false, isStream: false },
	{ name: 'CBC', hasIv: true,  hasTag: false, isStream: false },
	{ name: 'CFB', hasIv: true,  hasTag: false, isStream: true  },
	{ name: 'OFB', hasIv: true,  hasTag: false, isStream: true  },
	{ name: 'CTR', hasIv: true,  hasTag: false, isStream: true  },
	{ name: 'GCM', hasIv: true,  hasTag: true,  isStream: false },
];

const paddingModes: {
	name: string;
	pad(data: Buffer, blockLen: number): Buffer;
	unpad(data: Buffer, blockLen: number): Buffer;
}[] = [
	{
		name: 'None',
		pad: data => data,
		unpad: data => data,
	},
	{
		name: 'PKCS7',
		pad(data, blockLen) {
			const padLen = (data.length % blockLen == 0) ? blockLen : blockLen - (data.length % blockLen);
			return Buffer.concat([data, Buffer.allocUnsafe(padLen).fill(padLen)]);
		},
		unpad(data, blockLen) {
			if(data.length == 0) {
				throw new Error("Empty ciphertext");
			}
			const padLen = data[data.length - 1];
			if(padLen > blockLen) {
				throw new Error(`Invalid padding: pad length ${padLen} > block length ${blockLen}`);
			} else if(padLen > data.length) {
				throw new Error(`Invalid padding: pad length ${padLen} > data length ${data.length}`);
			}
			for(let i = data.length - padLen; i < data.length; i++) {
				if(data[i] != padLen) {
					throw new Error(`Invalid padding: data byte ${i} is ${data[i].toString(16).padStart(2, '0')}, not padding byte ${padLen.toString(16).padStart(2, '0')}`);
				}
			}
			return data.slice(0, data.length - padLen);
		},
	},
	{
		name: 'OneAndZeros',
		pad(data, blockLen) {
			const padLen = (data.length % blockLen == 0) ? blockLen : blockLen - (data.length % blockLen);
			const padding = Buffer.allocUnsafe(padLen).fill(0x00);
			padding[0] = 0x80;
			return Buffer.concat([data, padding]);
		},
		unpad(data, blockLen) {
			for(let padLen = 1; padLen < data.length; padLen++) {
				const b = data[data.length - padLen];
				switch(b) {
					case 0x00:
						continue;
					case 0x80:
						return data.slice(0, data.length - padLen);
					default:
						throw new Error(`Invalid padding byte at ${data.length - padLen}: ${b.toString(16).padStart(2, '0')}`);
				}
			}
			return Buffer.alloc(0);
		},
	},
	{
		name: 'ANSI X9.23',
		pad(data, blockLen) {
			const padLen = (data.length % blockLen == 0) ? blockLen : blockLen - (data.length % blockLen);
			const padding = Buffer.allocUnsafe(padLen).fill(0x00);
			padding[padding.length - 1] = padLen;
			return Buffer.concat([data, padding]);
		},
		unpad(data, blockLen) {
			if(data.length == 0) {
				throw new Error("Empty ciphertext");
			}
			const padLen = data[data.length - 1];
			if(padLen > blockLen) {
				throw new Error(`Invalid padding: pad length ${padLen} > block length ${blockLen}`);
			} else if(padLen > data.length) {
				throw new Error(`Invalid padding: pad length ${padLen} > data length ${data.length}`);
			}
			return data.slice(0, data.length - padLen);
		},
	},
];

class AESTool extends ToolInst {
	private in = this.makeBytesInput('', '');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encrypt', 'Decrypt' ]);
	private mode = this.makeEnumInput('mode', 'Mode', 'CBC', cipherModes.map(mode => mode.name));
	private padMode = this.makeEnumInput('pad', 'Padding Mode', 'None', paddingModes.map(mode => mode.name));
	private key = this.makeBytesInput('key', 'Key');
	private iv = this.makeBytesInput('iv', 'Initialization Vector');
	private tagIn = this.makeBytesInput('tag', 'Authentication Tag');
	private out = this.makeBytesOutput('', '');
	private tagOut = this.makeBytesOutput('tag', 'Authentication Tag');

	readonly inputDeserializeOrder = [ 'dir', 'mode' ]

	private get modeInfo() {
		return cipherModes.find(mode => mode.name == this.mode.val)!;
	}

	private get paddingModeInfo() {
		const name = this.modeInfo.isStream ? 'None' : this.padMode.val;
		return paddingModes.find(mode => mode.name == name)!;
	}

	get inputs() {
		const rtn = [ this.in, this.dir, this.mode ];
		if(!this.modeInfo.isStream) {
			rtn.push(this.padMode);
		}
		rtn.push(this.key);
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
		(this.dir.val ? this.encrypt : this.decrypt).call(this, keyLen);
	}

	private encrypt(keyLen: number) {
		const cipher = crypto.createCipheriv(`aes-${keyLen * 8}-${this.mode.val.toLowerCase()}`, this.key.val, this.modeInfo.hasIv ? this.iv.val : '');
		cipher.setAutoPadding(false);
		const padded = this.paddingModeInfo.pad(this.in.val, 16);
		this.out.val = Buffer.concat([ cipher.update(padded), cipher.final() ]);
		if(this.modeInfo.hasTag) {
			this.tagOut.val = (cipher as crypto.CipherGCM).getAuthTag();
		}
	}

	private decrypt(keyLen: number) {
		const cipher = crypto.createDecipheriv(`aes-${keyLen * 8}-${this.mode.val.toLowerCase()}`, this.key.val, this.modeInfo.hasIv ? this.iv.val : '');
		cipher.setAutoPadding(false);
		if(this.modeInfo.hasTag) {
			(cipher as crypto.DecipherGCM).setAuthTag(this.tagIn.val);
		}
		const decrypted = Buffer.concat([ cipher.update(this.in.val), cipher.final() ]);
		this.out.val = this.paddingModeInfo.unpad(decrypted, 16);
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
