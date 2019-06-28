<template>
	<canvas ref="canvas" width=200 height=200 @mousemove="mousemove" @mouseleave="mouseleave" @mousedown.left="mousedown" @mouseup.left="mouseup" @click.middle="middleclick" @wheel="wheel">
		{{ canvas }}
	</canvas>
</template>

<script lang="ts">
	//TODO Autolayout: https://github.com/dagrejs/dagre/wiki https://www.npmjs.com/package/elkjs
	import { Point, isPoint } from '@/types';
	import { ToolInst, ToolState, Input, Output } from '@/tools'

	interface Rect extends Point {
		width: number;
		height: number;
	}

	function pointInRect(pt: Point, rect: Rect): boolean {
		return pt.x >= rect.x && pt.y >= rect.y && pt.x < rect.x + rect.width && pt.y < rect.y + rect.height;
	}

	function pointRelativeTo(pt: Point, base: Point): Point {
		return {
			x: pt.x - base.x,
			y: pt.y - base.y,
		}
	}

	interface InputConnector {
		type: 'input';
		field: Input;
		rect: Rect;
	}
	interface OutputConnector {
		type: 'output';
		field: Output;
		rect: Rect;
	}
	type Connector = InputConnector | OutputConnector;

	type Mouse = ({
		state: 'off-canvas';
	} | {
		state: 'over-background',
		loc: Point, // Relative to canvas origin
	} | {
		state: 'dragging-background',
		loc: Point, // Relative to canvas origin
		start: Point, // Drag origin, relative to canvas origin
	} | {
		state: 'over-tool' | 'dragging-tool',
		loc: Point, // Relative to tool origin
		tool: ToolInst,
	} | {
		state: 'over-connector',
		loc: Point, // Relative to connector origin
		connector: Connector,
		valid: boolean,
	})

	interface ToolLayout {
		tool: ToolInst;
		rect: Rect;
		inputs: InputConnector[];
		outputs: OutputConnector[];
	}

	function* reversed<T>(arr: T[]): IterableIterator<T> {
		for(let i = arr.length - 1; i >= 0; i--) {
			yield arr[i];
		}
	}

	const FONT = 'Arial';
	const TOOL_WIDTH = 100, TOOL_HEIGHT = 75, CONNECTOR_RADIUS = 4, CONNECTOR_GAP = 15;

	//@ts-ignore
	import faFontUrl from '../../node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2';
	const fontAwesomePromise = new FontFace('FontAwesome', `url('${faFontUrl}')`).load().then(font => {
		document.fonts.add(font);
	});

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		computed: {
			cursor(): string {
				if(this.connecting) {
					if(this.mouse.state == 'over-connector') {
						return this.mouse.valid ? 'pointer' : 'no-drop';
					}
					// Otherwise when connecting, always use the default cursor, even when over other things
					return 'default';
				}
				switch(this.mouse.state) {
					case 'over-tool':
					case 'dragging-tool':
						return 'move';
					case 'over-connector':
						return 'pointer';
					default:
						return 'default';
				}
			},
			layout(): ToolLayout[] {
				return this.toolManager.tools.map(this.layoutTool);
			},
		},
		data() {
			return {
				// canvas and ctx get set in mounted(), so I'm pretending that they're never undefined because after a certain point that's true
				canvas: undefined as unknown as HTMLCanvasElement,
				ctx: undefined as unknown as CanvasRenderingContext2D,
				viewport: {
					translation: { x: 0, y: 0 } as Point,
					scale: 1.0,
				},
				mouse: { state: 'off-canvas' } as Mouse,
				connecting: undefined as Connector | undefined, // One side of a currently pending connection
			};
		},
		watch: {
			cursor(val: string) {
				this.canvas.style.cursor = val;
			},
		},
		mounted() {
			this.canvas = this.$refs.canvas as HTMLCanvasElement;
			this.ctx = this.canvas.getContext('2d')!;

			window.addEventListener('resize', () => this.grow());

			// Call these functions reactively when their dependencies change
			for(const fn of [ this.setupCanvas, this.draw ]) {
				this.$watch(() => { fn() }, () => fn());
			}
			// Shrink until the parent has laid out its grid, to avoid taking up the maximum amount of space
			this.shrink();
			// Re-draw after FontAwesome is loaded
			fontAwesomePromise.then(() => this.draw());
		},
		methods: {
			setupCanvas() {
				//TODO Deal with nodes that are now off-screen
				const dpr = window.devicePixelRatio || 1;
				if(!this.canvas.parentElement) {
					return;
				}
				const colRect = this.canvas.parentElement.getBoundingClientRect();
				// Save space for the header
				const width = colRect.width, height = colRect.height - 55;
				this.canvas.width = width * dpr;
				this.canvas.height = height * dpr;
				this.canvas.style.width = width + 'px';
				this.canvas.style.height = height + 'px';

				const scale = this.viewport.scale * dpr;
				// this.ctx.setTransform(scale, 0, 0, scale, this.viewport.translation.x, this.viewport.translation.y);
				this.ctx.scale(scale, scale);
				this.ctx.translate(this.viewport.translation.x, this.viewport.translation.y);

				this.draw();
			},

			shrink() {
				this.canvas.width = this.canvas.height = 1;
				this.canvas.style.width = this.canvas.style.height = '1px';
			},

			grow() {
				this.setupCanvas();
			},

			*layoutConnectors(num: number, edge: Point & { width: number }): IterableIterator<Rect> {
				// Connectors are 2 * CONNECTOR_RADIUS wide with CONNECTOR_GAP space between them.
				// These are nonsense if num is 0, but they're also not used
				const connectorTotalWidth = (2 * CONNECTOR_RADIUS + CONNECTOR_GAP) * num - CONNECTOR_GAP;
				let pos = Math.floor((edge.width - connectorTotalWidth) / 2);
				for(; num >= 0; num--) {
					// 'pos' is the leftmost point of the connector circle whose center is along 'edge'. We want the rectangle inscribing that circle
					yield {
						x: edge.x + pos,
						y: edge.y - CONNECTOR_RADIUS,
						width: 2 * CONNECTOR_RADIUS,
						height: 2 * CONNECTOR_RADIUS,
					};
					pos += 2 * CONNECTOR_RADIUS + CONNECTOR_GAP;
				}
			},

			layoutInputs(inputs: Input[], edge: Point & { width: number }): InputConnector[] {
				const rects = this.layoutConnectors(inputs.length, edge);
				return inputs.map<InputConnector>(input => ({ type: 'input', field: input, rect: rects.next().value }));
			},

			layoutOutputs(outputs: Output[], edge: Point & { width: number }): OutputConnector[] {
				const rects = this.layoutConnectors(outputs.length, edge);
				return outputs.map<OutputConnector>(output => ({ type: 'output', field: output, rect: rects.next().value }));
			},

			layoutTool(tool: ToolInst): ToolLayout {
				const rect: Rect = { ...tool.loc, width: TOOL_WIDTH, height: TOOL_HEIGHT };
				return {
					tool,
					rect,
					inputs: this.layoutInputs(tool.inputs, rect),
					outputs: this.layoutOutputs(tool.outputs, { ...rect, y: rect.y + rect.height }),
				};
			},

			draw() {
				// Clear
				this.ctx.save();
				this.ctx.setTransform(1, 0, 0, 1, 0, 0);
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				this.ctx.restore();

				// Draw tools
				for(const layout of this.layout) {
					this.drawTool(layout);
				}

				// Draw line between tool connectors
				for(const layout of this.layout) {
					for(const inputCon of layout.inputs) {
						if(inputCon.field.connection) {
							const output: Output = inputCon.field.connection.output;
							const outputLayout = this.layout.find(layout => layout.tool == output.tool)!;
							const outputCon = outputLayout.outputs.find(con => con.field == output);
							this.drawConnection(inputCon, outputCon, inputCon.field.connection.upToDate);
						}
					}
				}

				// Draw line between tool connector and mouse
				if(this.connecting) {
					let loc: Point | undefined = undefined;
					switch(this.mouse.state) {
						case 'over-background':
							loc = this.mouse.loc;
							break;
						case 'over-tool':
							loc = {
								x: this.mouse.tool.loc.x + this.mouse.loc.x,
								y: this.mouse.tool.loc.y + this.mouse.loc.y,
							};
							break;
						case 'over-connector':
							// Snap to center of connector
							const connector = this.mouse.connector.rect;
							loc = {
								x: connector.x + connector.width / 2,
								y: connector.y + connector.height / 2,
							};
							break;
					}
					if(loc) {
						this.drawConnection(this.connecting, loc);
					}
				}

				this.ctx.save();
				this.ctx.setTransform(1, 0, 0, 1, 0, 0);
				// this.ctx.strokeStyle = '#f00';
				// this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
				this.ctx.fillStyle = '#fff';
				this.text(`(${this.viewport.translation.x}, ${this.viewport.translation.y}) x ${this.viewport.scale}`, {x: 0, y: 0, width: this.canvas.width, height: this.canvas.height}, 10, 'left', 'bottom');
				this.ctx.restore();
			},

			findFontSize(font: string, text: string, rect: Rect, max?: number) {
				if(max === undefined) {
					for(max = 100; ; max += 100) {
						this.ctx.font = `${max}px ${font}`;
						const measure = this.ctx.measureText(text);
						const width = measure.width, height = (measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent) || max;
						if(width >= rect.width || height >= rect.height) {
							break;
						}
					}
				}

				//TODO Smarter iteration based on how far the text overflows the rect
				for(let size = max; ; size--) {
					if(size <= 0) {
						return 1;
					}
					this.ctx.font = `${size}px ${FONT}`;
					const measure = this.ctx.measureText(text);
					const width = measure.width, height = (measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent) || this.ctx.measureText('M').width;
					if(width <= rect.width && height <= rect.height) {
						return size;
					}
				}
			},

			text(text: string, rect: Rect, size: number, halign: 'left' | 'center' | 'right' = 'left', valign: 'top' | 'middle' | 'bottom' = 'top', scale: boolean = false, font: string = FONT) {
				if(scale) {
					size = this.findFontSize(font, text, rect, size);
				}
				this.ctx.font = `${size}px ${font}`;
				const measure = this.ctx.measureText(text);
				const width = measure.width, height = (measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent) || this.ctx.measureText('M').width;
				if(width > rect.width) { halign = 'left'; }
				if(height > rect.height) { valign = 'top'; }
				const x = rect.x + {
					left: 0,
					center: (rect.width - width) / 2,
					right: rect.width - width,
				}[halign];
				const y = rect.y + height + {
					top: 0,
					middle: (rect.height - height) / 2,
					bottom: rect.height - height,
				}[valign];
				this.ctx.fillText(text, x, y);
				// this.ctx.strokeRect(x, y, width, -height);
			},

			getStyleForState(state: ToolState): { color: string; icon?: string } {
				switch(state) {
					case ToolState.good:
						return {
							color: '#ff3860',
						};
					case ToolState.stale:
						return {
							color: '#aaa',
						};
					case ToolState.running:
						return {
							color: '#714dd2',
							icon: '\uf252', // hourglass-half
						};
					case ToolState.failed:
					case ToolState.badInputs:
						return {
							color: '#ffdd57',
							icon: '\uf071' // exclamation-triangle
						};
					case ToolState.cycle:
						return {
							color: '#ffa51f',
							// icon: '\uf363', // recycle (pro)
							icon: '\uf079', // retweet
						};
				}
			},

			drawTool(layout: ToolLayout) {
				const { x, y, width, height } = layout.rect;
				const { color, icon } = this.getStyleForState(layout.tool.state);

				this.ctx.lineWidth = 3;
				this.ctx.beginPath();
				this.ctx.moveTo(x, y);

				// Top
				for(const { rect } of layout.inputs) {
					this.ctx.lineTo(rect.x, y);
					this.ctx.arc(rect.x + rect.width / 2, y, rect.width / 2, Math.PI, 0, true);
				}
				this.ctx.lineTo(x + width, y);

				// Right
				this.ctx.lineTo(x + width, y + height);

				// Bottom. These are drawn right-to-left, so need to process the outputs in reverse
				for(const { rect } of reversed(layout.outputs)) {
					this.ctx.lineTo(rect.x + rect.width, y + height);
					this.ctx.arc(rect.x + rect.width / 2, y + height, rect.width / 2, 0, Math.PI, false);
				}
				this.ctx.lineTo(x, y + height);

				// Left
				this.ctx.lineTo(x, y - 1.5); //TODO I think this -1.5 is affected by the scale

				// Draw the tool
				this.ctx.shadowBlur = (layout.tool == this.toolManager.selectedTool) ? 10 : 0;
				this.ctx.shadowColor = '#fff';
				this.ctx.strokeStyle = '#fff';
				this.ctx.stroke();
				// 	const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
				// 	for(let i = 0; i + .05 <= 1; i += .1) {
				// 		grad.addColorStop(i, 'hsl(348, 100%, 61%)');
				// 		grad.addColorStop(i + .05, 'hsl(348, 100%, 70%)');
				// 	}
				// 	this.ctx.fillStyle = grad;
				this.ctx.fillStyle = color;
				this.ctx.fill();
				this.ctx.shadowBlur = 0;

				if(icon) {
					const paddedRect: Rect = {
						x: x + 3,
						y: y + 3,
						width: width - 6,
						height: height - 6,
					}
					this.ctx.fillStyle='#fff';
					this.text(icon, paddedRect, 12, 'right', 'bottom', false, 'FontAwesome');
				}

				// Find an inner rectangle within the main tool rectangle that avoids edges and connector labels
				const innerTextRect: Rect = {
					x: x + 3,
					width: width - 6,
					y: y + 14,
					height: height - 26,
				};
				// this.ctx.strokeRect(innerTextRect.x, innerTextRect.y, innerTextRect.width, innerTextRect.height);

				// Draw tool and connector labels
				this.ctx.fillStyle = '#fff';
				const textPad = 5;
				this.text(layout.tool.name, innerTextRect, 24, 'center', 'middle', true);
				for(const { field, rect } of layout.inputs) {
					this.text(field.name, {
						x: rect.x - textPad,
						y: rect.y + 9,
						width: rect.width + 2 * textPad,
						height: 1,
					}, 10, 'center', 'top');
				}
				for(const { field, rect } of layout.outputs) {
					this.text(field.name, {
						x: rect.x - textPad,
						y: rect.y - 9,
						width: rect.width + 2 * textPad,
						height: 1,
					}, 10, 'center', 'top');
				}
			},

			drawConnection(source: Connector, sink?: Connector | Point, upToDate: boolean = true) {
				const sourceCenter = {
					x: source.rect.x + source.rect.width / 2,
					y: source.rect.y + source.rect.height / 2,
				};
				const sinkCenter = !sink ? undefined : isPoint(sink) ? sink : {
					x: sink.rect.x + sink.rect.width / 2,
					y: sink.rect.y + sink.rect.height / 2,
				};

				// Line between the connectors
				//TODO Bend differently if the output tool is below the input tool
				this.ctx.beginPath();
				this.ctx.moveTo(sourceCenter.x, sourceCenter.y);
				if(sinkCenter) {
					this.ctx.bezierCurveTo(
						sourceCenter.x, sourceCenter.y + (source.type == 'input' ? -50 : 50),
						sinkCenter.x, sinkCenter.y + (source.type == 'input' ? 50 : -50),
						sinkCenter.x, sinkCenter.y,
					);
				} else {
					this.ctx.lineTo(sourceCenter.x, sourceCenter.y + (source.type == 'input' ? -32 : 32));
				}
				this.ctx.strokeStyle = upToDate ? 'hsl(348, 100%, 31%)' : '#888';
				this.ctx.stroke();

				// Connector endpoints (these are drawn after the line so the fill is on top)
				for(const point of [sourceCenter, sinkCenter]) {
					this.ctx.fillStyle = upToDate ? 'hsl(348, 100%, 61%)' : '#aaa';
					if(point) {
						this.ctx.beginPath();
						this.ctx.arc(point.x, point.y, CONNECTOR_RADIUS - 1, 0, 2 * Math.PI);
						this.ctx.stroke();
						this.ctx.fill();
					} else {
						const rect: Rect = {
							x: sourceCenter.x - 8,
							width: 16,
							y: sourceCenter.y - 48,
							height: 16,
						}
						this.ctx.fillStyle = '#888';
						this.text('\uf057', rect, 16, 'center', 'bottom', false, 'FontAwesome');
					}
				}
			},

			mousemove(e: MouseEvent) {
				const loc: Point = {
					x: e.offsetX / this.viewport.scale - this.viewport.translation.x,
					y: e.offsetY / this.viewport.scale - this.viewport.translation.y,
				};

				// If currently dragging, that continues
				if(this.mouse.state == 'dragging-background') {
					// Translation uses untranslated coordinates (since changing the translation would change the coordinates)
					const loc: Point = {
						x: e.offsetX,
						y: e.offsetY,
					};
					const rel = pointRelativeTo(loc, this.mouse.start);
					this.viewport.translation = {
						x: rel.x / this.viewport.scale,
						y: rel.y / this.viewport.scale,
					};
					return;
				} else if(this.mouse.state == 'dragging-tool') {
					this.mouse.tool.loc = pointRelativeTo(loc, this.mouse.loc);
					return;
				}

				// Figure out what the mouse is currently over. Since tools are drawn in order, later tools end up on top of earlier tools, so we use the latest match in the layout
				for(const { tool, rect, inputs, outputs } of reversed(this.layout)) {
					for(const connector of [...inputs, ...outputs]) {
						if(pointInRect(loc, connector.rect)) {
							return this.mouse = {
								state: 'over-connector',
								connector,
								loc: pointRelativeTo(loc, connector.rect),
								valid: !this.connecting || (this.connecting.type != connector.type && this.connecting.field.tool != connector.field.tool),
							}
						}
					}
					if(pointInRect(loc, rect)) {
						return this.mouse = {
							state: 'over-tool',
							tool,
							loc: pointRelativeTo(loc, rect),
						}
					}
				}

				this.mouse = {
					state: 'over-background',
					loc,
				};
			},

			mouseleave() {
				this.mouse = {
					state: 'off-canvas',
				};
				this.connecting = undefined;
			},

			mousedown(e: MouseEvent) {
				switch(this.mouse.state) {
					case 'over-background':
						this.mouse = {
							state: 'dragging-background',
							loc: this.mouse.loc,
							start: { // Convert back to untranslated coordinates
								x: e.offsetX - this.viewport.translation.x * this.viewport.scale,
								y: e.offsetY - this.viewport.translation.y * this.viewport.scale,
							},
						};
						if(this.connecting) {
							this.connecting = undefined;
						} else {
							this.toolManager.selectedTool = undefined;
						}
						break;
					case 'over-tool':
						this.mouse.state = 'dragging-tool';
						this.toolManager.selectedTool = this.mouse.tool;
						break;
					case 'over-connector':
						if(!this.mouse.valid) {
							return;
						}
						//TODO Handle dragging a connection instead of clicking the connectors separately
						if(this.connecting) {
							// Second half of the connection
							const con1 = this.connecting, con2 = this.mouse.connector;
							if(con1.type == 'input' && con2.type == 'output') {
								this.connect(con1, con2);
							} else if(con2.type == 'input' && con1.type == 'output') {
								this.connect(con2, con1);
							}
							this.connecting = undefined;
						} else if(this.mouse.connector.type == 'input' && this.mouse.connector.field.connection !== undefined) {
							// Clicking connected input; break the connection
							this.disconnect(this.mouse.connector);
						} else {
							// First half of the connection
							this.connecting = this.mouse.connector;
						}
						break;
				}
			},

			mouseup(e: MouseEvent) {
				switch(this.mouse.state) {
					case 'dragging-background':
						this.mouse = {
							state: 'over-background',
							loc: this.mouse.loc,
						};
						break;
					case 'dragging-tool':
						this.mouse.state = 'over-tool';
						break;
				}
			},

			middleclick(e: MouseEvent) {
				if(this.mouse.state == 'over-tool') {
					this.toolManager.removeTool(this.mouse.tool);
				}
			},

			wheel(e: WheelEvent) {
				this.viewport.scale -= e.deltaY / 200;
			},

			connect(inputCon: InputConnector, outputCon: OutputConnector) {
				this.toolManager.connect(inputCon.field, outputCon.field);
			},

			disconnect(inputCon: InputConnector) {
				if(inputCon.field.connection === undefined) {
					return false;
				} else {
					this.toolManager.disconnect(inputCon.field);
					return true;
				}
			},
		},
	});
</script>

<style lang="less" scoped>
	canvas {
		// Buefy changes all box-sizing to border-box, which for some unknown reason makes the canvas blurry
		box-sizing: content-box;
	}
</style>
