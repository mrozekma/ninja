<template>
	<fieldset class="form" disabled>
		<b-field v-for="output in outputs" :key="output.name" :class="{wide: (output.type == 'text')}">
			<template slot="label">
				{{ output.description }}
				<b-tag type="is-primary">{{ output.name }}</b-tag>
			</template>
			<b-input v-if="output.type == 'string'" :value="output.val"></b-input>
			<b-input v-else-if="output.type == 'text'" type="textarea" :value="output.val"></b-input>
			<b-switch v-else-if="output.type == 'boolean'" :value="output.val">{{ output.val ? "Enabled" : "Disabled" }}</b-switch>
			<b-numberinput v-else-if="output.type == 'number'" :value="output.val"></b-numberinput>
			<b-select v-else-if="output.type == 'enum'" :value="output.val">
				<option v-for="option in output.options" :value="option">{{ option }}</option>
			</b-select>
		</b-field>
	</fieldset>
</template>

<script lang="ts">
	//TODO Global outputs when no tool selected
	//TODO Allow copying outputs, changing display format
	import { RootData } from '@/types';
	import { Output } from '@/tools';

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
