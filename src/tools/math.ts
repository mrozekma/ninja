import { ToolInst, makeDef, NumberInput, Input } from '@/tools';
import { TemplateExprTool } from './text';

//@ts-ignore No declaration file
import infix from 'infix';

class CalcTool extends TemplateExprTool<NumberInput> {
	private out = this.makeNumberOutput('out', 'Output');

	makeInput = this.makeNumberInput;

	async runImpl() {
		const expr = this.expr.val.replace(TemplateExprTool.re, (match, name1, name2) => {
			const name = name1 || name2;
			return '' + this.vars.get(name)!.input.val;
		});
		this.out.val = infix.evaluate(expr, infix.nativeNumberProvider);
	}
}

export default [
	makeDef(CalcTool, 'Calc', 'Calculate a mathematical expression'),
];
