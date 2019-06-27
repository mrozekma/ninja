<template>
	<form action="">
		<div class="modal-card">
			<section class="modal-card-body">
				<i class="fas fa-user-ninja logo"></i>
				<div>
					<p class="modal-card-title">Ninja</p>
					<a target="_blank" :href="buildLink" class="version">{{ buildVersion }}</a><br>
					Built {{ buildDate }}.<br>
					Hosting {{ toolCount }} {{ (toolCount == 1) ? 'tool' : 'tools' }}.<br>
				</div>
			</section>
			<footer class="modal-card-foot">
				<a v-if="hasLicenses" class="button" target="_blank" href="licenses.txt">Licenses</a>
				<button class="button" type="button" @click="$parent.close">Close</button>
			</footer>
		</div>
	</form>
</template>

<script lang="ts">
	// From DefinePlugin
	declare var BUILD_VERSION: string, BUILD_DATE: string, HAS_LICENSES: boolean;

	import toolGroups from '@/tools/groups';

	import Vue from 'vue';
	export default Vue.extend({
		computed: {
			buildVersion(): string {
				return BUILD_VERSION;
			},
			buildLink(): string {
				const hash = this.buildVersion.split('-')[2].replace(/^g/, '');
				return `https://github.com/mrozekma/ninja/commit/${hash}`;
			},
			buildDate(): string {
				return BUILD_DATE;
			},
			toolCount(): number {
				return toolGroups.map(group => group.tools).flat().length;
			},
			hasLicenses(): boolean {
				return HAS_LICENSES;
			}
		},
	});
</script>

<style lang="less" scoped>
	.modal-card {
		width: 700px;
	}

	.modal-card-body {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 5px;
		color: #fff;
		background-color: #ff3860;
		border-top-left-radius: 6px;
		border-top-right-radius: 6px;
	}

	.modal-card-title {
		color: #fff;
		font-family: Montserrat;
		font-size: 48pt;
		text-transform: uppercase;
		margin-bottom: 10px;
		margin-left: -8px;
	}

	.logo {
		font-size: 150pt;
	}

	a.version {
		font-family: monospace;
		font-size: 10pt;
		color: #fff;
	}
</style>
