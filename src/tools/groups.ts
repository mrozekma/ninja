import { ToolGroup } from '@/types';

import test from '@/tools/test';
import encoding from '@/tools/encoding';

const groups: ToolGroup[] = [{
	name: 'Test',
	icon: 'fas fa-vial',
	tools: test,
}, {
	name: 'Encoding',
	icon: 'fas fa-envelope-open-text',
	tools: encoding,
}];
export default groups;
