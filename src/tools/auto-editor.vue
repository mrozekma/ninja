<template>
	<div class="auto-editor">
		<tool-field ref="fields" v-for="(input, idx) in tool.inputs" :key="input.name" :io="input" :mnemonic="mnemonics[idx]"></tool-field>
	</div>
</template>

<script lang="ts">
	import hotkeys from 'hotkeys-js';

	import { Input, ToolInst } from '@/tools';

	import Vue, { PropType } from 'vue';
	import ToolFieldComponent from '@/components/tool-field.vue';
	export default Vue.extend({
		components: { ToolField: ToolFieldComponent },
		props: {
			tool: Object as PropType<ToolInst>,
		},
		computed: {
			mnemonics(): string {
				//TODO Smarter algorithm that scores letters so early fields can't take a letter that would've been better on a later field
				// Alt+d is used by browsers to go to the address bar. Alt+n is used by property-view for the Name field
				const reserved = 'dn';
				return this.tool.inputs.reduce((mnemonics: string, input: Input) => {
					const description = input.description.toLowerCase();
					for(let i = 0; i < description.length; i++) {
						if(description.charCodeAt(i) >= 0x61 && description.charCodeAt(i) <= 0x7a) {
							if(reserved.indexOf(description[i]) == -1 && mnemonics.indexOf(description[i]) == -1) {
								return mnemonics + description[i];
							}
						}
					}
					// No letter in the description is available
					return mnemonics + '-';
				}, '');
			}
		},
		mounted() {
			const fields = this.$refs.fields as any[];
			for(let i = 0; i < this.mnemonics.length; i++) {
				if(this.mnemonics[i] == '-') {
					continue;
				}
				hotkeys(`alt+${this.mnemonics[i]}`, () => {
					fields[i].focus();
					return false;
				});
			}
		},
		beforeDestroy() {
			for(let i = 0; i < this.mnemonics.length; i++) {
				if(this.mnemonics[i] == '-') {
					continue;
				}
				hotkeys.unbind(`alt+${this.mnemonics[i]}`);
			}
		},
	});
</script>

<style lang="less" scoped>
	.auto-editor {
		display: flex;
		flex-wrap: wrap;

		> * {
			flex: 1 0 auto;
			margin: 10px;
		}
	}
</style>
