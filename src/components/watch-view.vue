<template>
	<fieldset v-else class="form" disabled>
		<b-field v-for="io in watched" :key="`${io.tool.name}.${io.name}`">
			<template slot="label">
				<span class="clickable" @click="selectTool(io.tool)">{{ io.tool.name }}.{{ io.name }}</span>
				<b-tag v-if="io.io == 'input'" type="is-primary"><i class="fas fa-sign-in-alt"></i> Input</b-tag>
				<b-tag v-else-if="io.io == 'output'" type="is-primary"><i class="fas fa-sign-out-alt"></i> Output</b-tag>
				<span class="clickable" @click="io.watch = false"><b-tag type="is-primary"><i class="fas fa-eye-slash"></i></b-tag></span>
			</template>
			<tool-io :io="io" :renderAsWatch="true"></tool-io>
		</b-field>
	</fieldset>
</template>

<script lang="ts">
	import { ToolInst, Input, Output } from '@/tools';

	import Vue, { PropType } from 'vue';
	import ToolIOComponent from '@/components/tool-io.vue';
	export default Vue.extend({
		components: { ToolIo: ToolIOComponent },
		props: {
			watched: Array as PropType<(Input | Output)[]>,
		},
		methods: {
			selectTool(tool: ToolInst) {
				this.toolManager.selectedTool = tool;
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

		@stripe: #eee;
		@stripeSize: 40px;

		.field {
			/deep/ .is-loading {
				/deep/ textarea, /deep/ input {
					background: linear-gradient(-45deg, @stripe 25%, transparent 25%, transparent 50%, @stripe 50%, @stripe 75%, transparent 75%, transparent) top/@stripeSize @stripeSize #fff;
					animation: stripe-animation 1s linear infinite;
				}
			}
		}

		@keyframes stripe-animation {
			from { background-position: @stripeSize 0; }
			to { background-position: 0 0; }
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
