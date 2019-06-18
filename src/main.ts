import { RootData } from '@/types';
import { ToolInst } from '@/tools'
import Vue from 'vue';
import App from './app.vue';

Vue.config.productionTip = false;

const tools: ToolInst[] = [
	// {
	// 	name: 'Foo',
	// 	loc: {x: 30, y: 100},
	// 	inputs: [],
	// 	outputs: [],
	// },
	// {
	// 	name: 'Bar',
	// 	loc: {x: 120, y: 250},
	// 	inputs: [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}],
	// 	outputs: [],
	// },
	// {
	// 	name: 'Baz',
	// 	loc: {x: 150, y: 100},
	// 	inputs: [{name: 'foo'}, {name: 'bar'}],
	// 	outputs: [{name: 'baz'}],
	// },
];

const rootData: RootData = {
	tools,
	selectedTool: undefined as ToolInst | undefined,
};

new Vue({
	render: h => h(App),
	data: rootData,
}).$mount('#app')
