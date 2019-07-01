<template>
	<b-field :class="{wide: (io.type == 'string' || io.type == 'string[]')}">
		<template slot="label">
			{{ io.description }}
			<b-tag v-if="!io.watch" type="is-primary">{{ io.name }}</b-tag>
			<span v-else @click="io.watch = false">
				<b-tag class="is-watched clickable"><i class="fas fa-eye"></i> {{ io.name }}</b-tag>
			</span>
			<span v-if="io.io == 'input' && io.connection" class="clickable" @click="disconnect(io)">
				<b-tag type="is-primary">
					<i class="fas fa-link"></i>
					Connected to {{ io.connection.output.tool.name }}.{{ io.connection.output.name }}
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
			</b-dropdown>
			<b-numberinput v-if="arrayLen !== undefined" controls-position="compact" size="is-small" :min="0" :max="arrayLen - 1" v-model="arrayIdx"></b-numberinput>
		</template>
		<b-message v-if="io.io == 'input' && io.connection && io.connection.error" type="is-danger">
			{{ io.connection.error }}
		</b-message>
		<tool-io v-else :io="io" :arrayIdx="(arrayLen !== undefined) ? arrayIdx : undefined"></tool-io>
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
		methods: {
			connect(input: Input) {
				//TODO
			},
			disconnect(input: Input) {
				this.toolManager.disconnect(input);
			},
		},
	});
</script>

<style lang="less" scoped>
	.field {
		&.wide {
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
