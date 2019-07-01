<template>
	<b-field>
		<template slot="label">
			<span class="clickable" @click="selectTool(io.tool)">{{ io.tool.name }}.{{ io.name }}</span>
			<b-tag v-if="io.io == 'input'" type="is-primary"><i class="fas fa-sign-in-alt"></i> Input</b-tag>
			<b-tag v-else-if="io.io == 'output'" type="is-primary"><i class="fas fa-sign-out-alt"></i> Output</b-tag>
			<span class="clickable" @click="io.watch = false"><b-tag type="is-primary"><i class="fas fa-eye-slash"></i></b-tag></span>
			<b-numberinput v-if="arrayLen !== undefined" controls-position="compact" size="is-small" :min="0" :max="arrayLen - 1" v-model="arrayIdx"></b-numberinput>
		</template>
		<tool-io :io="io" :arrayIdx="(arrayLen !== undefined) ? arrayIdx : undefined" :renderAsWatch="true"></tool-io>
	</b-field>
</template>

<script lang="ts">
	import { Input, Output, ToolState, ToolInst } from '@/tools';

	import Vue, { PropType } from 'vue';
	import ToolIOComponent from '@/components/tool-io.vue';
	export default Vue.extend({
		components: { ToolIo: ToolIOComponent },
		props: {
			io: Object as PropType<Input | Output>,
		},
		computed: {
			arrayLen(): number | undefined {
				return Array.isArray(this.io.val) ? this.io.val.length : undefined;
			},
		},
		data() {
			return {
				arrayIdx: 0,
			};
		},
		watch: {
			arrayLength() {
				this.arrayIdx = 0;
			},
		},
		methods: {
			selectTool(tool: ToolInst) {
				this.toolManager.selectedTool = tool;
			},
		},
	});
</script>

<style lang="less" scoped>
	.field {
		&.wide {
			flex: 1 0 calc(100% - 20px);
		}

		label > * {
			display: inline-flex;
			margin-left: 10px;
		}
	}

	.clickable {
		cursor: pointer;
	}

	.is-watched {
		color: #fff;
		background-color: #714dd2;
	}

	.dropdown-content i {
		margin-right: 2px;
	}
</style>
