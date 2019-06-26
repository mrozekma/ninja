<template>
	<div class="grid">
		<div v-for="error in errors" @click="selectTool(error.tool)">
			<i v-if="error.tool.state == 'cycle'" class="fas fa-retweet"></i>
			<i v-else class="fas fa-exclamation-triangle"></i>
			<div class="tool">{{ error.tool.name }}<template v-if="error.input">.{{ error.input.name }}</template></div>
			<div>{{ error.error }}</div>
		</div>
	</div>
</template>

<script lang="ts">
	import { RootData } from '@/types';
	import { ToolError, ToolInst } from '@/tools';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		props: {
			errors: Array as PropType<ToolError[]>,
		},
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
		},
		methods: {
			selectTool(tool: ToolInst) {
				this.rootData.selectedTool = tool;
			},
		},
	});
</script>

<style lang="less" scoped>
	.grid {
		display: grid;
		grid-template-columns: auto auto 1fr;
		gap: 5px;
		margin: 5px;

		> div {
			display: contents;
			cursor: pointer;
		}

		i {
			position: relative;
			top: 2px;
		}

		.tool {
			font-weight: bold;
		}
	}
</style>
