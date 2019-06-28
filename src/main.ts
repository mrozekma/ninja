import { ToolManager, ToolInst } from '@/tools';

import Vue from 'vue';
import App from './app.vue';

Vue.config.productionTip = false;

// Add a 'toolManager' prop on every component
const toolManager = new ToolManager();
Vue.mixin({
	computed: {
		toolManager(): ToolManager {
			return toolManager;
		}
	},
});

declare module "vue/types/vue" {
	interface Vue {
		toolManager: ToolManager;
	}
}

new Vue({
	render: h => h(App),
	data: {
		// Including toolManager in the root's data object makes it reactive
		rootToolManager: toolManager,
	},
}).$mount('#app');
