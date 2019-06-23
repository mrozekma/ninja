import { RootData } from '@/types';
import { ToolManager, ToolInst } from '@/tools';

import Vue from 'vue';
import App from './app.vue';

Vue.config.productionTip = false;

const rootData: RootData = {
	toolManager: new ToolManager(),
	selectedTool: undefined as ToolInst | undefined,
};

new Vue({
	render: h => h(App),
	data: rootData,
}).$mount('#app');
