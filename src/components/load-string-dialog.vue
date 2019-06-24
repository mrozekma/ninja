<template>
	<form action="">
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Load</p>
			</header>
			<section class="modal-card-body">
				<b-input type="textarea" ref="script" v-model="script" placeholder="Script"></b-input>
			</section>
			<footer class="modal-card-foot">
				<button class="button" type="button" @click="close()">Cancel</button>
				<button class="button is-primary" type="button" :disabled="script == ''" @click="load">Load</button>
			</footer>
		</div>
	</form>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
	data() {
		return {
			script: '',
		};
	},
	mounted() {
		(this.$refs.script as HTMLElement).focus();
	},
	methods: {
		close() {
			//@ts-ignore
			this.$parent.close();
		},
		load() {
			this.$emit('load', this.script);
			this.close();
		},
	},
});
</script>
