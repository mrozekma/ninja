import { makeDef, ToolInst, Input, Output, ReversibleTool, ToolDef, StringInput } from '@/tools';

import { diffChars, diffWords, diffLines, Change, convertChangesToXML } from 'diff';

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

abstract class RegexTool extends ToolInst {
	protected inp = this.makeStringInput('in', 'Input');
	protected regex = this.makeStringInput('pat', 'Regex pattern');
	protected flagGlobal = this.makeBooleanInput('g', 'Global');
	protected flagIgnoreCase = this.makeBooleanInput('i', 'Ignore case');
	protected flagMultiline = this.makeBooleanInput('m', 'Multi-line');
	protected flagDotall = this.makeBooleanInput('s', 'Dot-all');

	protected get re(): RegExp {
		const flags =
			(this.flagGlobal.val ? 'g' : '') +
			(this.flagIgnoreCase.val ? 'i' : '') +
			(this.flagMultiline.val ? 'm' : '') +
			(this.flagDotall.val ? 's' : '');
		return new RegExp(this.regex.val, flags);
	}
}

class RegexMatchTool extends RegexTool {
	private out = this.makeStringArrayOutput('out', 'Groups');

	async runImpl() {
		const match = this.inp.val.match(this.re);
		if(match === null) {
			throw new Error("Pattern does not match");
		}
		this.out.val = this.flagGlobal.val ? [...match] : [...match].slice(1);
	}
}

class RegexReplaceTool extends RegexTool {
	private repl = this.makeStringInput('repl', 'Replacement');
	private out = this.makeStringOutput('out', 'Output');

	async runImpl() {
		this.out.val = this.inp.val.replace(this.re, this.repl.val);
	}
}

export abstract class TemplateExprTool<VarType extends Input> extends ToolInst {
	// Match $foo and ${foo}, but not $$foo
	protected static re = /([^$]|^)\$(?:([a-zA-Z_][a-zA-Z0-9_]*)|{([a-zA-Z_][a-zA-Z0-9_]*)})/g;

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
				const name = match[2] || match[3]; // match[2] is set if $foo, match[3] is set if ${foo}
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
		this.out.val = this.expr.val.replace(TemplateExprTool.re, (match, pre, name1, name2) => {
			const name: string = name1 || name2;
			return pre + this.vars.get(name)!.input.val;
		});
	}
}

export class DiffTool extends ToolInst {
	private before = this.makeStringInput('in1', 'Input (before)');
	private after = this.makeStringInput('in2', 'Input (after)');
	//TODO JSON mode?
	private mode = this.makeEnumInput('mode', 'Diff mode', 'chars', ['chars', 'words', 'lines']);
	private ignoreCase = this.makeBooleanInput('i', 'Ignore case', false);
	private ignoreSpace = this.makeBooleanInput('w', 'Ignore whitespace', false);
	private out = this.makeStringOutput('out', 'Diff XML');
	private _changes: Change[] = [];

	get changes(): Readonly<Change[]> {
		return this._changes;
	}

	get inputs() {
		const rtn: Input[] = [ this.before, this.after, this.mode, this.ignoreCase ];
		if(this.mode.val != 'chars') {
			rtn.push(this.ignoreSpace);
		}
		return rtn;
	}

	private get diffFn(): ((before: string, after: string) => Change[]) {
		const ignoreCase = this.ignoreCase.val;
		const ignoreWhitespace = this.ignoreSpace.val;
		switch(this.mode.val) {
			case 'chars': return (before, after) => diffChars(before, after, { ignoreCase });
			case 'words': return (before, after) => diffWords(before, after, { ignoreCase, ignoreWhitespace });
			case 'lines': return (before, after) => diffLines(before, after, { ignoreCase, ignoreWhitespace });
		}
	}

	async runImpl() {
		this._changes = this.diffFn(this.before.val, this.after.val);
		this.out.val = convertChangesToXML(this._changes);
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

import diffViewer from '@/tools/diff-viewer.vue';
import jsonViewer from '@/tools/json-viewer.vue';

export default [
	makeDef(StringEncodeDecodeTool, 'Encode/Decode', 'String encode/decode'),
	makeDef(TextSplitTool, 'Split', 'Split text'),
	makeDef(RegexMatchTool, 'Regex', 'Regular expression match'),
	makeDef(RegexReplaceTool, 'Replace', 'Regular expression replace'),
	makeDef(InterpolationTool, 'Template', 'String template'),
	makeDef(DiffTool, 'Diff', 'String diff', undefined, diffViewer),
	makeDef(Base64Tool, 'Base64', 'Base64 encoder/decoder'),
	makeDef(JSONDisplayTool, 'JSON display', 'JSON display', undefined, jsonViewer),
];
