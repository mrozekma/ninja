import { ToolDef } from '@/tools';

export interface ToolGroup {
	name: string;
	icon: string;
	tools: ToolDef[];
}

import test from '@/tools/test';
import assert from '@/tools/assert';
import text from '@/tools/text';
import array from '@/tools/array';
import crypto from '@/tools/crypto';
import math from '@/tools/math';

const groups: ToolGroup[] = [{
	name: 'Text',
	icon: 'fas fa-envelope-open-text',
	tools: text,
}, {
	name: 'Array',
	icon: 'far fa-list-alt',
	tools: array,
}, {
	name: 'Crypto',
	icon: 'fas fa-lock',
	tools: crypto,
}, {
	name: 'Math',
	icon: 'fas fa-calculator',
	tools: math,
}, {
	name: 'Assert',
	icon: 'fas fa-equals',
	tools: assert,
}];
if(process.env.NODE_ENV === 'development') {
	groups.unshift({
		name: 'Test',
		icon: 'fas fa-vial',
		tools: test,
	});
}
export default groups;
