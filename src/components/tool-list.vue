<template>
	<div>
		<template v-for="group in groups">
			<div :key="`header-${group.name}`" class="header" @click="group.expanded = !group.expanded">
				<i :class="['fas', group.expanded ? 'fa-minus' : 'fa-plus']"></i>
				<i :class="group.icon"></i> {{ group.name }}
			</div>
			<div v-if="group.expanded" :key="`group-${group.name}`" :ref="`group-${group.name}`">
				<div v-for="tool in group.tools" :key="tool.name" class="tool" @click="selectTool(tool)">
					{{ tool.name }}
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
	//TODO Search
	//TODO Expand/collapse animation
	import toolGroups from '@/tools/groups';
	import { ToolGroup, ToolDef, RootData } from '@/types';

	interface ToolGroupGUI extends ToolGroup {
		expanded: boolean;
	}

	import Vue from 'vue'
	export default Vue.extend({
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			}
		},
		data() {
			const groups = toolGroups.map<ToolGroupGUI>(group => ({
				...group,
				expanded: false,
			}));

			return {
				groups,
			};
		},
		methods: {
			selectTool(def: ToolDef) {
				// Find a free name based on the tool name
				const names = new Set(this.rootData.tools.map(tool => tool.name));
				const name: string = (() => {
					if(!names.has(def.name)) {
						return def.name;
					}
					for(let i = 2; ; i++) {
						const name = def.name + i;
						if(!names.has(name)) {
							return name;
						}
					}
				})();
				this.rootData.selectedTool = def.gen(name);
			},
		},
	});
</script>

<style lang="less" scoped>
	.header, .tool {
		border-style: solid;
		border-width: 1px 0;
		padding: 10px;
		cursor: pointer;
	}

	.header {
		border-color: lighten(#363636, 35%);
		background-color: lighten(#363636, 25%);

		i:first-child {
			float: right;
			position: relative;
			top: 5px;
		}
	}

	.tool {
		border-color: lighten(#363636, 45%);
		background-color: lighten(#363636, 35%);
	}
</style>
