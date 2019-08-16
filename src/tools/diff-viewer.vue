<template>
	<div class="viewer">
		<!-- Whitespace-sensitive: -->
		<span v-for="{ value, added, removed } in changes" :class="['diff', {'diff-added': added, 'diff-removed': removed}]">{{ value }}</span>
	</div>
</template>

<script lang="ts">
	import { DiffTool } from '@/tools/text';

	import { Change } from 'diff';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		props: {
			tool: Object as PropType<DiffTool>,
		},
		computed: {
			changes(): Readonly<Change[]> {
				return this.tool.changes;
			},
		},
	});
</script>

<style lang="less" scoped>
	.viewer {
		margin: 10px;
	}
	.diff {
		white-space: pre;
		&.diff-added {
			color: hsl(141, 71%,  48%);
			// text-emphasis: filled dot currentColor;
		}
		&.diff-removed {
			color: hsl(348, 100%, 61%);
			// text-emphasis: filled dot currentColor;
		}
	}
</style>
