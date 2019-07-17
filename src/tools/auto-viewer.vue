<template>
	<div class="auto-viewer">
		<tool-field v-for="output in outputs" :key="output.name" :io="output"></tool-field>
	</div>
</template>

<script lang="ts">
	import { Output, ToolInst } from '@/tools';

	import Vue, { PropType } from 'vue';
	import ToolFieldComponent from '@/components/tool-field.vue';
	export default Vue.extend({
		components: { ToolField: ToolFieldComponent },
		props: {
			tool: Object as PropType<ToolInst>,
		},
		computed: {
			outputs(): Readonly<Output[]> {
				return this.tool ? this.tool.outputs : [];
			},
		},
	});
</script>

<style lang="less" scoped>
	.auto-viewer {
		display: flex;
		flex-wrap: wrap;

		> * {
			flex: 1 0 auto;
			margin: 10px;

		}
	}
</style>
