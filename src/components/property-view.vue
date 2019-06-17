<template>
	<div>
		property view ({{ editorComponent }})
		<hr>
		<component v-if="editorComponent" :is="editorComponent"></component>
	</div>
</template>

<script lang="ts">
	import { ToolInst, RootData } from '@/types';
	import groups from '@/tools/groups';

	const editors: {[K: string]: (() => Promise<any>)} = {
		//@ts-ignore
		'tool-auto-editor': () => import('@/tools/auto-form.vue'),
	};
	for(const group of groups) {
		for(const def of group.tools) {
			if(def.editor) {
				editors[`tool-editor:${def.name}`] = def.editor;
			}
		}
	}

	import Vue from 'vue';
	export default Vue.extend({
		components: {...editors},
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			editorComponent(): string | undefined {
				const tool = this.rootData.selectedTool!;
				return !tool ? undefined : tool.def.editor ? `tool-editor:${tool.def.name}` : 'tool-auto-editor';
			},
		},
	});
</script>
