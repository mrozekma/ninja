<template>
	<b-input
		v-if="innerType == 'string' || (renderAsWatch && innerType == 'enum')"
		type="textarea"
		:rows="1"
		:value="val"
		ref="textarea"
		@input="scaleText($event); set($event)"
		:loading="loading"
		:disabled="disabled"></b-input>
	<b-switch
		v-else-if="innerType == 'boolean'"
		:value="val"
		@input="set($event)"
		:disabled="disabled">
		{{ switchLabel }}
	</b-switch>
	<div class="number-with-radix" v-else-if="renderAsWatch && innerType == 'number'">
		<div>
			<b-tag type="is-info">Dec</b-tag>
			<b-input :value="val"></b-input>
		</div>
		<div>
			<b-tag type="is-info">Hex</b-tag>
			<b-input :value="'0x' + val.toString(16)"></b-input>
		</div>
	</div>
	<b-numberinput
		v-else-if="innerType == 'number'"
		:min="io.min"
		:max="io.max"
		:value="val"
		@input="set($event)"
		:loading="loading"
		:disabled="disabled"></b-numberinput>
	<b-select v-else-if="innerType == 'enum'"
		:value="val"
		@input="set($event)"
		:loading="loading"
		:disabled="disabled">
		<option v-for="option in io.options" :value="option">{{ option }}</option>
	</b-select>
</template>

<script lang="ts">
	import { Input, Output, IOValTypes, ToolState } from '@/tools';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		props: {
			io: Object as PropType<Input | Output>,
			arrayIdx: Number as PropType<number | undefined>,
			renderAsWatch: {
				type: Boolean,
				default: false,
			},
		},
		computed: {
			innerType() {
				return this.io.type.replace(/\[\]$/, '');
			},
			val(): IOValTypes {
				return (this.arrayIdx === undefined) ? this.io.val : (this.io.val as any[])[this.arrayIdx];
			},
			loading(): boolean {
				switch(this.io.io) {
					case 'input': return (this.io.connection !== undefined) && !this.io.connection.upToDate;
					case 'output': return (this.io.tool.state == ToolState.stale) || (this.io.tool.state == ToolState.running);
				}
			},
			disabled(): boolean {
				return this.renderAsWatch || this.io.io != 'input' || this.io.connection !== undefined;
			},
			switchLabel(): string | undefined {
				if(this.io.type != 'boolean') {
					return undefined;
				}
				if(this.loading) {
					return "Loading...";
				}
				const [ enabledLabel, disabledLabel ] = this.io.labels || [ 'Enabled', 'Disabled' ];
				return this.io.val ? enabledLabel : disabledLabel;
			},
		},
		mounted() {
			if(this.io.type == 'string') {
				this.scaleText();
			}
		},
		updated() {
			if(this.io.type == 'string') {
				this.scaleText();
			}
		},
		methods: {
			set(value: IOValTypes) {
				this.toolManager.setInputVal(this.io as Input, value);
			},
			scaleText() {
				const el = (this.$refs.textarea as Vue).$el as HTMLTextAreaElement;
				console.log(el);
				el.style.height = 'auto';
				el.style.height = `${el.scrollHeight + 2}px`;
			},
		},
	});
</script>

<style lang="less" scoped>
	.control /deep/ textarea {
		min-height: 0;
		max-height: 200px;
	}

	.number-with-radix {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 5px;
		> div {
			position: relative;
			.tag {
				position: absolute;
				top: 6px;
				left: 6px;
				z-index: 2;
			}
			/deep/ input {
				padding-left: 50px;
			}
		}
	}
</style>
