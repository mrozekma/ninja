<template>
	<div class="form">
		<b-field v-for="input in inputs" :key="input.name" :label="input.name" :class="{wide: (input.type == 'text')}">
			<b-input v-if="input.type == 'string'" :value="input.val" @input="set(input.name, $event)"></b-input>
			<b-input v-else-if="input.type == 'text'" type="textarea" :value="input.val" @input="set(input.name, $event)"></b-input>
			<b-switch v-else-if="input.type == 'boolean'" :value="input.val" @input="set(input.name, $event)">{{ input.val ? "Enabled" : "Disabled" }}</b-switch>
			<b-numberinput v-else-if="input.type == 'number'" :min="input.min" :max="input.max" :value="input.val" @input="set(input.name, $event)"></b-numberinput>
			<b-select v-else-if="input.type == 'enum'" :value="input.val" @input="set(input.name, $event)">
				<option v-for="option in input.options" :value="option">{{ option }}</option>
			</b-select>
		</b-field>
	</div>
</template>

<script lang="ts">
	import { RootData } from '@/types';
	import { Input } from '@/tools';

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
				this.rootData.selectedTool!.setInput(inputName, value);
			},
		},
	});
</script>

<style lang="less" scoped>
	.form {
		display: flex;
		flex-wrap: wrap;

		> .field {
			flex: 1 0 auto;
			margin: 10px;

			&.wide {
				flex: 1 0 calc(100% - 20px);
			}
		}
	}
</style>
