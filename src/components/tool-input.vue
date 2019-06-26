<template>
	<b-input
		v-if="input.type == 'string'"
		:value="input.val"
		@input="set(input, $event)"
		:loading="loading"
		:disabled="disabled"></b-input>
	<b-input
		v-else-if="input.type == 'text'"
		type="textarea"
		:value="input.val"
		@input="set(input, $event)"
		:loading="loading"
		:disabled="disabled"></b-input>
	<b-switch
		v-else-if="input.type == 'boolean'"
		:value="input.val"
		@input="set(input, $event)"
		:disabled="disabled">
		{{ switchLabel }}
	</b-switch>
	<b-numberinput
		v-else-if="input.type == 'number'"
		:min="input.min"
		:max="input.max"
		:value="input.val"
		@input="set(input, $event)"
		:loading="loading"
		:disabled="disabled"></b-numberinput>
	<b-select v-else-if="input.type == 'enum'"
		:value="input.val"
		@input="set(input, $event)"
		:loading="loading"
		:disabled="disabled">
		<option v-for="option in input.options" :value="option">{{ option }}</option>
	</b-select>
</template>

<script lang="ts">
	import { RootData } from '@/types';
	import { Input } from '@/tools';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		props: {
			input: Object as PropType<Input>,
		},
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			loading(): boolean {
				return !!(this.input.connection && !this.input.connection.upToDate);
			},
			disabled(): boolean {
				return (this.input.connection !== undefined);
			},
			switchLabel(): string | undefined {
				if(this.input.type != 'boolean') {
					return undefined;
				}
				if(this.loading) {
					return "Loading...";
				}
				const [ enabledLabel, disabledLabel ] = this.input.labels || [ 'Enabled', 'Disabled' ];
				return this.input.val ? enabledLabel : disabledLabel;
			},
		},
		methods: {
			set(input: Input, value: any) {
				this.rootData.toolManager.setInput(input, value);
			},
		},
	});
</script>
