<template>
	<b-field :class="{wide: (io.type == 'string')}">
		<template slot="label">
			{{ io.description }}
			<b-tag v-if="!io.watch" type="is-primary">{{ io.name }}</b-tag>
			<span v-else @click="io.watch = false">
				<b-tag class="is-watched clickable"><i class="fas fa-eye"></i> {{ io.name }}</b-tag>
			</span>
			<b-dropdown>
				<b-tag slot="trigger" type="is-primary" class="clickable">
					<i class="fas fa-caret-down"></i>
				</b-tag>
				<b-dropdown-item v-if="!io.watch" @click="io.watch = true"><i class="fas fa-eye"></i> Watch</b-dropdown-item>
				<b-dropdown-item v-else @click="io.watch = false"><i class="fas fa-eye-slash"></i> Unwatch</b-dropdown-item>
			</b-dropdown>
			<b-numberinput v-if="arrayLen !== undefined" controls-position="compact" size="is-small" :min="0" :max="arrayLen - 1" v-model="arrayIdx"></b-numberinput>
		</template>
		<tool-io :io="io" :arrayIdx="(arrayLen !== undefined) ? arrayIdx : undefined"></tool-io>
	</b-field>
</template>

<script lang="ts">
	//TODO Merge auto-editor version into this
	import { Input, Output, ToolState } from '@/tools';

	interface AnnotatedOutput {
		output: Output;
		arrayInfo?: {
			idx: number;
			len: number;
		}
	}

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
	});
</script>

<style lang="less" scoped>
	.field {
		.wide {
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
