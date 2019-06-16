<template>
	<div class="app">
		<nav class="navbar is-danger">
			<div class="navbar-brand">
				<div class="navbar-item">
					<i class="fas fa-user-ninja"></i> Ninja
				</div>
			</div>
		</nav>
		<div class="tools">
			<h3 class="title">Tools</h3>
		</div>
		<div class="center">
		</div>

	<!-- <div>
		<data-flow-canvas></data-flow-canvas>
	</div> -->
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

	import DataFlowCanvas from './components/data-flow-canvas.vue';
	export default Vue.extend({
		components: { DataFlowCanvas },
		mounted() {
			// console.log((this.$refs.b as Vue));
			Split({
				columnGutters: [{
					track: 1,
					element: this.$refs.b,
				}],
				rowGutters: [{
					track: 1,
					element: this.$refs.e,
				}]
			});
		},
	});
</script>

<style lang="less">
	.navbar {
		.navbar-brand {
			font-family: Montserrat;
			font-size: 18pt;
		}
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 16px 1fr;
		height: 100vh;

		.b, .e {
			background-color: #f00;
		}

		.a, .c, .d, .f {
			border: 1px solid green;
		}

		.c {
			display: grid;
			grid-template-rows: 1fr 16px 1fr;
		}
	}
</style>
