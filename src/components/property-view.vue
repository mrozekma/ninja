<template>
	<!-- TODO Scroll -->
	<div class="form">
		<b-field v-if="rootData.selectedTool" label="name">
			<b-input :value="rootData.selectedTool.name" @input="setName($event)"></b-input>
		</b-field>
		<component v-if="editorComponent" :is="editorComponent"></component>
	</div>
</template>

<script lang="ts">
	import { ToolInst, RootData } from '@/types';
	import groups from '@/tools/groups';

	const editors: {[K: string]: (() => Promise<any>)} = {
		//@ts-ignore
		'tool-auto-editor': () => import('@/tools/auto-editor.vue'),
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
		components: editors,
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			editorComponent(): string | undefined {
				const tool = this.rootData.selectedTool;
				return !tool ? undefined : tool.def.editor ? `tool-editor:${tool.def.name}` : 'tool-auto-editor';
			},
		},
		methods: {
			setName(name: string) {
				this.rootData.selectedTool!.name = name;
			}
		},
	});
</script>

<style lang="less" scoped>
	.form > .field {
		margin: 10px;
	}
</style>
