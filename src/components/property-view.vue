<template>
	<!-- TODO Scroll -->
	<div class="form">
		<div class="type-and-name">
			<b-field v-if="rootData.selectedTool" label="Name">
				<b-input :value="rootData.selectedTool.name" @input="setName($event)"></b-input>
			</b-field>
			<b-field v-if="rootData.selectedTool" label="Type">
				<b-input :value="rootData.selectedTool.def.name" disabled></b-input>
			</b-field>
		</div>
		<component v-if="editorComponent" :is="editorComponent"></component>
	</div>
</template>

<script lang="ts">
	//TODO Tool deletion
	import { RootData } from '@/types';
	import { ToolInst } from '@/tools';
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
				//TODO Handle name collisions
				this.rootData.selectedTool!.name = name;
			}
		},
	});
</script>

<style lang="less" scoped>
	.form {
		.type-and-name {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 10px;
			margin: 10px 10px 0 10px;
		}

		@stripe: #eee;
		@stripeSize: 40px;

		/deep/ .is-loading:not(.field) {
			background: linear-gradient(-45deg, @stripe 25%, transparent 25%, transparent 50%, @stripe 50%, @stripe 75%, transparent 75%, transparent) top/@stripeSize @stripeSize #fff;
			animation: stripe-animation 1s linear infinite;
		}

		@keyframes stripe-animation {
			from { background-position: @stripeSize 0; }
			to { background-position: 0 0; }
		}
	}
</style>
