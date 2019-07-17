<template>
	<div class="form">
		<b-message v-if="message !== undefined" :type="message.type">
			{{ message.text }}
		</b-message>
		<component v-else-if="viewerComponent" :is="viewerComponent" :tool="toolManager.selectedTool"></component>
	</div>
</template>

<script lang="ts">
	//TODO Allow copying outputs
	import { ToolInst, ToolDef } from '@/tools';
	import groups from '@/tools/groups';

	function defToViewName(def: ToolDef) {
		return 'tool-viewer-' + def.name.toLowerCase().replace(/[^-a-z-]/g, '-');
	}

	const viewers: {[K: string]: (() => Promise<any>)} = {
		'tool-auto-viewer': () => import('@/tools/auto-viewer.vue'),
	};
	for(const group of groups) {
		for(const def of group.tools) {
			if(def.viewer) {
				viewers[defToViewName(def)] = def.viewer;
			}
		}
	}

	import Vue from 'vue';
	export default Vue.extend({
		components: viewers,
		computed: {
			viewerComponent(): string | undefined {
				const tool = this.toolManager.selectedTool;
				return !tool ? undefined : tool.def.viewer ? defToViewName(tool.def) : 'tool-auto-viewer';
			},
			message(): ToolInst["stateInfo"] {
				const tool = this.toolManager.selectedTool;
				return tool ? tool.stateInfo : undefined;
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
