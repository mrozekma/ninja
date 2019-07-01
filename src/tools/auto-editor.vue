<template>
	<div class="form">
		<tool-field v-for="input in inputs" :key="input.name" :io="input"></tool-field>
	</div>
</template>

<script lang="ts">
	import { Input } from '@/tools';

	import Vue from 'vue';
	import ToolFieldComponent from '@/components/tool-field.vue';
	export default Vue.extend({
		components: { ToolField: ToolFieldComponent },
		computed: {
			inputs(): Readonly<Input[]> {
				const tool = this.toolManager.selectedTool;
				return tool ? tool.inputs : [];
			},
		},
	});
</script>

<style lang="less" scoped>
	.form {
		display: flex;
		flex-wrap: wrap;

		> * {
			flex: 1 0 auto;
			margin: 10px;
		}
	}
</style>
