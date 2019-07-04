<template>
	<form action="" @submit.prevent="save">
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Settings</p>
			</header>
			<section class="modal-card-body">
				<b-field horizontal label="Auto-Layout">
					<b-switch v-model="autoLayout">
						<template v-if="autoLayout">Automatically position tools on the routing panel</template>
						<template v-else>Allow manual tool positioning on the routing panel</template>
					</b-switch>
				</b-field>
				<b-field horizontal label="Auto-Toggle Errors Panel">
					<b-switch v-model="autoToggleErrors">
						<template v-if="autoToggleErrors">Automatically show/hide the errors panel as needed</template>
						<template v-else>Don't automatically show/hide the errors panel</template>
					</b-switch>
				</b-field>
				<b-field horizontal label="Auto-Open Watch Panel">
					<b-switch v-model="autoOpenWatch">
						<template v-if="autoOpenWatch">Automatically open the watch panel when a new watch is created</template>
						<template v-else>Don't automatically open the watch panel</template>
					</b-switch>
				</b-field>
				<b-field horizontal label="Auto-Watch">
					<b-switch v-model="autoWatch">
						<template v-if="autoWatch">Automatically watch all disconnected outputs</template>
						<template v-else>Only watch outputs that have been manually selected</template>
					</b-switch>
				</b-field>
			</section>
			<footer class="modal-card-foot">
				<button class="button is-primary" type="button" @click="save">Save</button>
				<button class="button" type="button" @click="close()">Cancel</button>
			</footer>
		</div>
	</form>
</template>

<script lang="ts">
	import Vue from 'vue';
	export default Vue.extend({
		data() {
			// this.settings isn't available yet, so use the root version instead
			return {
				...(this.$root as any).rootSettings,
			}
		},
		methods: {
			close() {
				//@ts-ignore
				this.$parent.close();
			},
			save() {
				for(const k in this.settings) {
					(this.settings as any)[k] = this.$data[k];
				}
				this.close();
			},
		},
	});
</script>
