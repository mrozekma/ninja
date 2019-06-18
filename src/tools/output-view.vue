<template>
	<div class="form">
		<b-field v-for="output in outputs" :key="output.name" :label="output.name" :class="{wide: (output.type == 'text')}">
			<b-input v-if="output.type == 'string'" :value="output.val" readonly></b-input>
			<b-input v-else-if="output.type == 'text'" type="textarea" :value="output.val" readonly></b-input>
			<b-switch v-else-if="output.type == 'boolean'" :value="output.val" readonly>{{ output.val ? "Enabled" : "Disabled" }}</b-switch>
			<b-numberinput v-else-if="output.type == 'number'" :value="output.val" readonly></b-numberinput>
			<b-select v-else-if="output.type == 'enum'" :value="output.val" readonly>
				<option v-for="option in output.options" :value="option">{{ option }}</option>
			</b-select>
		</b-field>
	</div>
</template>

<script lang="ts">
	//TODO Global outputs when no tool selected
	import { RootData, Output } from '../types';

	import Vue from 'vue';
	export default Vue.extend({
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			outputs(): Output[] {
				const tool = this.rootData.selectedTool;
				return tool ? tool.outputs : [];
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
