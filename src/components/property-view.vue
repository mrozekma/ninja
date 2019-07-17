<template>
	<div class="form">
		<b-message v-if="state.state === 'cycle'" type="is-warning">
			Some of this tool's inputs are part of a circular dependency, so this tool cannot run.
		</b-message>
		<div class="type-and-name">
			<b-field v-if="toolManager.selectedTool" label="Name">
				<b-input :value="toolManager.selectedTool.name" @input="setName($event)"></b-input>
			</b-field>
			<b-field v-if="toolManager.selectedTool" label="Type">
				<b-input :value="toolManager.selectedTool.def.name" disabled></b-input>
			</b-field>
		</div>
		<component v-if="editorComponent" :is="editorComponent" :tool="toolManager.selectedTool"></component>
	</div>
</template>

<script lang="ts">
	import { ToolInst, ToolState, ToolDef } from '@/tools';
	import groups from '@/tools/groups';

	function defToViewName(def: ToolDef) {
		return 'tool-editor-' + def.name.toLowerCase().replace(/[^-a-z-]/g, '-');
	}

	const editors: {[K: string]: (() => Promise<any>)} = {
		'tool-auto-editor': () => import('@/tools/auto-editor.vue'),
	};
	for(const group of groups) {
		for(const def of group.tools) {
			if(def.editor) {
				editors[defToViewName(def)] = def.editor;
			}
		}
	}

	interface State {
		state?: ToolState;
		error?: string;
	}

	import Vue from 'vue';
	export default Vue.extend({
		components: editors,
		computed: {
			editorComponent(): string | undefined {
				const tool = this.toolManager.selectedTool;
				return !tool ? undefined : tool.def.editor ? defToViewName(tool.def) : 'tool-auto-editor';
			},
			state(): State {
				const tool = this.toolManager.selectedTool;
				return !tool ? {} : { state: tool.state, error: tool.error }
			},
		},
		methods: {
			setName(name: string) {
				//TODO Handle name collisions
				this.toolManager.selectedTool!.name = name;
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

		/deep/ .is-loading:not(.field) input {
			background: linear-gradient(-45deg, @stripe 25%, transparent 25%, transparent 50%, @stripe 50%, @stripe 75%, transparent 75%, transparent) top/@stripeSize @stripeSize #fff;
			animation: stripe-animation 1s linear infinite;
			// background: red !important;
		}

		@keyframes stripe-animation {
			from { background-position: @stripeSize 0; }
			to { background-position: 0 0; }
		}

		> article {
			margin: 10px;
		}
	}
</style>
