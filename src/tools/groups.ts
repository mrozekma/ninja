import { ToolGroup } from '@/types';

import inputs from '@/tools/inputs';

const groups: ToolGroup[] = [
	{
		name: 'Inputs',
		icon: 'far fa-keyboard',
		tools: inputs,
	}
];
export default groups;
