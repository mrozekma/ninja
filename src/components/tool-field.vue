<template>
	<b-field :class="{wide: (io.type == 'string' || io.type == 'string[]' || io.type == 'bytes')}">
		<template slot="label">
			<span v-html="descriptionWithMnemonic"></span>
			<b-tag v-if="!io.watch" type="is-primary">{{ io.name }}</b-tag>
			<span v-else @click="io.watch = false">
				<b-tag class="is-watched clickable"><i class="fas fa-eye"></i> {{ io.name }}</b-tag>
			</span>
			<span v-if="io.io == 'input' && io.connection" class="clickable" @click="disconnect(io)">
				<b-tag type="is-primary">
					<i class="fas fa-link"></i>
					<template v-if="toolIsConstant(io.connection.output.tool)">
						Connected to constant <code>{{ io.connection.output.tool.name}}</code>
					</template>
					<template v-else>
						Connected to <code>{{ io.connection.output.tool.name }}.{{ io.connection.output.name }}</code>
					</template>
				</b-tag>
			</span>
			<b-dropdown>
				<b-tag slot="trigger" type="is-primary" class="clickable">
					<i class="fas fa-caret-down"></i>
				</b-tag>
				<template v-if="io.io == 'input'">
					<b-dropdown-item v-if="io.connection === undefined" @click="connect(io)"><i class="fas fa-link"></i> Connect</b-dropdown-item>
					<b-dropdown-item v-else @click="disconnect(io)"><i class="fas fa-unlink"></i> Disconnect</b-dropdown-item>
				</template>
				<b-dropdown-item v-if="!io.watch" @click="io.watch = true"><i class="fas fa-eye"></i> Watch</b-dropdown-item>
				<b-dropdown-item v-else @click="io.watch = false"><i class="fas fa-eye-slash"></i> Unwatch</b-dropdown-item>
				<b-dropdown-item v-if="io.io == 'input' && io.connection === undefined" @click="makeConstant(io)"><i class="fas fa-question"></i> Pull into constant</b-dropdown-item> <!-- TODO Icon -->
			</b-dropdown>
			<b-numberinput v-if="arrayLen !== undefined" controls-position="compact" size="is-small" :min="0" :max="arrayLen - 1" :showMax="true" v-model="arrayIdx"></b-numberinput>
		</template>
		<b-message v-if="io.io == 'input' && io.connection && io.connection.error" type="is-danger">
			{{ io.connection.error }}
		</b-message>
		<tool-io v-else ref="toolIo" :io="io" :arrayIdx="(arrayLen !== undefined) ? arrayIdx : undefined"></tool-io>
	</b-field>
</template>

<script lang="ts">
	import { Input, Output, ToolState, ToolInst, ConstantTool } from '@/tools';

	import Vue, { PropType } from 'vue';
	import ToolIOComponent from '@/components/tool-io.vue';
	export default Vue.extend({
		components: { ToolIo: ToolIOComponent },
		props: {
			io: Object as PropType<Input | Output>,
			mnemonic: {
				type: String,
				default: '-',
			},
		},
		computed: {
			descriptionWithMnemonic(): string {
				// Currently descriptions don't contain any problematic characters, but this might need to be sanitized in the future
				return this.mnemonic == '-' ? this.io.description : this.io.description.replace(new RegExp(this.mnemonic, 'i'), "<u>$&</u>");
			},
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
			connect(input: Input) {
				//TODO
			},
			disconnect(input: Input) {
				this.toolManager.disconnect(input);
			},
			makeConstant(input: Input) {
				const tool = this.toolManager.addConstant(input.name, input.val);
				this.toolManager.connect(input, tool.output);
			},
			toolIsConstant(tool: ToolInst) {
				return (tool instanceof ConstantTool);
			},
			focus() {
				if(this.$refs.toolIo) {
					(this.$refs.toolIo as any).focus();
				}
			},
		},
	});
</script>

<style lang="less" scoped>
	.field {
		&.wide {
			flex: 1 0 calc(100% - 20px);
		}

		label {
			> *:not(:first-child) {
				display: inline-flex;
				margin-left: 10px;
			}

			.tag code {
				position: relative;
				top: -1px;
				margin-left: 1px;
				border-radius: 4px;
			}
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
