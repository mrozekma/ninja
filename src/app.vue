<template>
	<div class="app">
		<nav class="navbar is-danger">
			<div class="navbar-brand">
				<div class="navbar-item">
					<i class="fas fa-user-ninja"></i> Ninja
				</div>
			</div>
		</nav>
		<div class="main-grid">
			<div class="col">
				<h1>Tools</h1>
				<tool-list></tool-list>
			</div>
			<div class="gutter-h" ref="gutter1"></div>
			<div class="col">
				<div class="center-grid">
					<div class="col">
						<h1>Properties</h1>
						<property-view></property-view>
					</div>
					<div class="gutter-v" ref="gutter3"></div>
					<div class="col">
						<h1>Outputs</h1>
					</div>
				</div>
			</div>
			<div class="gutter-h" ref="gutter2"></div>
			<div class="col">
				<h1>Routing</h1>
				<data-flow-canvas></data-flow-canvas>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
	import Vue from 'vue';

	import Buefy from 'buefy';
	import 'buefy/dist/buefy.css';
	Vue.use(Buefy, {
		defaultIconPack: 'far',
	});
	import 'typeface-montserrat';
	import '@fortawesome/fontawesome-free';
	import '@fortawesome/fontawesome-free/css/all.css';

	//@ts-ignore No declaration file
	import Split from 'split-grid';

	import ToolList from './components/tool-list.vue';
	import PropertyView from './components/property-view.vue';
	import DataFlowCanvas from './components/data-flow-canvas.vue';
	export default Vue.extend({
		components: { ToolList, PropertyView, DataFlowCanvas },
		mounted() {
			Split({
				columnGutters: [{
					track: 1,
					element: this.$refs.gutter1,
				}, {
					track: 3,
					element: this.$refs.gutter2,
				}],
				rowGutters: [{
					track: 1,
					element: this.$refs.gutter3,
				}]
			});
		},
	});
</script>

<style lang="less">
	body {
		height: 100vh;
		background-color: #363636;
	}

	.navbar {
		.navbar-brand {
			font-family: Montserrat;
			font-size: 18pt;
			text-transform: uppercase;
			i {
				margin-right: 5px;
			}
		}
	}

	@gutter-size: 3px;

	.main-grid, .center-grid {
		height: calc(100vh - 52px);
	}

	.main-grid {
		display: grid;
		grid-template-columns: 300px @gutter-size 1fr @gutter-size 1fr;
		color: #fff;

		h1 {
			display: block;
			border: solid lighten(#363636, 25%);
			border-width: 1px 0;
			padding: 10px;
			background-color: lighten(#363636, 15%);
		}
	}

	.center-grid {
		display: grid;
		grid-template-rows: 3fr @gutter-size 2fr;
	}

	.gutter-h, .gutter-v {
		background-color: #aaa;
	}

	.gutter-h {
		cursor: col-resize;
	}

	.gutter-v {
		cursor: row-resize;
	}
</style>
