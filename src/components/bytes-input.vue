<template>
	<vue-resizable :active="['b']" width="100%" :height="(manualHeight !== undefined) ? manualHeight : fitHeight" @resize:end="({height}) => manualHeight = height">
		<div class="hexinput" tabindex="0" @keydown="keydown" @focus="focus" @blur="blur" @cut="cut" @copy="copy" @paste="paste">
			<template v-for="(b, off) in bytes">
				<div v-if="selection && selection.point == off && newByteFirstDigit !== undefined" class="point mark draft">
					{{ newByteFirstDigit.toString(16) }}?
				</div>
				<div :class="getClasses(off)" @mousedown="setSelection('absolute', off, false)">
					{{ b.toString(16).padStart(2, '0') }}
					<span v-if="b >= 0x21 && b <= 0x7e">{{ String.fromCharCode(b) }}</span>
				</div>
			</template>
			<div v-if="selection && selection.point == bytes.length && newByteFirstDigit !== undefined" class="point mark draft">
				{{ newByteFirstDigit.toString(16) }}?
			</div>
			<div v-else-if="focused" :class="getClasses(bytes.length)" @mousedown="setSelection('absolute', bytes.length, false)"></div>
		</div>
	</vue-resizable>
</template>

<script lang="ts">
	//TODO Probably some sort of help text placeholder when empty
	import scrollIntoView from 'scroll-into-view-if-needed';
	//@ts-ignore No declaration file
	import VueResizable from 'vue-resizable';
	import * as clipboard from 'clipboard-polyfill';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		components: { VueResizable },
		props: {
			value: {
				type: Buffer,
				required: true,
			},
			loading: {
				type: Boolean,
				default: false,
			},
			disabled: {
				type: Boolean,
				default: false,
			},
		},
		computed: {
			fitHeight(): number {
				// 5px padding top/bottom, 28px per row, 4px gap. Min 1 row, max 6
				const rows = Math.ceil((this.value.length + (this.focused ? 1 : 0)) / 16);
				return 10 + (28 + 4) * Math.max(1, Math.min(6, rows));
			},
		},
		data() {
			return {
				bytes: [...this.value],
				focused: false,
				manualHeight: undefined as number | undefined,
				selection: undefined as {
					point: number;
					mark: number;
				} | undefined,
				newByteFirstDigit: undefined as number | undefined,
			};
		},
		watch: {
			value(val: Buffer) {
				this.bytes = [...this.value];
			},
			bytes(val: number[]) {
				if(val.length != this.value.length || val.some((val, idx) => val != this.value[idx])) {
					this.$emit('input', Buffer.from(val));
				}
			},
		},
		methods: {
			getClasses(idx: number): { [K: string]: boolean } {
				if(this.selection === undefined || this.newByteFirstDigit !== undefined) {
					return {};
				}
				return {
					selected: idx >= Math.min(this.selection.point, this.selection.mark) && idx <= Math.max(this.selection.point, this.selection.mark),
					point: idx == this.selection.point,
					mark: idx == this.selection.mark,
				};
			},
			async setSelection(relativeTo: 'cur' | 'line' | 'all' | 'absolute', off: number, keepMark: boolean) {
				if(relativeTo == 'absolute') {
					this.selection = {
						point: off,
						mark: off,
					};
				} else if(this.selection === undefined) {
					this.selection = {
						point: 0,
						mark: 0,
					};
				} else {
					switch(relativeTo) {
						case 'all':
							switch(Math.sign(off)) {
								case -1:
									this.selection.point = 0;
									break;
								case 1:
									this.selection.point = Infinity;
									break;
							}
							break;
						case 'line':
							switch(Math.sign(off)) {
								case -1:
									if(this.selection.point % 16) {
										this.selection.point -= this.selection.point % 16;
									}
									break;
								case 1:
									if(this.selection.point % 16) {
										this.selection.point -= this.selection.point % 16;
									}
									this.selection.point += 16 - 1;
									break;
							}
							break;
						case 'cur':
							this.selection.point += off;
							break;
					}
				}
				this.selection.point = Math.max(0, Math.min(this.bytes.length, this.selection.point));
				if(!keepMark) {
					this.selection.mark = this.selection.point;
				}
				await this.$nextTick();
				const point = document.querySelector('.point');
				if(point) {
					scrollIntoView(point, {
						behavior: 'instant',
						block: 'nearest',
						scrollMode: 'if-needed',
					});
				}
			},
			delete(direction: 'backwards' | 'forwards' = 'forwards') {
				if(this.disabled || this.selection === undefined) {
					return;
				}
				switch(direction) {
					case 'backwards':
						if(this.selection.point == this.selection.mark) {
							// Delete the byte before this one
							if(this.selection.point > 0) {
								this.bytes.splice(this.selection.point - 1, 1);
								this.setSelection('cur', -1, false);
							}
						} else {
							// Delete the selected bytes and select the one before these
							this.bytes.splice(Math.min(this.selection.point, this.selection.mark), Math.abs(this.selection.point - this.selection.mark) + 1);
							this.setSelection('absolute', Math.min(this.selection.point, this.selection.mark) - 1, false);
						}
						break;
					case 'forwards':
						if(this.selection.point == this.selection.mark) {
							// Delete this byte
							this.bytes.splice(this.selection.point, 1);
						} else {
							// Delete the selected bytes and select the one after these
							this.bytes.splice(Math.min(this.selection.point, this.selection.mark), Math.abs(this.selection.point - this.selection.mark) + 1);
							this.setSelection('absolute', Math.min(this.selection.point, this.selection.mark), false);
						}
						break;
				}
			},
			onDigit(d: number) {
				if(this.selection && this.selection.mark != this.selection.point) {
					this.delete();
				}
				if(this.newByteFirstDigit === undefined) {
					this.newByteFirstDigit = d;
				} else {
					this.bytes.splice(this.selection!.point, 0, (this.newByteFirstDigit << 4) | d);
					this.newByteFirstDigit = undefined;
					this.setSelection('cur', 1, false);
				}
			},
			focus() {
				this.focused = true;
				if(this.selection === undefined) {
					this.setSelection('absolute', this.bytes.length, false);
				}
			},
			blur() {
				this.focused = false;
				this.selection = undefined;
				this.newByteFirstDigit = undefined;
			},
			cut(e: ClipboardEvent) {
				if(this.disabled || this.selection === undefined) {
					return;
				}
				this.copy(e);
				this.delete();
			},
			copy(e: ClipboardEvent) {
				if(this.selection === undefined) {
					return;
				}
				const first = Math.min(this.selection.point, this.selection.mark), second = Math.max(this.selection.point, this.selection.mark);
				clipboard.writeText(this.value.slice(first, second + 1).toString('hex'));
			},
			paste(e: ClipboardEvent) {
				if(this.disabled) {
					return;
				}
				if(e.clipboardData) {
					if(this.selection && this.selection.mark != this.selection.point) {
						this.delete();
					}
					e.clipboardData.items[0].getAsString(str => {
						let buf;
						try {
							//TODO This will return partial results if the string starts with valid bytes, which is probably bad
							buf = Buffer.from(str.replace(/[-: ]/g, ''), 'hex');
						} catch(e) {
							this.$snackbar.open({
								message: `Failed to paste bytes: ${e.message}`,
								type: 'is-danger',
							});
							return;
						}
						const off = this.selection ? this.selection.point : this.bytes.length;
						this.bytes.splice(off, 0, ...buf);
						this.setSelection('absolute', off + buf.length, false);
					});
				}
			},
			keydown(e: KeyboardEvent) {
				if(!this.disabled && !(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)) {
					if(e.keyCode >= 0x30 && e.keyCode <= 0x39) {
						this.onDigit(e.keyCode - 0x30);
						e.preventDefault();
						return;
					} else if(e.keyCode >= 0x41 && e.keyCode <= 0x46) { // This is the range regardless of case
						this.onDigit(e.keyCode - 0x41 + 10);
						e.preventDefault();
						return;
					}
				} else if(e.ctrlKey && e.key == 'a') {
					this.setSelection('all', -1, false);
					this.setSelection('all', 1, true);
					e.preventDefault();
					return;
				}

				const CTRL_SCALE = 4;
				switch(e.key) {
					case 'ArrowLeft':
						this.setSelection('cur', -1 * (e.ctrlKey ? CTRL_SCALE : 1), e.shiftKey);
						break;
					case 'ArrowRight':
						this.setSelection('cur', 1 * (e.ctrlKey ? CTRL_SCALE : 1), e.shiftKey);
						break;
					case 'ArrowUp':
						this.setSelection('cur', -16 * (e.ctrlKey ? CTRL_SCALE : 1), e.shiftKey);
						break;
					case 'ArrowDown':
						this.setSelection('cur', 16 * (e.ctrlKey ? CTRL_SCALE : 1), e.shiftKey);
						break;
					case 'PageUp':
						this.setSelection('cur', -16 * CTRL_SCALE, e.shiftKey)
						break;
					case 'PageDown':
						this.setSelection('cur', 16 * CTRL_SCALE, e.shiftKey)
						break;
					case 'Home':
						this.setSelection(e.ctrlKey ? 'all' : 'line', -1, e.shiftKey);
						break;
					case 'End':
						this.setSelection(e.ctrlKey ? 'all' : 'line', 1, e.shiftKey);
						break;
					case 'Escape':
						(document.activeElement! as HTMLDivElement).blur();
						break;
					case 'Backspace':
						this.delete('backwards');
						break;
					case 'Delete':
						this.delete('forwards');
						break;
					default:
						return;
				}

				e.preventDefault();
			},
		},
	});
</script>

<style lang="less" scoped>
	.hexinput {
		border: 1px solid #000;
		width: 100%;
		height: 100%;
		background-color: #fff;
		color: #000;
		border-radius: 5px;
		padding: 5px 9px;
		overflow-y: auto;

		display: grid;
		grid-template-columns: repeat(16, 1fr);
		grid-auto-rows: 28px;
		align-items: start;
		gap: 4px;

		> div {
			position: relative;
			height: 28px;
			cursor: pointer;
			text-transform: uppercase;
			background-color: #aaa;
			text-align: center;
			font-family: monospace;

			&:nth-child(8n+5), &:nth-child(8n+6), &:nth-child(8n+7), &:nth-child(8n+8) {
				background-color: #ccc;
			}

			&.selected {
				background-color: #ff3860;
				color: #fff;
			}

			&.point {
				font-weight: bold;
			}

			&.draft {
				background-color: #333;
				color: #fff;
			}

			> span {
				position: absolute;
				text-transform: none;
				font-size: 6pt;
				bottom: 0;
				right: 2px;
			}
		}
	}

	/deep/ .resizable-b {
		border-bottom: 3px solid grey;
		z-index: auto !important;
	}
</style>
