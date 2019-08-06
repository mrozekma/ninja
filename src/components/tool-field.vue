<template>
	<b-field :class="{wide: (io.type == 'string' || io.type == 'string[]' || io.type == 'bytes')}">
		<template slot="label">
			<span v-html="descriptionWithMnemonic"></span>
			<b-tag v-if="!io.watch" type="is-primary">{{ io.name }}</b-tag>
			<span v-else @click="io.watch = false">
				<b-tag class="is-watched clickable"><i class="fas fa-eye"></i> {{ io.name }}</b-tag>
			</span>
			<span v-if="io.io == 'input' && io.connection" class="clickable" @click="disconnect()">
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
				<b-dropdown-item v-for="option in copyOptions" :key="option.text" @click="copy(option.formatter)">
					<i :class="option.icon || 'fas fa-clipboard'"></i> {{ option.text }}
				</b-dropdown-item>
				<b-dropdown-item v-if="copyOptions.length > 1" :separator="true"></b-dropdown-item>
				<template v-if="io.io == 'input'">
					<b-dropdown-item v-if="io.connection === undefined" @click="showConnectDialog = true"><i class="fas fa-link"></i> Connect</b-dropdown-item>
					<b-dropdown-item v-else @click="disconnect()"><i class="fas fa-unlink"></i> Disconnect</b-dropdown-item>
					<b-dropdown-item @click="showUploadDialog = true"><i class="fas fa-file-upload"></i> Upload</b-dropdown-item>
				</template>
				<b-dropdown-item v-if="!io.watch" @click="io.watch = true"><i class="fas fa-eye"></i> Watch</b-dropdown-item>
				<b-dropdown-item v-else @click="io.watch = false"><i class="fas fa-eye-slash"></i> Unwatch</b-dropdown-item>
				<b-dropdown-item v-if="io.io == 'input' && io.connection === undefined" @click="makeConstant()"><i class="fas fa-icicles"></i> Pull into constant</b-dropdown-item>
			</b-dropdown>
			<b-numberinput v-if="arrayLen !== undefined" controls-position="compact" size="is-small" :min="0" :max="arrayLen - 1" :showMax="true" v-model="arrayIdx"></b-numberinput>
			<b-modal :active.sync="showConnectDialog" has-modal-card>
				<connect-dialog :io="io" @connect="connect"></connect-dialog>
			</b-modal>
			<b-modal :active.sync="showUploadDialog" has-modal-card>
				<upload-dialog @upload="upload"></upload-dialog>
			</b-modal>
		</template>
		<b-message v-if="io.io == 'input' && io.connection && io.connection.error" type="is-danger">
			{{ io.connection.error }}
		</b-message>
		<tool-io v-else ref="toolIo" :io="io" :arrayIdx="(arrayLen !== undefined) ? arrayIdx : undefined"></tool-io>
	</b-field>
</template>

<script lang="ts">
	import * as clipboard from 'clipboard-polyfill';

	import { Input, Output, ToolState, ToolInst, ConstantTool, IOValTypes, convertToInputType } from '@/tools';

	interface CopyOption {
		text: string;
		icon?: string;
		formatter: (val: any) => string;
	}

	import Vue, { PropType } from 'vue';
	import ConnectDialog from '@/components/connect-dialog.vue';
	import UploadDialog from '@/components/upload-dialog.vue';
	import ToolIOComponent from '@/components/tool-io.vue';
	export default Vue.extend({
		components: { ConnectDialog, UploadDialog, ToolIo: ToolIOComponent },
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
			copyOptions(): CopyOption[] {
				switch(this.io.type) {
					case 'bytes':
						return [
							{ text: 'Copy (001122...)', formatter: (buf: Buffer) => buf.toString('hex') },
							{ text: 'Copy (00:11:22:...)', formatter: (buf: Buffer) => buf.toString('hex').replace(/..(?!$)/g, '$&:') },
							{ text: 'Copy (C array)', formatter: (buf: Buffer) => '{' + (buf.toString('hex').match(/../g) || []).map(b => `0x${b}`).join(', ') + '}'},
						];
					case 'number':
						return [
							{ text: 'Copy (dec)', formatter: (n: number) => n.toString(10) },
							{ text: 'Copy (hex)', formatter: (n: number) => (n >= 0 ? '0x' : '') + n.toString(16) },
						];
					default:
						//TODO More options for arrays? They're not commonly used at the moment
						return [
							{ text: 'Copy', formatter: (v: IOValTypes) => v.toString() },
						];
				}
			},
		},
		data() {
			return {
				arrayIdx: 0,
				showConnectDialog: false,
				showUploadDialog: false,
			};
		},
		watch: {
			arrayLength() {
				this.arrayIdx = 0;
			},
		},
		methods: {
			copy(formatter: (val: any) => string = val => val.toString()) {
				clipboard.writeText(formatter(this.io.val))
					.then(() => this.$snackbar.open({
						message: "Value copied to clipboard",
						type: 'is-info',
					}))
					.catch(e => this.$snackbar.open({
						message: `Failed to write to clipboard (${e})`,
						type: 'is-danger',
					}));
			},
			connect(remote: Input | Output) {
				const input = this.io as Input;
				switch(remote.io) {
					case 'input':
						if(remote.connection !== undefined) {
							throw new Error("Tried to connect to an input that's already connected elsewhere");
						}
						const constTool = this.toolManager.addConstant(remote.name, remote.val);
						this.toolManager.connect(remote, constTool.output);
						this.toolManager.connect(input, constTool.output);
						break;
					case 'output':
						this.toolManager.connect(input, remote);
						break;
				}
			},
			upload(filename: string, buf: Buffer, makeConstant: boolean) {
				const input = this.io as Input;
				if(makeConstant) {
					const constTool = this.toolManager.addConstant(filename, buf);
					this.toolManager.connect(input, constTool.output);
				} else {
					this.toolManager.setInputVal(input, convertToInputType(buf, input));
				}
			},
			disconnect() {
				this.toolManager.disconnect(this.io as Input);
			},
			makeConstant() {
				const input = this.io as Input;
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
