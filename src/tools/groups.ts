import { ToolGroup } from '@/types';

import test from '@/tools/test';

const groups: ToolGroup[] = [
	{
		name: 'Test',
		icon: 'fas fa-vial',
		tools: test,
	}
];
export default groups;
