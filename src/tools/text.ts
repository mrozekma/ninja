import { makeDef, ToolInst, Input, Output, ReversibleTool, ToolDef, StringInput } from '@/tools';

import stringTemplate from 'string-template';

class StringEncodeDecodeTool extends ReversibleTool {
	private inp: Input = this.makeStringInput('str', 'String');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encode', 'Decode' ]);
	private encoding = this.makeEnumInput<BufferEncoding>('fmt', 'Encoding', 'utf8', [ "ascii", "utf8", "utf-8", "utf16le", "ucs2", "ucs-2", /* "base64", */ "latin1", "binary", "hex" ]);
	private out: Output = this.makeBytesOutput('enc', 'Encoded');

	constructor(def: ToolDef<StringEncodeDecodeTool>, name: string) {
		super(def, name);
		this.registerFields(this.dir, this.inp, this.out);
	}

	async runForward() {
		this.out.val = Buffer.from(this.inp.val as string, this.encoding.val);
	}

	async runBackward() {
		this.out.val = (this.inp.val as Buffer).toString(this.encoding.val);
	}
}

class TextSplitTool extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private split = this.makeStringInput('on', 'Split');
	private out = this.makeStringArrayOutput('out', 'Parts');

	async runImpl() {
		this.out.val = this.inp.val.split(this.split.val);
	}
}

class RegexMatchTool extends ToolInst {
	private inp = this.makeStringInput('in', 'Input');
	private regex = this.makeStringInput('pat', 'Regex pattern');
	//TODO Flags?
	private out = this.makeStringArrayOutput('out', 'Groups');

	async runImpl() {
		const match = this.inp.val.match(new RegExp(this.regex.val));
		if(match === null) {
			throw new Error("Pattern does not match");
		}
		this.out.val = Array.from(match).slice(1);
	}
}

export abstract class TemplateExprTool<VarType extends Input> extends ToolInst {
	// Match $foo and ${foo}, but not $$foo
	protected static re = /(?<!\$)\$(?:([a-zA-Z_][a-zA-Z0-9_]*)|{([a-zA-Z_][a-zA-Z0-9_]*)})/g;

	protected expr = this.makeStringInput('expr', 'Expression');
	protected vars = new Map<string, {
		input: VarType;
		count: number; // This is used during expression reevaluation and should otherwise be ignored
	}>();

	protected abstract makeInput(name: string, description: string): VarType;

	protected onInputSet(input: Input) {
		if(input === this.expr) {
			const matches = this.expr.val.matchAll(TemplateExprTool.re);
			this.vars.forEach(v => v.count = 0);
			for(const match of matches) {
				const name = match[1] || match[2]; // match[1] is set if $foo, match[2] is set if ${foo}
				const entry = this.vars.get(name);
				if(entry !== undefined) {
					// If an input for this name exists, use it
					entry.count++;
				} else {
					// Otherwise make a new input
					const input = this.makeInput(name, '$' + name);
					this.vars.set(name, { input, count: 1 });
				}
			}
			this.allInputs = [ this.expr ];
			for(const [ name, { input, count }] of this.vars) {
				if(count == 0) {
					//TODO Want to disconnect anything connected to this input, but no ToolManager available here.
					// A constant connected to this input will end up orphaned
					this.vars.delete(name);
				} else {
					this.allInputs.push(input);
				}
			}
		}
	}
}

class InterpolationTool extends TemplateExprTool<StringInput> {
	private out = this.makeStringOutput('out', 'Output');

	makeInput = this.makeStringInput;

	async runImpl() {
		this.out.val = this.expr.val.replace(TemplateExprTool.re, (match, name1, name2) => {
			const name: string = name1 || name2;
			return this.vars.get(name)!.input.val;
		});
	}
}

class Base64Tool extends ReversibleTool {
	private inp: Input = this.makeBytesInput('data', 'Data');
	private dir = this.makeBooleanInput('dir', 'Direction', true, [ 'Encode', 'Decode' ]);
	private out: Output = this.makeStringOutput('enc', 'Encoded');

	constructor(def: ToolDef<Base64Tool>, name: string) {
		super(def, name);
		this.registerFields(this.dir, this.inp, this.out);
	}

	async runForward() {
		this.out.val = (this.inp.val as Buffer).toString('base64');
	}

	async runBackward() {
		this.out.val = Buffer.from(this.inp.val as string, 'base64');
	}
}

export class JSONDisplayTool extends ToolInst {
	private str = this.makeStringInput('str', 'JSON string');
	get json() { return this.str.val; }
	async runImpl() {}
}

import jsonViewer from '@/tools/json-viewer.vue';

export default [
	makeDef(StringEncodeDecodeTool, 'Encode/Decode', 'String encode/decode'),
	makeDef(TextSplitTool, 'Split', 'Split text'),
	makeDef(RegexMatchTool, 'Regex', 'Regular expression match'),
	makeDef(InterpolationTool, 'Template', 'String template'),
	makeDef(Base64Tool, 'Base64', 'Base64 encoder/decoder'),
	makeDef(JSONDisplayTool, 'JSON display', 'JSON display', undefined, jsonViewer),
];
