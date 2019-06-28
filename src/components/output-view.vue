<template>
	<b-message v-if="message !== undefined" :type="message.type">
		{{ message.text }}
	</b-message>
	<fieldset v-else class="form" disabled>
		<b-field v-for="output in outputs" :key="output.name" :class="{wide: (output.type == 'text')}">
			<template slot="label">
				{{ output.description }}
				<b-tag type="is-primary">{{ output.name }}</b-tag>
			</template>
			<tool-io :input="output"></tool-io>
		</b-field>
	</fieldset>
</template>

<script lang="ts">
	//TODO Global outputs when no tool selected
	//TODO Allow copying outputs, changing display format
	import { Output, ToolState } from '@/tools';

	import Vue from 'vue';
	import ToolIOComponent from '@/components/tool-io.vue';
	export default Vue.extend({
		components: { ToolIo: ToolIOComponent },
		computed: {
			outputs(): Output[] {
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
					case ToolState.running: return { type: 'is-info', text: "Running..." };
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

		.tag {
			margin-left: 10px;
		}

		> .field {
			flex: 1 0 auto;
			margin: 10px;

			&.wide {
				flex: 1 0 calc(100% - 20px);
			}
		}
	}
</style>
