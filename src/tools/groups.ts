import { ToolGroup } from '@/types';

import test from '@/tools/test';
import encoding from '@/tools/encoding';
import crypto from '@/tools/crypto';

const groups: ToolGroup[] = [{
	name: 'Test',
	icon: 'fas fa-vial',
	tools: test,
}, {
	name: 'Encoding',
	icon: 'fas fa-envelope-open-text',
	tools: encoding,
}, {
	name: 'Crypto',
	icon: 'fas fa-lock',
	tools: crypto,
}];
export default groups;
