<template>
	<div class="form">
		<b-field v-for="input in inputs" :key="input.name" :class="{wide: (input.type == 'text'), 'is-loading': !!(input.connection && !input.connection.upToDate)}">
			<template slot="label">
				{{ input.description }}
				<b-tag type="is-primary">{{ input.name }}</b-tag>
				<span v-if="input.connection" style="clickable" @click="disconnect(input)">
					<b-tag type="is-primary">
						<i class="fas fa-link"></i>
						Connected to {{ input.connection.output.tool.name }}.{{ input.connection.output.name }}
					</b-tag>
				</span>
			</template>
			<b-message v-if="input.connection && input.connection.error" type="is-danger">
				{{ input.connection.error }}
			</b-message>
			<tool-io v-else :input="input"></tool-io>
		</b-field>
	</div>
</template>

<script lang="ts">
	import { Input } from '@/tools';

	import Vue from 'vue';
	import ToolIOComponent from '@/components/tool-io.vue';
	export default Vue.extend({
		components: { ToolIo: ToolIOComponent },
		computed: {
			inputs(): Readonly<Input[]> {
				const tool = this.toolManager.selectedTool;
				return tool ? tool.inputs : [];
			},
		},
		methods: {
			disconnect(input: Input) {
				this.toolManager.disconnect(input);
			},
		},
	});
</script>

<style lang="less" scoped>
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
</style>
