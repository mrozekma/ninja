<template>
	<b-message v-if="message !== undefined" :type="message.type">
		{{ message.text }}
	</b-message>
	<div v-else class="form">
		<tool-field v-for="output in outputs" :key="output.name" :io="output"></tool-field>
	</div>
</template>

<script lang="ts">
	//TODO Global outputs when no tool selected
	//TODO Allow copying outputs, changing display format
	import { Output, ToolState } from '@/tools';

	import Vue from 'vue';
	import ToolFieldComponent from '@/components/tool-field.vue';
	export default Vue.extend({
		components: { ToolField: ToolFieldComponent },
		computed: {
			outputs(): Readonly<Output[]> {
				const tool = this.toolManager.selectedTool;
				return tool ? tool.outputs : [];
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
	article {
		margin: 10px;
	}

	.form {
		display: flex;
		flex-wrap: wrap;

		> * {
			flex: 1 0 auto;
			margin: 10px;

		}
	}
</style>
