<template>
	<form action="">
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Save</p>
			</header>
			<section class="modal-card-body">
				<b-field label="Name">
					<b-input type="text" ref="name" v-model="name" placeholder="Script name" required></b-input>
				</b-field>
			</section>
			<footer class="modal-card-foot">
				<button class="button is-primary" type="button" :disabled="name == ''" @click="saveToBrowser">Save to Browser</button>
				<button class="button is-primary" type="button" :disabled="name == ''" @click="saveToDisk">Save to Disk</button>
				<button class="button" type="button" @click="close()">Cancel</button>
			</footer>
		</div>
	</form>
</template>

<script lang="ts">
	import Vue from 'vue';
	export default Vue.extend({
		data() {
			return {
				name: '',
			};
		},
		mounted() {
			(this.$refs.name as HTMLElement).focus();
		},
		methods: {
			close() {
				//@ts-ignore
				this.$parent.close();
			},
			saveToBrowser() {
				this.$emit('save', 'browser', this.name);
				this.close();
			},
			saveToDisk() {
				this.$emit('save', 'disk', this.name);
				this.close();
			},
		},
	});
</script>
