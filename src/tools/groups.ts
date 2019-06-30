import { ToolDef } from '@/tools';

export interface ToolGroup {
	name: string;
	icon: string;
	tools: ToolDef[];
}

import test from '@/tools/test';
import text from '@/tools/text';
import encoding from '@/tools/encoding';
import crypto from '@/tools/crypto';

const groups: ToolGroup[] = [{
	name: 'Test',
	icon: 'fas fa-vial',
	tools: test,
}, {
	name: 'Text',
	icon: 'fas fa-envelope-open-text',
	tools: text,
}, {
	name: 'Encoding',
	icon: 'fab fa-creative-commons-zero',
	tools: encoding,
}, {
	name: 'Crypto',
	icon: 'fas fa-lock',
	tools: crypto,
}];
export default groups;
