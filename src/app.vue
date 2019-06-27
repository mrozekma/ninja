<template>
	<div class="app">
		<nav class="navbar is-primary">
			<div class="navbar-brand">
				<div class="navbar-item">
					<i class="fas fa-user-ninja"></i> Ninja
				</div>
			</div>
			<div class="navbar-start">
				<b-tooltip label="New" position="is-bottom">
					<a class="navbar-item navbar-toolbar-item" @click="clear"><i class="fas fa-file"></i></a>
				</b-tooltip>
				<div class="navbar-item has-dropdown is-hoverable">
					<a class="navbar-item navbar-toolbar-item"><i class="fas fa-folder-open"></i></a>
					<div class="navbar-dropdown">
						<template v-if="savedScripts.length > 0">
							<a v-for="saveName in savedScripts" :key="saveName" class="navbar-item" @click.left="loadFromLocalStorage(saveName)" @click.middle="deleteFromLocalStorage(saveName)">
								{{ saveName }}
							</a>
						</template>
						<i v-else class="navbar-item">No saved scripts to load</i>
						<hr class="navbar-divider">
						<a class="navbar-item" @click="$refs.fileUpload.click()"><i class="fas fa-upload"></i> Load from disk</a>
						<a class="navbar-item" @click="showLoadStringDialog = true"><i class="fas fa-file-upload"></i> Load from string</a>
					</div>
				</div>
				<b-tooltip label="Save" position="is-bottom">
					<a :class="['navbar-item', 'navbar-toolbar-item', {disabled: !anyTools}]" @click="startSave"><i class="fas fa-save"></i></a>
				</b-tooltip>
				<b-tooltip label="Share" position="is-bottom">
					<a :class="['navbar-item', 'navbar-toolbar-item', {disabled: !anyTools}]" @click="doSave('clipboard', '')"><i class="fas fa-share-alt"></i></a>
				</b-tooltip>
				<b-tooltip label="Run All" position="is-bottom">
					<a :class="['navbar-item', 'navbar-toolbar-item', {disabled: !anyTools}]" @click="runAll"><i class="fas fa-play-circle"></i></a>
				</b-tooltip>
			</div>
			<div class="navbar-end">
				<b-tooltip v-if="running" label="Running..." position="is-bottom">
					<div class="navbar-item navbar-toolbar-item">
						<div class="spinner"></div>
					</div>
				</b-tooltip>
				<b-tooltip v-if="errors.length > 0" :label="showErrorsPanel ? 'Hide Errors' : 'Show Errors'" position="is-bottom">
					<a class="navbar-item navbar-toolbar-item" @click="showErrorsPanel = !showErrorsPanel"><i class="fas fa-exclamation-triangle"></i><span>{{ errors.length }}</span></a>
				</b-tooltip>
			</div>
		</nav>

		<input type="file" ref="fileUpload" @change="loadFromDisk">
		<b-modal :active.sync="showLoadStringDialog" has-modal-card>
			<load-string-dialog @load="loadFromString"></load-string-dialog>
		</b-modal>
		<b-modal :active.sync="showSaveDialog" has-modal-card>
			<save-dialog @save="doSave"></save-dialog>
		</b-modal>

		<split-grid direction="column" :gutter-size="3" class="main-grid" @drag-start="data => gridDragStart('main', data.direction, data.track)" @drag-end="data => gridDragEnd('main', data.direction, data.track)">
			<split-grid-area class="col" size-unit="px" :size-value="300">
				<h1>Tools</h1>
				<div class="scroll">
					<tool-list></tool-list>
				</div>
			</split-grid-area>
			<split-grid-gutter/>
			<split-grid-area class="col" size-unit="fr" :size-value="1">
				<split-grid direction="row" :gutter-size="3" class="center-grid"  @drag-start="data => gridDragStart('center', data.direction, data.track)" @drag-end="data => gridDragEnd('center', data.direction, data.track)">
					<split-grid-area class="col scroll" size-unit="fr" :size-value="3">
						<h1>Properties</h1>
						<div>
							<property-view></property-view>
						</div>
					</split-grid-area>
					<split-grid-gutter/>
					<split-grid-area class="col scroll" size-unit="fr" :size-value="2">
						<h1>Outputs</h1>
						<div>
							<output-view></output-view>
						</div>
					</split-grid-area>
				</split-grid>
			</split-grid-area>
			<split-grid-gutter/>
			<split-grid-area class="col" size-unit="fr" :size-value="1">
				<split-grid direction="row" :gutter-size="3" class="right-grid" @drag-start="data => gridDragStart('right', data.direction, data.track)" @drag-end="data => gridDragEnd('right', data.direction, data.track)">
					<split-grid-area class="col" size-unit="fr" :size-value="1">
						<h1>Routing</h1>
						<data-flow-canvas ref="dfcanvas"></data-flow-canvas>
					</split-grid-area>
					<split-grid-gutter :show="showErrorsPanel"/>
					<split-grid-area :show="showErrorsPanel" class="col scroll" size-unit="px" :size-value="250">
						<h1>
							Errors
							<i class="fas fa-window-close" @click="showErrorsPanel = false"></i>
						</h1>
						<div>
							<errors-view :errors="errors"></errors-view>
						</div>
					</split-grid-area>
				</split-grid>
			</split-grid-area>
		</split-grid>
	</div>
