<template>
	<div class="form">
		<b-field v-for="input in inputs" :key="input.name" :class="{wide: (input.type == 'string'), 'is-loading': !!(input.connection && !input.connection.upToDate)}">
			<template slot="label">
				{{ input.description }}
				<b-tag v-if="!input.watch" type="is-primary">{{ input.name }}</b-tag>
				<span v-else @click="input.watch = false">
					<b-tag class="is-watched clickable"><i class="fas fa-eye"></i> {{ input.name }}</b-tag>
				</span>
				<span v-if="input.connection" class="clickable" @click="disconnect(input)">
					<b-tag type="is-primary">
						<i class="fas fa-link"></i>
						Connected to {{ input.connection.output.tool.name }}.{{ input.connection.output.name }}
					</b-tag>
				</span>
				<b-dropdown>
					<b-tag slot="trigger" type="is-primary" class="clickable">
						<i class="fas fa-caret-down"></i>
					</b-tag>
					<b-dropdown-item v-if="input.connection === undefined" @click="connect(input)"><i class="fas fa-link"></i> Connect</b-dropdown-item>
					<b-dropdown-item v-else @click="disconnect(input)"><i class="fas fa-unlink"></i> Disconnect</b-dropdown-item>
					<b-dropdown-item v-if="!input.watch" @click="input.watch = true"><i class="fas fa-eye"></i> Watch</b-dropdown-item>
					<b-dropdown-item v-else @click="input.watch = false"><i class="fas fa-eye-slash"></i> Unwatch</b-dropdown-item>
				</b-dropdown>
			</template>
			<b-message v-if="input.connection && input.connection.error" type="is-danger">
				{{ input.connection.error }}
			</b-message>
			<tool-io v-else :io="input"></tool-io>
		</b-field>
	</div>
</template>

<script lang="ts">
	import { Input } from '@/tools';

	import Vue from 'vue';
	import ToolIOComponent from '@/components/tool-io.vue';
	export default Vue.extend({
		components: { ToolIo: ToolIOComponent },
		computed: {
			inputs(): Readonly<Input[]> {
				const tool = this.toolManager.selectedTool;
				return tool ? tool.inputs : [];
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
