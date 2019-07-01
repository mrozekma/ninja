<template>
	<div class="form">
		<watch-field v-for="io in watched" :key="`${io.tool.name}.${io.name}`" :io="io"></watch-field>
	</div>
</template>

<script lang="ts">
	import { ToolInst, Input, Output } from '@/tools';

	import Vue, { PropType } from 'vue';
	import WatchFieldComponent from '@/components/watch-field.vue';
	export default Vue.extend({
		components: { WatchField: WatchFieldComponent },
		props: {
			watched: Array as PropType<(Input | Output)[]>,
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
