<template>
	<div class="form">
		<b-field v-for="input in inputs" :key="input.name" :class="{wide: (input.type == 'text'), 'is-loading': !!(input.connection && !input.connection.upToDate)}">
			<template slot="label">
				{{ input.description }}
				<b-tag type="is-primary">{{ input.name }}</b-tag>
				<b-tag v-if="input.connection" type="is-primary">
					<i class="fas fa-link"></i>
					Connected to {{ input.connection.output.tool.name }}.{{ input.connection.output.name }}
				</b-tag>
				<b-tag v-else type="is-primary">
					<i class="fas fa-unlink"></i>
					Constant
				</b-tag>
			</template>
			<b-input v-if="input.type == 'string'" :value="input.val" @input="set(input.name, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined"></b-input>
			<b-input v-else-if="input.type == 'text'" type="textarea" :value="input.val" @input="set(input.name, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined"></b-input>
			<b-switch v-else-if="input.type == 'boolean'" :value="input.val" @input="set(input.name, $event)" :disabled="input.connection !== undefined">{{ (input.connection && !input.connection.upToDate) ? "Loading..." : input.val ? "Enabled" : "Disabled" }}</b-switch>
			<b-numberinput v-else-if="input.type == 'number'" :min="input.min" :max="input.max" :value="input.val" @input="set(input.name, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined"></b-numberinput>
			<b-select v-else-if="input.type == 'enum'" :value="input.val" @input="set(input.name, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined">
				<option v-for="option in input.options" :value="option">{{ option }}</option>
			</b-select>
		</b-field>
	</div>
</template>

<script lang="ts">
	import { RootData } from '@/types';
	import { Input, updateData } from '@/tools';

	import Vue from 'vue';
	export default Vue.extend({
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			inputs(): Input[] {
				const tool = this.rootData.selectedTool;
				return tool ? tool.inputs : [];
			},
		},
		methods: {
			set(inputName: string, value: any) {
				const input = this.rootData.selectedTool!.setInput(inputName, value);
				updateData(this.rootData.tools, input);
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
</style>
