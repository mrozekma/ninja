<template>
	<b-message v-if="message !== undefined" :type="message.type">
		{{ message.text }}
	</b-message>
	<fieldset v-else class="form" disabled>
		<b-field v-for="output in outputs" :key="output.name" :class="{wide: (output.type == 'string')}">
			<template slot="label">
				{{ output.description }}
				<b-tag v-if="!output.watch" type="is-primary">{{ output.name }}</b-tag>
				<span v-else @click="output.watch = false">
					<b-tag class="is-watched clickable"><i class="fas fa-eye"></i> {{ output.name }}</b-tag>
				</span>
				<b-dropdown>
					<b-tag slot="trigger" type="is-primary" class="clickable">
						<i class="fas fa-caret-down"></i>
					</b-tag>
					<b-dropdown-item v-if="!output.watch" @click="output.watch = true"><i class="fas fa-eye"></i> Watch</b-dropdown-item>
					<b-dropdown-item v-else @click="output.watch = false"><i class="fas fa-eye-slash"></i> Unwatch</b-dropdown-item>
				</b-dropdown>
			</template>
			<tool-io :io="output"></tool-io>
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
					case ToolState.stale: return { type: 'is-info', text: "Pending..." }; //TODO Remove once the pending indicator is in the panel <h1>
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

	.clickable {
		cursor: pointer;
	}

	.is-watched {
		color: #fff;
		background-color: #714dd2;
	}

	.dropdown-content i {
		margin-right: 2px;
	}
</style>
