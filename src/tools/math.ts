import { ToolInst, makeDef, NumberInput, Input } from '@/tools';

//@ts-ignore No declaration file
import infix from 'infix';

class CalcTool extends ToolInst {
	private expr = this.makeStringInput('expr', 'Expression');
	private vars: NumberInput[] = [];
	private out = this.makeNumberOutput('out', 'Output');

	protected onInputSet(input: Input) {
		if(input === this.expr) {
			const vars = input.val.match(/\$([a-z]+)/g) || [];
			const inputs = new Map<string, { input: NumberInput, count: number }>(
				// Start with all the existing inputs
				this.vars.map(v => [ v.name, { input: v, count: 0 } ])
			);
			this.vars = vars.map<NumberInput>(v => {
				const name = v.substr(1);
				const entry = inputs.get(name);
				if(entry !== undefined) {
					// If an input for this name exists, use it
					entry.count++;
					return entry.input;
				} else {
					// Otherwise make a new input
					const input = this.makeNumberInput(name, v);
					inputs.set(name, { input, count: 1 });
					return input;
				}
			});
			this.allInputs = [ this.expr ];
			for(const [ name, { input, count }] of inputs) {
				if(count == 0) {
					//TODO Want to disconnect anything connected to this input, but no ToolManager available here.
					// A constant connected to this input will end up orphaned
				} else {
					this.allInputs.push(input);
				}
			}
		}
	}

	async runImpl() {
		let index = 0;
		const expr = this.expr.val.replace(/\$[a-z]+/g, () => '$' + index++);

		this.out.val = infix.evaluate(expr, infix.nativeNumberProvider, ...this.vars.map(inp => inp.val));
	}
}

export default [
	makeDef(CalcTool, 'Calc', 'Calculate a mathematical expression'),
];
