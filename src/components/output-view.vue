<template>
	<div class="form">
		<b-message v-if="message !== undefined" :type="message.type">
			{{ message.text }}
		</b-message>
		<component v-if="viewerComponent" :is="viewerComponent" :tool="toolManager.selectedTool"></component>
	</div>
</template>

<script lang="ts">
	//TODO Allow copying outputs
	import { ToolState } from '@/tools';
	import groups from '@/tools/groups';

	const viewers: {[K: string]: (() => Promise<any>)} = {
		'tool-auto-viewer': () => import('@/tools/auto-viewer.vue'),
	};
	for(const group of groups) {
		for(const def of group.tools) {
			if(def.viewer) {
				viewers[`tool-viewer:${def.name}`] = def.viewer;
			}
		}
	}

	import Vue from 'vue';
	export default Vue.extend({
		components: viewers,
		computed: {
			viewerComponent(): string | undefined {
				const tool = this.toolManager.selectedTool;
				return !tool ? undefined : tool.def.viewer ? `tool-viewer:${tool.def.name}` : 'tool-auto-viewer';
			},
			message(): { type: string; text: string } | undefined {
				const tool = this.toolManager.selectedTool;
				if(!tool) {
					return undefined;
				}
				switch(tool.state) {
					case ToolState.good: return undefined;
					case ToolState.badInputs: return { type: 'is-danger', text: "Invalid inputs prevented this tool from running." };
					case ToolState.failed: return { type: 'is-danger', text: `This tool failed to run: ${tool.error}.` };
					case ToolState.cycle: return { type: 'is-warning', text: "A circular dependency prevented this tool from running." };
				}
			},
		},
	});
</script>

<style lang="less" scoped>
	.form {
		article {
			margin: 10px;
		}
	}
</style>
