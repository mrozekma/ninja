<template>
	<div>
		<data-flow-canvas></data-flow-canvas>
	</div>
</template>

<script lang="ts">

	import Vue from 'vue';
	import DataFlowCanvas from './components/data-flow-canvas.vue';

	export default Vue.extend({
		components: { DataFlowCanvas },
		mounted() {
		},
	});
</script>

<style lang="less">
	#app {
		font-family: 'Avenir', Helvetica, Arial, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-align: center;
		color: #2c3e50;
		margin-top: 60px;
	}
</style>