</template>

<script lang="ts">
	import Vue from 'vue';

	import Buefy from 'buefy';
	// import 'buefy/dist/buefy.css';
	Vue.use(Buefy, {
		defaultIconPack: 'fas',
		// defaultSnackbarDuration: 5000,
		defaultSnackbarPosition: 'is-top',
		defaultNoticeQueue: false,
		defaultModalCanCancel: ['escape', 'outside', 'button'],
	});
	import 'typeface-montserrat';
	import '@fortawesome/fontawesome-free';
	import '@fortawesome/fontawesome-free/css/all.css';

	import { saveAs } from 'file-saver';
	import * as clipboard from 'clipboard-polyfill';

	import { RootData } from './types';
	import { ToolInst, ToolError, ToolState } from './tools';
	import toolGroups from './tools/groups';

	//@ts-ignore No declaration file
	import { SplitGrid, SplitGridArea, SplitGridGutter } from 'vue-split-grid';
	import LoadStringDialog from './components/load-string-dialog.vue';
	import SaveDialog from './components/save-dialog.vue';
	import ToolList from './components/tool-list.vue';
	import PropertyView from './components/property-view.vue';
	import OutputView from './components/output-view.vue';
	import ErrorsView from './components/errors-view.vue';
	import DataFlowCanvas from './components/data-flow-canvas.vue';
	export default Vue.extend({
		components: {
			SplitGrid, SplitGridArea, SplitGridGutter,
			LoadStringDialog, SaveDialog, ToolList, PropertyView, OutputView, ErrorsView, DataFlowCanvas,
		},
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			anyTools(): boolean {
				return this.rootData.toolManager.tools.length > 0;
			},
			running(): boolean {
				return this.rootData.toolManager.tools.some(tool => tool.state == ToolState.running);
			},
			errors(): ToolError[] {
				return Array.from(this.rootData.toolManager.iterErrors());
			},
		},
		data() {
			return {
				showErrorsPanel: false,
				showLoadStringDialog: false,
				showSaveDialog: false,
				savedScripts: [] as string[],
			};
		},
		watch: {
			async showErrorsPanel(val: boolean) {
				//@ts-ignore
				this.$refs.dfcanvas.shrink();
				await this.$nextTick();
				//@ts-ignore
				this.$refs.dfcanvas.grow();
			},
			errors(val: ToolError[]) {
				//TODO Likely don't do this, it closes the panel on every rerun
				if(val.length == 0) {
					this.showErrorsPanel = false;
				}
			},
		},
		mounted() {
			this.savedScripts = this.findSavedNames();

			const onHashChange = () => {
				if(location.hash.length > 1) {
					this.loadFromString(location.hash.substring(1));
					location.hash = '';
				}
			};
			window.addEventListener('hashchange', onHashChange);
			onHashChange();
		},
		methods: {
			findSavedNames(): string[] {
				const savedNames: string[] = [];
				for(const k of Object.keys(localStorage)) {
					if(k.startsWith('savedTool.')) {
						savedNames.push(k.replace(/^savedTool\./, ''));
					}
				}
				return savedNames.sort();
			},

			clear() {
				const old = [...this.rootData.toolManager.tools];
				this.rootData.toolManager.tools = [];
				this.rootData.selectedTool = undefined;
				this.$snackbar.open({
					message: 'Tools cleared',
					type: 'is-info',
					duration: 5000,
					actionText: 'Undo',
					onAction: () => { this.rootData.toolManager.tools = old; this.rootData.selectedTool = undefined; },
				});
			},

			loadFromDisk(e: Event) {
				const input = e.target as HTMLInputElement;
				if(input.files && input.files[0]) {
					const reader = new FileReader();
					reader.onload = () => {
						this.loadFromString(reader.result as string);
					};
					reader.readAsText(input.files[0]);
				}
				input.value = '';
			},

			loadFromLocalStorage(name: string) {
				const data = localStorage.getItem(`savedTool.${name}`);
				if(data === null) {
					throw new Error(`Bad local storage save name: ${name}`);
				}
				this.loadFromString(data);
			},

			deleteFromLocalStorage(name: string) {
				const key = `savedTool.${name}`;
				const data = localStorage.getItem(key);
				if(data === null) {
					throw new Error(`Bad local storage save name: ${name}`);
				}
				localStorage.removeItem(key);
				this.savedScripts = this.findSavedNames();
				this.$snackbar.open({
					message: `Save removed: ${name}`,
					type: 'is-info',
					duration: 5000,
					actionText: 'Undo',
					onAction: () => { localStorage.setItem(key, data); this.savedScripts = this.findSavedNames(); },
				});
			},

			loadFromString(data: string) {
				const old = [...this.rootData.toolManager.tools];
				try {
					this.rootData.toolManager.deserialize(data, toolGroups.map(group => group.tools).flat());
					this.rootData.selectedTool = undefined;
					this.$snackbar.open({
						message: 'Tools loaded',
						type: 'is-info',
						duration: 5000,
						actionText: 'Undo',
						onAction: () => { this.rootData.toolManager.tools = old; this.rootData.selectedTool = undefined; },
					});
				} catch(e) {
					console.error(e);
					this.$snackbar.open({
						message: `Failed to load: ${e.message}`,
						type: 'is-danger',
					});
				}
			},

			showNoToolsWarning() {
				this.$snackbar.open({
					message: "Script is currently empty",
					type: 'is-warning',
				});
			},

			startSave() {
				if(!this.anyTools) {
					return this.showNoToolsWarning();
				}
				this.showSaveDialog = true;
			},

			doSave(target: 'browser' | 'disk' | 'clipboard', name: string) {
				if(!this.anyTools) {
					return this.showNoToolsWarning();
				}
				// Anti-pattern ahoy
				switch(target) {
					case 'browser':
						localStorage.setItem(`savedTool.${name}`, this.rootData.toolManager.serialize('compact'));
						this.savedScripts = this.findSavedNames();
						this.$snackbar.open({
							message: "Script saved",
							type: 'is-info',
							position: 'is-top',
						});
						break;
					case 'disk':
						saveAs(new Blob([ this.rootData.toolManager.serialize('friendly') ], { type: 'text/plain' }), `${name}.ninja`);
						break;
					case 'clipboard':
						clipboard.writeText(window.location.href.split('#')[0] + '#' + this.rootData.toolManager.serialize('base64'))
							.then(() => this.$snackbar.open({
								message: "Link copied to clipboard",
								type: 'is-info',
								position: 'is-top',
							}))
							.catch(e => this.$snackbar.open({
								message: `Failed to write to clipboard (${e})`,
								type: 'is-danger',
								position: 'is-top',
							}));
						break;
				}
			},

			runAll() {
				if(!this.anyTools) {
					return this.showNoToolsWarning();
				}
				this.rootData.toolManager.updateData();
				this.$snackbar.open({
					message: 'Manually rerunning all tools',
					type: 'is-info',
					position: 'is-top',
				});
			},

			gridDragStart(grid: 'main' | 'center' | 'right', direction: 'row' | 'column', track: number) {
				// The data flow canvas will prevent its container cell from shrinking, so if dragging a gutter next to it, shrink it temporarily
				if((grid == 'main' && track == 3) || (grid == 'right' && track == 1)) {
					//@ts-ignore
					this.$refs.dfcanvas.shrink();
				}
			},

			gridDragEnd(grid: 'main' | 'center' | 'right', direction: 'row' | 'column', track: number) {
				if((grid == 'main' && track == 3) || (grid == 'right' && track == 1)) {
					//@ts-ignore
					this.$refs.dfcanvas.grow();
				}
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
		.navbar-end {
			margin-right: 10px;
		}
		.navbar-toolbar-item {
			color: #fff;
			&.disabled {
				cursor: not-allowed;
			}
			i ~ span {
				margin-left: 5px;
			}
			&:hover i {
				color: #ff3860;
			}
		}
		.navbar-dropdown .navbar-item i {
			width: 14px;
			margin-right: 5px;
		}
	}

	.app > input[type=file] {
		display: none;
	}

	.main-grid, .center-grid, .right-grid {
		height: calc(100vh - 52px);
	}

	.main-grid {
		color: #fff;

		h1 {
			display: block;
			border: solid lighten(#363636, 25%);
			border-width: 1px 0;
			padding: 10px;
			background-color: lighten(#363636, 15%);
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
				i {
					float: right;
					font-size: 16pt;
					cursor: pointer;
				}
			}
		}
	}

	.modal-card-foot {
		justify-content: flex-end;
	}

	// https://cssfx.dev/
	div.spinner {
		border: 3px solid hsla(185, 100%, 62%, 0.2);
		border-top-color: #fff;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
