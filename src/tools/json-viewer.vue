<template>
	<b-message v-if="typeof formatted === 'object'" type="is-danger">
		{{ formatted }}
	</b-message>
	<div v-else class="viewer">
		<div class="buttons">
			<b-button size="is-small" @click="setAll(true)">Expand all</b-button>
			<b-button size="is-small" @click="setAll(false)">Collapse all</b-button>
		</div>
		<pre><code ref="code" class="language-json">{{ formatted }}</code></pre>
	</div>
</template>

<script lang="ts">
	import { JSONDisplayTool } from '@/tools/text';

	import Prism from 'prismjs';
	import 'prism-json-fold';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		props: {
			tool: Object as PropType<JSONDisplayTool>,
		},
		computed: {
			formatted(): string | Error {
				try {
					const parsed = JSON.parse(this.tool.json);
					return JSON.stringify(parsed, undefined, 4);
				} catch(e) {
					return e;
				}
			},
			// highlighted(): string {
			// 	return Prism.highlight(this.formatted, Prism.languages.json, 'json');
			// },
		},
		mounted() {
			this.highlight();
		},
		updated() {
			this.highlight();
		},
		methods: {
			async highlight() {
				await this.$nextTick();
				if(this.$refs.code) {
					Prism.highlightElement(this.$refs.code as HTMLElement);
				}
			},
			setAll(flag: boolean) {
				const code = this.$refs.code as HTMLElement;
				for(const block of code.querySelectorAll('.block')) {
					block.classList.toggle('open', flag);
				}
			},
		},
	});
</script>

<style lang="less" scoped>
	.viewer {
		position: relative;
	}

	.buttons {
		position: absolute;
		top: 4px;
		right: 4px;
	}

	pre {
		background-color: transparent;
		color: #fff;
	}

	/deep/ .number {
		// Buefy sets a bunch of unwanted properties on .number
		all: unset;
		// This one comes from Prism, but was unset along with the others
		color: #ae81ff;
	}
</style>

<!-- https://www.npmjs.com/package/prism-json-fold#css -->
<style scoped>
	code >>> .block {
		position: relative;
	}

	code >>> i.caret {
		position: absolute;
		font-style: normal;
		cursor: pointer;

		/** You may have to change this */
		width: 10px;
		height: 10px;
		top: -3px;
		left: -16px;
		color: #ccc;
	}

	code >>> i.caret:before {
		/** You may have to change this: It only works when using font awesome */
		/* content: '\25B8'; */
		font-family: 'FontAwesome';
		content: '\f105';
	}

	code >>> .block-wrapper {
		display: inline-block;
		position: relative;
		overflow: hidden;
		vertical-align: top;

		/** You may have to modify this */
		max-height: 24px;
		max-width: 45px;
		color: #ccc;
	}

	code >>> .block-wrapper > * {
		opacity: 0;
	}

	code >>> .block-wrapper:before {
		content: '...';
		top: -2px;
		position: absolute;
		left: 3px;
	}

	code >>> .block-wrapper:after {
		top: 0px;
		position: absolute;
		right: 0;
	}

	code >>> .block-keyed-object > .block-wrapper:after,
	code >>> .block-object > .block-wrapper:after {
		content: '}';
	}

	code >>> .block-keyed-array > .block-wrapper:after,
	code >>> .block-array > .block-wrapper:after {
		content: ']';
	}

	code >>> .block.open > .block-wrapper {
		display: initial;
	}

	code >>> .block.open > .block-wrapper > * {
		opacity: 1;
	}

	code >>> .block.open > .block-wrapper:before,
	code >>> .block.open > .block-wrapper:after {
		display: none;
	}

	code >>> .block.open > i.caret:before {
		/* transform: rotate(90deg); */
		content: '\f107';
	}
</style>
