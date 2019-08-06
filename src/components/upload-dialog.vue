<template>
	<form action="" @submit.prevent="upload">
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Upload File</p>
			</header>
			<section class="modal-card-body">
				<!-- This prevents the b-upload from getting automatically focused -->
				<input style="display: none">
				<b-field>
					<b-upload v-model="file" drag-drop>
						<section class="section">
							<div class="content has-text-centered">
								<i class="fas fa-file-upload"></i>
								<p>Drop file here or click to browse</p>
								<b-tag v-if="file" type="is-primary">{{ file.name }}</b-tag>
							</div>
						</section>
					</b-upload>
				</b-field>
				<b-field>
					<b-switch v-model="makeConstant">
						<template v-if="makeConstant">
							Pull into new constant
						</template>
						<template v-else>
							Store directly in tool input
						</template>
					</b-switch>
				</b-field>
			</section>
			<footer class="modal-card-foot">
				<button class="button is-primary" type="button" :disabled="file === undefined || uploading" @click="upload()">Upload</button>
				<button class="button" type="button" :disabled="uploading" @click="close()">Cancel</button>
			</footer>
		</div>
	</form>
</template>

<script lang="ts">
	import { ToolManager } from '../tools';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		data() {
			return {
				file: undefined as File | undefined,
				makeConstant: false,
				uploading: false,
			};
		},
		methods: {
			upload() {
				this.uploading = true;
				const reader = new FileReader();
				reader.addEventListener('load', e => {
					const buf = Buffer.from(new Uint8Array(reader.result as ArrayBuffer));
					this.$emit('upload', this.file!.name, buf, this.makeConstant);
					this.close();
				});
				reader.addEventListener('abort', e => {
					this.uploading = false;
					this.$snackbar.open({
						message: "Upload aborted",
						type: 'is-danger',
					});
				});
				reader.addEventListener('error', e => {
					this.uploading = false;
					this.$snackbar.open({
						message: "Upload failed",
						type: 'is-danger',
					});
				});
				reader.readAsArrayBuffer(this.file!);
			},
			close() {
				//@ts-ignore
				this.$parent.close();
			},
		},
	});
</script>

<style lang="less" scoped>
	.modal-card-body {
		// height: 300px;

		> .field {
			text-align: center;

			/deep/ label {
				color: #000;
			}
		}

		.upload i {
			font-size: 24pt;
		}
	}
</style>
