<template>
	<div>
		<b-input v-if="search !== undefined" ref="search" type="search" v-model="search" icon="search" placeholder="Search" @blur="closeSearchIfEmpty" @keydown.native.esc="closeSearchIfEmpty"></b-input>
		<template v-if="search">
			<div v-for="tool in searchResults" :key="tool.name" class="tool" @mousedown="selectTool(tool)">
				{{ tool.name }}
			</div>
		</template>
		<template v-else v-for="group in groups">
			<div :key="`header-${group.name}`" class="header" @mousedown="group.expanded = !group.expanded">
				<i :class="['fas', group.expanded ? 'fa-minus' : 'fa-plus']"></i>
				<i :class="group.icon"></i> {{ group.name }}
			</div>
			<div v-if="group.expanded" :key="`group-${group.name}`" :ref="`group-${group.name}`">
				<div v-for="tool in group.tools" :key="tool.name" v-tooltip.left="tool.description" class="tool" @mousedown="selectTool(tool)">
					{{ tool.name }}
				</div>
			</div>
		</template>
	</div>
</template>

<script lang="ts">
	import toolGroups, { ToolGroup } from '@/tools/groups';
	import { ToolDef } from '@/tools';

	interface ToolGroupGUI extends ToolGroup {
		expanded: boolean;
	}

	import Vue from 'vue'
	export default Vue.extend({
		computed: {
			searchResults(): ToolDef[] | undefined {
				if(this.search === undefined) {
					return undefined;
				}
				const search = new RegExp(this.search, 'i');
				//TODO Fuzzy match?
				return this.groups
					.flatMap(group => group.tools)
					.filter(def => search.test(def.name) || search.test(def.description))
					.sort((def1, def2) => def1.name < def2.name ? -1 : def1.name > def2.name ? 1 : 0);
			},
		},
		data() {
			const groups = toolGroups.map<ToolGroupGUI>(group => ({
				...group,
				expanded: false,
			}));

			return {
				groups,
				search: undefined as string | undefined,
			};
		},
		methods: {
			selectTool(def: ToolDef) {
				this.toolManager.selectedTool = this.toolManager.addTool(def);
			},
			closeSearchIfEmpty() {
				if(this.search == '') {
					this.search = undefined;
				}
			},
			async enableSearch() {
				if(this.search === undefined) {
					this.search = '';
				}
				await this.$nextTick();
				(this.$refs.search as HTMLInputElement).focus();
			},
			disableSearch() {
				this.search = undefined;
			},
			toggleSearch() { // Called externally by app
				if(this.search === undefined) {
					this.enableSearch();
				} else {
					this.disableSearch();
				}
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
