<template>
	<form action="" @submit.prevent="connect">
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Connect</p>
			</header>
			<section class="modal-card-body">
				<b-field :type="result && result.statusType" :message="result && result.message">
					<template v-slot:label>
						Connect <code>{{ describeIO(io) }}</code> to:
					</template>
					<b-autocomplete
						ref="autocomplete"
						v-model="search"
						:data="targets"
						field="description"
						:open-on-focus="true"
						:keep-first="true"
						placeholder="Connect to (tool.input)"
						@focus="search = ''"
						@select="checkTarget"
						@keydown.native.enter="enter"
						v-slot="{ option }"
					>
						<span :class="{invalid: !option.valid}">{{ option.description }}</span>
					</b-autocomplete>
				</b-field>
			</section>
			<footer class="modal-card-foot">
				<button class="button is-primary" type="button" :disabled="!validTarget" @click="connect()">Connect</button>
				<button class="button" type="button" @click="close()">Cancel</button>
			</footer>
		</div>
	</form>
</template>

<script lang="ts">
	import { ToolManager, ToolInst, Input, Output, ConstantTool } from '../tools';

	interface Target {
		io: Input | Output;
		description: string;
		valid: boolean;
	}

	interface Result {
		io: Input | Output;
		statusType?: 'is-success' | 'is-warning' | 'is-danger';
		message?: string;
	}

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		props: {
			io: Object as PropType<Input | Output>,
		},
		computed: {
			targets(): Target[] {
				const ios = this.toolManager.tools
					.map(tool => (tool instanceof ConstantTool) ? [ tool.output ] : [ ...tool.inputs, ...tool.outputs ])
					.flat();
				const targets = ios.map<Target>(io => ({
					io,
					description: this.describeIO(io),
					valid: this.getIOError(io) === undefined,
				})).sort((a, b) => (a.valid && !b.valid) ? -1 : (!a.valid && b.valid) ? 1 : 0);
				if(this.search == '') {
					return targets;
				}
				const search = this.search.toLowerCase();
				return targets.filter(target => target.description.toLowerCase().includes(search));
			},
			validTarget(): boolean {
				return this.result !== undefined && this.result.statusType !== 'is-danger';
			}
		},
		data() {
			return {
				search: '',
				result: undefined as Result | undefined,
			};
		},
		mounted() {
			// Getting the autocomplete to focus and show its menu on every dialog load is incredibly hard:
			setTimeout(() => (this.$refs.autocomplete as Vue).$el.querySelector('input')!.focus(), 0);
		},
		methods: {
			describeIO(io: Input | Output): string {
				if(io.tool instanceof ConstantTool) {
					return `constant ${io.tool.name}`;
				}
				return `${io.tool.name}.${io.name}`;
			},
			getIOError(io: Input | Output): string | undefined {
				if(io === this.io) {
					return `Can't connect an ${io.io} to itself`;
				}
				switch(io.io) {
					case 'input':
						if(io.connection !== undefined && io.connection.output.tool === this.io.tool) {
							return `${this.describeIO(io)} is connected to ${this.describeIO(io.connection.output)}, the same tool as ${this.describeIO(this.io)}`;
						}
						break;
					case 'output':
						if(io.tool === this.io.tool) {
							return `${this.describeIO(io)} is on the same tool as ${this.describeIO(this.io)}`;
						}
						break;
				}
				return undefined;
			},
			checkTarget(target: Target | null) {
				if(!target) {
					this.result = undefined;
					return;
				} else if(!target.valid) {
					this.result = {
						io: target.io,
						statusType: 'is-danger',
						message: this.getIOError(target.io),
					}
					return;
				}
				switch(target.io.io) {
					case 'input':
						if(target.io.connection === undefined) {
							this.result = {
								io: target.io,
								statusType: 'is-success',
								message: `Input "${this.describeIO(target.io)}" will be pulled into a constant`,
							}
						} else {
							this.result = {
								io: target.io.connection.output,
								statusType: 'is-success',
								message: `Will connect to "${this.describeIO(target.io)}"'s source, "${this.describeIO(target.io.connection.output)}"`,
							}
						}
						break;
					case 'output':
						this.result = {
							io: target.io,
							statusType: 'is-success',
						};
						break;
				}
			},
			enter() {
				if(this.validTarget) {
					this.connect();
				}
			},
			connect() {
				this.$emit('connect', this.result!.io);
				this.close();
			},
			close() {
				//@ts-ignore
				this.$parent.close();
			},
		},
	});
</script>

<style lang="less" scoped>
	.modal-card-body {
		height: 300px;

		.field /deep/ label {
			color: #000;
		}

		.dropdown-item .invalid {
			color: #ccc;
		}
	}
</style>
