<template>
	<div class="app">
		<nav class="navbar is-primary">
			<div class="navbar-brand">
				<div class="navbar-item">
					<i class="fas fa-user-ninja"></i> Ninja
				</div>
			</div>
			<div class="navbar-item has-dropdown is-hoverable">
				<a class="navbar-link">Data</a>
				<div class="navbar-dropdown">
					<a class="navbar-item" @click="runAll"><i class="fas fa-play-circle"></i> Run All</a>
				</div>
			</div>
		</nav>

		<div class="main-grid">
			<div class="col">
				<h1>Tools</h1>
				<div class="scroll">
					<tool-list></tool-list>
				</div>
			</div>
			<div class="gutter-h" ref="gutter1"></div>
			<div class="col">
				<div class="center-grid">
					<div class="col scroll">
						<h1>Properties</h1>
						<div class="">
							<property-view></property-view>
						</div>
					</div>
					<div class="gutter-v" ref="gutter3"></div>
					<div class="col scroll">
						<h1>Outputs</h1>
						<div class="">
							<output-view></output-view>
						</div>
					</div>
				</div>
			</div>
			<div class="gutter-h" ref="gutter2"></div>
			<div class="col">
				<h1>Routing</h1>
				<data-flow-canvas ref="dfcanvas"></data-flow-canvas>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
	import Vue from 'vue';

	import Buefy from 'buefy';
	// import 'buefy/dist/buefy.css';
	Vue.use(Buefy, {
		defaultIconPack: 'fas',
	});
	import 'typeface-montserrat';
	import '@fortawesome/fontawesome-free';
	import '@fortawesome/fontawesome-free/css/all.css';

	//@ts-ignore No declaration file
	import Split from 'split-grid';

	import { RootData } from './types';
	import ToolList from './components/tool-list.vue';
	import PropertyView from './components/property-view.vue';
	import DataFlowCanvas from './components/data-flow-canvas.vue';
	import OutputView from './tools/output-view.vue';
	export default Vue.extend({
		components: { ToolList, PropertyView, DataFlowCanvas, OutputView },
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
		},
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
				}],
				onDragStart: (direction: 'row' | 'column', track: number) => {
					if(direction == 'column' && track == 3) {
						//@ts-ignore
						this.$refs.dfcanvas.shrink();
					}
				},
				onDragEnd: (direction: 'row' | 'column', track: number) => {
					if(direction == 'column' && track == 3) {
						//@ts-ignore
						this.$refs.dfcanvas.grow();
					}
				},
			});
		},
		methods: {
			runAll() {
				this.rootData.toolManager.updateData();
			},
		},
	});
</script>

<style lang="scss">
@import "~bulma/sass/utilities/_all";

$primary: $danger;
$primary-invert: findColorInvert($primary);
$colors: (
	"white": ($white, $black),
	"black": ($black, $white),
	"light": ($light, $light-invert),
	"dark": ($dark, $dark-invert),
	"primary": ($primary, $primary-invert),
	"info": ($info, $info-invert),
	"success": ($success, $success-invert),
	"warning": ($warning, $warning-invert),
	"danger": ($danger, $danger-invert),
);

@import "~bulma";
@import "~buefy/src/scss/buefy";
</style>

<style lang="less">
	html {
		// I have no clue why this is necessary, but the page is scrolling past the height of all containers, even <html>
		overflow: hidden;
	}

	body {
		height: 100vh;
		background-color: #363636;
	}

	.navbar {
		.navbar-brand {
			font-family: Montserrat;
			font-size: 18pt;
			text-transform: uppercase;
			margin-right: 30px;
			i {
				margin-right: 5px;
			}
		}
		.navbar-item {
			i {
				margin-right: 5px;
			}

			.navbar-link {
				color: #fff;
				&::after {
					border-color: #bf2a48;
				}
			}

			&:hover .navbar-link {
				background-color: #801c30 !important;
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

	.field label {
		color: #fff;
	}

	.scroll {
		overflow-y: auto;
		> h1 {
			position: sticky;
			top: 0;
			left: 0;
			z-index: 2;
		}
	}
</style>
