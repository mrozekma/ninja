import { ToolManager } from '@/tools';
import settings, { Settings } from '@/settings';

import Vue from 'vue';
import App from './app.vue';

// string.matchAll() is new enough that it seems worth polyfilling
require('string.prototype.matchall').shim();

Vue.config.productionTip = false;

// Add 'toolManager' and 'settings' props on every component
const toolManager = new ToolManager();
Vue.mixin({
	computed: {
		toolManager(): ToolManager {
			return toolManager;
		},
		settings(): Settings {
			return settings;
		},
	},
});

declare module "vue/types/vue" {
	interface Vue {
		toolManager: ToolManager;
		settings: Settings;
	}
}

new Vue({
	render: h => h(App),
	data: {
		// Including these in the root's data object makes them reactive
		rootToolManager: toolManager,
		rootSettings: settings,
	},
}).$mount('#app');
