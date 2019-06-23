<template>
	<div class="form">
		<b-field v-for="input in inputs" :key="input.name" :class="{wide: (input.type == 'text'), 'is-loading': !!(input.connection && !input.connection.upToDate)}">
			<template slot="label">
				{{ input.description }}
				<b-tag type="is-primary">{{ input.name }}</b-tag>
				<span v-if="input.connection" style="clickable" @click="disconnect(input)">
					<b-tag type="is-primary">
						<i class="fas fa-link"></i>
						Connected to {{ input.connection.output.tool.name }}.{{ input.connection.output.name }}
					</b-tag>
				</span>
				<span v-else>
					<!-- TODO Click to connect -->
					<b-tag type="is-primary">
						<i class="fas fa-unlink"></i>
						Independent
					</b-tag>
				</span>
			</template>
			<b-message v-if="input.connection && input.connection.error" type="is-danger">
				{{ input.connection.error }}
			</b-message>
			<b-input v-else-if="input.type == 'string'" :value="input.val" @input="set(input, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined"></b-input>
			<b-input v-else-if="input.type == 'text'" type="textarea" :value="input.val" @input="set(input, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined"></b-input>
			<b-switch v-else-if="input.type == 'boolean'" :value="input.val" @input="set(input, $event)" :disabled="input.connection !== undefined">{{ (input.connection && !input.connection.upToDate) ? "Loading..." : input.val ? "Enabled" : "Disabled" }}</b-switch>
			<b-numberinput v-else-if="input.type == 'number'" :min="input.min" :max="input.max" :value="input.val" @input="set(input, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined"></b-numberinput>
			<b-select v-else-if="input.type == 'enum'" :value="input.val" @input="set(input, $event)" :loading="!!(input.connection && !input.connection.upToDate)" :disabled="input.connection !== undefined">
				<option v-for="option in input.options" :value="option">{{ option }}</option>
			</b-select>
		</b-field>
	</div>
</template>

<script lang="ts">
	import { RootData } from '@/types';
	import { Input } from '@/tools';

	import Vue from 'vue';
	export default Vue.extend({
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			inputs(): Input[] {
				const tool = this.rootData.selectedTool;
				return tool ? tool.inputs : [];
			},
		},
		methods: {
			set(input: Input, value: any) {
				this.rootData.toolManager.setInput(input, value);
			},
			disconnect(input: Input) {
				this.rootData.toolManager.disconnect(input);
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
</style>
