import { makeDef, ToolInst, Input, ToolDef, ReversibleTool } from '@/tools';

//@ts-ignore No declaration file
import { encrypt as caesarShift, decrypt as caesarUnshift } from 'caesar-shift';
import forge from 'node-forge';

const cipherModes: {
	name: 'ECB' | 'CBC' | 'CFB' | 'OFB' | 'CTR' | 'GCM';
	hasIv: boolean;
	hasTag: boolean;
	isStream: boolean;
	aesAlgorithm?: 'AES-ECB' | 'AES-CBC' | 'AES-CFB' | 'AES-OFB' | 'AES-CTR' | 'AES-GCM';
	desAlgorithm?: 'DES-ECB' | 'DES-CBC';
}[] = [
	{ name: 'ECB', hasIv: false, hasTag: false, isStream: false, aesAlgorithm: 'AES-ECB', desAlgorithm: 'DES-ECB' },
	{ name: 'CBC', hasIv: true,  hasTag: false, isStream: false, aesAlgorithm: 'AES-CBC', desAlgorithm: 'DES-CBC' },
	{ name: 'CFB', hasIv: true,  hasTag: false, isStream: true , aesAlgorithm: 'AES-CFB' },
	{ name: 'OFB', hasIv: true,  hasTag: false, isStream: true , aesAlgorithm: 'AES-OFB' },
	{ name: 'CTR', hasIv: true,  hasTag: false, isStream: true , aesAlgorithm: 'AES-CTR' },
	{ name: 'GCM', hasIv: true,  hasTag: true,  isStream: false, aesAlgorithm: 'AES-GCM' },
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

abstract class CipherTool extends ReversibleTool {
	private in = this.makeBytesInput('pt', 'Plaintext');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encrypt', 'Decrypt' ]);
	private mode = this.makeEnumInput('mode', 'Mode', 'CBC', cipherModes.filter(mode => this.getAlgorithm(mode) !== undefined).map(mode => mode.name));
	private padMode = this.makeEnumInput('pad', 'Padding Mode', 'None', paddingModes.map(mode => mode.name));
	private key = this.makeBytesInput('key', 'Key');
	private iv = this.makeBytesInput('iv', 'Initialization Vector');
	private aad = this.makeBytesInput('aad', 'Additional Authenticated Data');
	private tagIn = this.makeBytesInput('tag', 'Authentication Tag');
	private out = this.makeBytesOutput('ct', 'Ciphertext');
	private tagOut = this.makeBytesOutput('tag', 'Authentication Tag');

	readonly inputDeserializeOrder = [ 'dir', 'mode' ]

	constructor(def: ToolDef, name: string) {
		super(def, name);
		this.registerFields(this.dir, this.in, this.out);
	}

	protected abstract getAlgorithm(mode: typeof cipherModes[number]): string | undefined;
	protected abstract get blockLength(): number;
	protected abstract get keyLengths(): number[];

	private get modeInfo() {
		return cipherModes.find(mode => mode.name == this.mode.val)!;
	}

	private get paddingModeInfo() {
		const name = this.modeInfo.isStream ? 'None' : this.padMode.val;
		return paddingModes.find(mode => mode.name == name)!;
	}

	get inputs() {
		const rtn: Input[] = [ this.in, this.dir, this.mode ];
		if(!this.modeInfo.isStream) {
			rtn.push(this.padMode);
		}
		rtn.push(this.key);
		if(this.modeInfo.hasIv) {
			rtn.push(this.iv);
		}
		if(this.modeInfo.hasTag) {
			rtn.push(this.aad);
			if(!this.dir.val) {
				rtn.push(this.tagIn);
			}
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

	private checkKeyLen() {
		const keyLen = this.key.val.length;
		const validLens = this.keyLengths;
		if(validLens.indexOf(keyLen) == -1) {
			const validLenDesc = (() => {
				switch(validLens.length) {
					case 1:
						return `${validLens[0] * 8} bits`;
					case 2:
						return `${validLens[0] * 8} or ${validLens[1] * 8} bits`;
					default:
						const strs = validLens.map(len => (len * 8).toString());
						const last = strs.pop();
						return `${strs.join(', ')}, or ${last} bits`;
				}
			})();
			throw new Error(`Invalid ${keyLen * 8}-bit key. Must be ${validLenDesc}`);
		}
	}

	async runForward() {
		this.checkKeyLen();
		const cipher = forge.cipher.createCipher(this.getAlgorithm(this.modeInfo) as forge.cipher.Algorithm, forge.util.createBuffer(this.key.val));
		cipher.start({
			iv: forge.util.createBuffer(this.iv.val),
			additionalData: this.modeInfo.hasTag ? forge.util.createBuffer(this.aad.val) : undefined,
		});
		const padded = this.paddingModeInfo.pad(this.in.val, this.blockLength);
		cipher.update(forge.util.createBuffer(padded));
		cipher.finish(() => true);
		this.out.val = Buffer.from(cipher.output.toHex(), 'hex');
		if(this.modeInfo.hasTag) {
			this.tagOut.val = Buffer.from(cipher.mode.tag.toHex(), 'hex');
		}
	}

	async runBackward() {
		this.checkKeyLen();
		const cipher = forge.cipher.createDecipher(this.getAlgorithm(this.modeInfo) as forge.cipher.Algorithm, forge.util.createBuffer(this.key.val));
		cipher.start({
			iv: forge.util.createBuffer(this.iv.val),
			tag: this.modeInfo.hasTag ? forge.util.createBuffer(this.tagIn.val) : undefined,
			additionalData: this.modeInfo.hasTag ? forge.util.createBuffer(this.aad.val) : undefined,
		});
		cipher.update(forge.util.createBuffer(this.in.val));
		if(!cipher.finish(() => true)) {
			throw new Error("Decryption failed");
		}
		const padded = Buffer.from(cipher.output.toHex(), 'hex');
		this.out.val = this.paddingModeInfo.unpad(padded, this.blockLength);
	}
}

class AESTool extends CipherTool {
	protected getAlgorithm(mode: typeof cipherModes[number]): string | undefined {
		return mode.aesAlgorithm;
	}

	protected get blockLength(): number {
		return 16;
	}

	protected get keyLengths(): number[] {
		return [ 16, 24, 32 ];
	}
}

class DESTool extends CipherTool {
	protected getAlgorithm(mode: typeof cipherModes[number]): string | undefined {
		return mode.desAlgorithm;
	}

	protected get blockLength(): number {
		return 8;
	}

	protected get keyLengths(): number[] {
		return [ 8, 24 ];
	}
}

class CaesarTool extends ReversibleTool {
	private inp = this.makeStringInput('pt', 'Plaintext');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Shift', 'Unshift' ]);
	private key = this.makeNumberInput('key', 'Shift amount', 0, 0, 25);
	private out = this.makeStringOutput('ct', 'Ciphertext');

	constructor(def: ToolDef<CaesarTool>, name: string) {
		super(def, name);
		this.registerFields(this.dir, this.inp, this.out);
	}

	async runForward() {
		this.out.val = caesarShift(this.key.val, this.inp.val);
	}

	async runBackward() {
		this.out.val = caesarUnshift(this.key.val, this.inp.val);
	}
}

export default [
	makeDef(AESTool, 'AES', 'AES'),
	makeDef(DESTool, 'DES', 'DES'),
	makeDef(CaesarTool, "Caesar shift", "Caesar shift"),
];
