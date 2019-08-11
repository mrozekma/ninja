<template>
	<canvas ref="canvas" width=200 height=200 @mousemove="mousemove" @mouseleave="mouseleave" @mousedown.left="mousedown" @mouseup.left="mouseup" @click.middle="middleclick" @wheel.prevent="wheel"></canvas>
</template>

<script lang="ts">
	import { ToolInst, ToolState, Input, Output, Point, isPoint, Viewport, ConstantTool } from '@/tools'

	import dagre from 'dagre';

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
		state: 'over-background';
		loc: Point; // Relative to canvas origin
	} | {
		state: 'dragging-background';
		loc: Point; // Relative to canvas origin
		start: Point; // Drag origin, relative to canvas origin
	} | {
		state: 'over-tool' | 'dragging-tool';
		loc: Point; // Relative to tool origin
		tool: ToolInst;
	} | {
		state: 'over-connector';
		loc: Point; // Relative to connector origin
		connector: Connector;
		valid: boolean;
	} | {
		state: 'over-indicator';
		loc: Point; // Relative to indicator origin
		layout: IndicatorLayout;
		valid: boolean;
	})

	interface ToolLayout {
		tool: ToolInst;
		rect: Rect;
		inputs: InputConnector[];
		outputs: OutputConnector[];
	}
	interface ConnectionLayout {
		source: InputConnector;
		sink: OutputConnector;
	}
	interface IndicatorLayout {
		type: 'missing' | 'constant';
		source: Connector;
		sink: Rect;
		output: Output;
	}
	interface Layout {
		tools: ToolLayout[];
		connections: ConnectionLayout[];
		indicators: IndicatorLayout[];
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
		props: {
			lockAutoLayout: {
				type: Boolean,
				required: true,
			},
		},
		computed: {
			cursor(): string {
				if(this.connecting) {
					if(this.mouse.state == 'over-connector' || this.mouse.state == 'over-indicator') {
						return this.mouse.valid ? 'pointer' : 'no-drop';
					}
					// Otherwise when connecting, always use the default cursor, even when over other things
					return 'default';
				}
				switch(this.mouse.state) {
					case 'over-tool':
					case 'dragging-tool':
						return this.lockAutoLayout ? 'default' : 'move';
					case 'over-connector':
					case 'over-indicator':
						return 'pointer';
					default:
						return 'default';
				}
			},
			layout(): Layout {
				if(this.toolManager.tools.length == 0) {
					this.resetViewport();
					return {
						tools: [],
						connections: [],
						indicators: [],
					};
				}
				if(this.lockAutoLayout) {
					this.autoLayout();
				}
				const tools = this.toolManager.tools.filter(tool => tool.loc).map(this.layoutTool);
				const [ connections, indicators ] = this.layoutConnections(tools);
				return { tools, connections, indicators };
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
				} as Viewport,
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
				if(this.lockAutoLayout) {
					this.autoLayout();
				}
			},

			async shrinkOneTick() {
				this.shrink();
				await this.$nextTick();
				this.grow();
			},

			resetViewport() {
				this.viewport.translation.x = 0;
				this.viewport.translation.y = 0;
				this.viewport.scale = 1;
			},

			padRect(rect: Rect, amt?: number) {
				const { x, y, width, height } = rect;
				if(amt === undefined) {
					amt = this.ctx.lineWidth;
				}
				if(width <= 2 * amt || height <= 2 * amt) {
					return rect;
				}
				return {
					x: x + amt,
					y: y + amt,
					width: width - 2 * amt,
					height: height - 2 * amt,
				}
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

			layoutInputs(inputs: Readonly<Input[]>, edge: Point & { width: number }): InputConnector[] {
				const rects = this.layoutConnectors(inputs.length, edge);
				return inputs.map<InputConnector>(input => ({ type: 'input', field: input, rect: rects.next().value }));
			},

			layoutOutputs(outputs: Readonly<Output[]>, edge: Point & { width: number }): OutputConnector[] {
				const rects = this.layoutConnectors(outputs.length, edge);
				return outputs.map<OutputConnector>(output => ({ type: 'output', field: output, rect: rects.next().value }));
			},

			getToolWidth(tool: ToolInst): number {
				return Math.max(
					TOOL_WIDTH,
					(2 * CONNECTOR_RADIUS + CONNECTOR_GAP) * tool.inputs.length,
					(2 * CONNECTOR_RADIUS + CONNECTOR_GAP) * tool.outputs.length,
				);
			},

			layoutTool(tool: ToolInst): ToolLayout {
				if(tool.loc === undefined) {
					throw new Error("Can't layout tool with no location");
				}
				const rect: Rect = {
					...tool.loc,
					width: this.getToolWidth(tool),
					height: TOOL_HEIGHT,
				};
				const inputs = this.layoutInputs(tool.inputs, rect);
				const outputs = this.layoutOutputs(tool.outputs, { ...rect, y: rect.y + rect.height });
				return { tool, rect, inputs, outputs };
			},

			layoutConnections(toolLayouts: ToolLayout[]): [ ConnectionLayout[], IndicatorLayout[] ] {
				const connections: ConnectionLayout[] = [];
				const indicators: IndicatorLayout[] = [];
				for(const toolLayout of toolLayouts) {
					let minX = 0;
					for(const inputCon of toolLayout.inputs) {
						if(inputCon.field.connection === undefined) {
							continue;
						}
						const output = inputCon.field.connection.output;
						if(output.tool instanceof ConstantTool) {
							this.ctx.font = `16px ${FONT}`;
							const width = this.ctx.measureText(output.tool.name).width;
							const extraPadding = 6;
							const indicator: IndicatorLayout = {
								type: 'constant',
								source: inputCon,
								sink: {
									x: Math.max(inputCon.rect.x + inputCon.rect.width / 2 - (width + extraPadding) / 2, minX), // To center this above the source, we need inputCon.rect.x + inputCon.rect.width / 2 == sink.x + sink.width / 2
									y: inputCon.rect.y - 32 - extraPadding * 2,
									width: width + extraPadding,
									height: 16 + extraPadding,
								},
								output,
							};
							indicators.push(indicator);
							minX = indicator.sink.x + indicator.sink.width + extraPadding;
						} else {
							const outputToolLayout = toolLayouts.find(layout => layout.tool === output.tool);
							const outputCon = outputToolLayout ? outputToolLayout.outputs.find(layout => layout.field === output) : undefined;
							if(outputCon) {
								connections.push({
									source: inputCon,
									sink: outputCon,
								});
							} else {
								const edge = 16;
								indicators.push({
									type: 'missing',
									source: inputCon,
									sink: {
										x: inputCon.rect.x + inputCon.rect.width / 2 - edge / 2, // To center this above the source, we need inputCon.rect.x + inputCon.rect.width / 2 == sink.x + sink.width / 2
										width: edge,
										y: inputCon.rect.y - 32,
										height: edge,
									},
									output,
								});
							}
						}
					}
				}
				return [ connections, indicators ];
			},

			autoLayout() {
				const g = new dagre.graphlib.Graph();
				g.setGraph({
					marginx: 20,
					marginy: 20,
					ranksep: 75,
				});
				g.setDefaultEdgeLabel(() => ({}));
				const locTools = this.toolManager.tools.filter(tool => tool.loc !== undefined);
				for(const tool of locTools) {
					g.setNode(tool.name, { width: this.getToolWidth(tool), height: TOOL_HEIGHT });
				}
				for(const tool of locTools) {
					for(const input of tool.inputs) {
						if(input.connection !== undefined && !(input.connection.output.tool instanceof ConstantTool)) {
							g.setEdge(input.connection.output.tool.name, input.tool.name);
						}
					}
				}
				dagre.layout(g);
				for(const tool of locTools) {
					const node = g.node(tool.name);
					tool.loc!.x = node.x;
					tool.loc!.y = node.y;
				}

				const dpr = window.devicePixelRatio || 1;
				let { width, height } = g.graph();
				// Margins (dagre doesn't put nodes flush at (0, 0))
				width! += 80; height! += 80;
				const scale = Math.min(this.canvas.width / dpr / width!, this.canvas.height / dpr / height!);
				this.viewport = {
					translation: {
						x: 0,
						y: 0,
					},
					scale,
				};
			},

			draw() {
				// Clear
				this.ctx.save();
				this.ctx.setTransform(1, 0, 0, 1, 0, 0);
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				this.ctx.restore();

				// Draw tools
				for(const layout of this.layout.tools) {
					this.drawTool(layout);
				}

				// Draw line between tool connectors
				for(const layout of this.layout.connections) {
					this.drawConnection(layout.source, layout.sink, layout.source.field.connection!.upToDate);
				}

				for(const layout of this.layout.indicators) {
					this.drawIndicator(layout);
				}

				// Draw watchpoints
				for(const layout of this.layout.tools) {
					for(const { field, rect } of [...layout.inputs, ...layout.outputs]) {
						if(field.watch) {
							this.ctx.fillStyle = '#714dd2';
							this.ctx.beginPath();
							this.ctx.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, CONNECTOR_RADIUS - 1, 0, 2 * Math.PI);
							this.ctx.fill();
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
								x: this.mouse.tool.loc!.x + this.mouse.loc.x,
								y: this.mouse.tool.loc!.y + this.mouse.loc.y,
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
						case 'over-indicator':
							// Snap to bottom-center of rectangle
							const rect = this.mouse.layout.sink;
							loc = {
								x: rect.x + rect.width / 2,
								y: rect.y + rect.height,
							};
							break;
					}
					if(loc) {
						this.drawConnection(this.connecting, loc);
					}
				}

				if(process.env.NODE_ENV === 'development') {
					this.ctx.save();
					this.ctx.setTransform(1, 0, 0, 1, 0, 0);
					this.ctx.fillStyle = '#fff';
					this.text(`(${this.viewport.translation.x}, ${this.viewport.translation.y}) x ${this.viewport.scale}`, {x: 0, y: 0, width: this.canvas.width, height: this.canvas.height}, 10, 'left', 'bottom');
					this.ctx.restore();
				}
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

			getStyleForType(type: (Input | Output)["type"]): { stroke: string, fill: string, shape: 'circle' | 'rect' } {
				const hue: number = (() => {
					switch(type) {
						case 'string':
						case 'string[]':
						case 'enum':
						case 'enum[]':
							return 348;
						case 'boolean':
						case 'boolean[]':
							return 60;
						case 'number':
						case 'number[]':
							return 120;
						case 'bytes':
							return 240;
					}
				})();
				return {
					stroke: `hsl(${hue}, 100%, 31%)`,
					fill: `hsl(${hue}, 100%, 61%)`,
					shape: type.endsWith('[]') ? 'rect' : 'circle',
				};
			},

			drawTool(layout: ToolLayout) {
				const { x, y, width, height } = layout.rect;
				const { color, icon } = this.getStyleForState(layout.tool.state);

				this.ctx.lineWidth = 3;
				this.ctx.beginPath();
				this.ctx.moveTo(x, y);

				// Top
				for(const { field, rect } of layout.inputs) {
					this.ctx.lineTo(rect.x - this.ctx.lineWidth / 2, y);
					if(field.type.endsWith('[]')) {
						this.ctx.lineTo(rect.x - this.ctx.lineWidth / 2, y + rect.height / 2 + this.ctx.lineWidth / 2);
						this.ctx.lineTo(rect.x + rect.width + this.ctx.lineWidth / 2, y + rect.height / 2 + this.ctx.lineWidth / 2);
						this.ctx.lineTo(rect.x + rect.width + this.ctx.lineWidth / 2, y);
					} else {
						this.ctx.arc(rect.x + rect.width / 2, y, (rect.width + this.ctx.lineWidth) / 2, Math.PI, 0, true);
					}
				}
				this.ctx.lineTo(x + width, y);

				// Right
				this.ctx.lineTo(x + width, y + height);

				// Bottom. These are drawn right-to-left, so need to process the outputs in reverse
				for(const { field, rect } of reversed(layout.outputs)) {
					this.ctx.lineTo(rect.x + rect.width, y + height);
					if(field.type.endsWith('[]')) {
						this.ctx.lineTo(rect.x + rect.width, y + height + rect.height / 2);
						this.ctx.lineTo(rect.x, y + height + rect.height / 2);
						this.ctx.lineTo(rect.x, y + height);
					} else {
						this.ctx.arc(rect.x + rect.width / 2, y + height, rect.width / 2, 0, Math.PI, false);
					}
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
					this.ctx.fillStyle = '#fff';
					this.text(icon, this.padRect(layout.rect), 12, 'right', 'bottom', false, 'FontAwesome');
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
						y: rect.y + 10,
						width: rect.width + 2 * textPad,
						height: 1,
					}, 10, 'center', 'top');
				}
				for(const { field, rect } of layout.outputs) {
					const paddedRect = {
						x: rect.x - textPad,
						y: rect.y - 10,
						width: rect.width + 2 * textPad,
						height: 1,
					}
					this.text(field.name, paddedRect, 10, 'center', 'top');
					if(field.type == 'boolean') {
						const [ icon, color ] = field.val ? [ '\uf00c', '#57ff5a' ] : [ '\uf00d', '#ffdd57' ];
						this.ctx.fillStyle = color;
						this.text(icon, { ...paddedRect, y: paddedRect.y - 8}, 8, 'center', 'top', false, 'FontAwesome');
					}
				}
			},

			drawConnection(source: Connector, sink: Connector | Point, upToDate: boolean = true, drawSinkpoint: boolean = true) {
				const sourceCenter = {
					x: source.rect.x + source.rect.width / 2,
					y: source.rect.y + source.rect.height / 2,
				};
				const sinkCenter = isPoint(sink) ? sink : {
					x: sink.rect.x + sink.rect.width / 2,
					y: sink.rect.y + sink.rect.height / 2,
				};

				const sourceStyle = this.getStyleForType(source.field.type);
				const sinkStyle = isPoint(sink) ? sourceStyle : this.getStyleForType(sink.field.type);

				// Line between the connectors
				//TODO Bend differently if the output tool is below the input tool
				this.ctx.beginPath();
				this.ctx.moveTo(sourceCenter.x, sourceCenter.y);
				const cpDist = Math.min(50, Math.abs(sourceCenter.y - sinkCenter.y) / 1.5);
				this.ctx.bezierCurveTo(
					sourceCenter.x, sourceCenter.y + (source.type == 'input' ? -cpDist : cpDist),
					sinkCenter.x, sinkCenter.y + (source.type == 'input' ? cpDist : -cpDist),
					sinkCenter.x, sinkCenter.y,
				);
				if(!upToDate) {
					this.ctx.strokeStyle = '#888';
				} else {
					const grad = this.ctx.createLinearGradient(sourceCenter.x, sourceCenter.y, sinkCenter.x, sinkCenter.y);
					grad.addColorStop(0, sourceStyle.stroke);
					grad.addColorStop(1, sinkStyle.stroke);
					this.ctx.strokeStyle = grad;
				}
				// this.ctx.strokeStyle = upToDate ? style.stroke : '#888';
				this.ctx.stroke();

				// Connector endpoints (these are drawn after the line so the fill is on top)
				const drawEndpoint = (center: Point, style: typeof sourceStyle) => {
					this.ctx.fillStyle = upToDate ? style.fill : '#aaa';
					switch(style.shape) {
						case 'rect':
							this.ctx.strokeRect(center.x - CONNECTOR_RADIUS + 1, center.y - CONNECTOR_RADIUS + 1, CONNECTOR_RADIUS * 2 - 2, CONNECTOR_RADIUS * 2 - 2);
							this.ctx.fillRect(center.x - CONNECTOR_RADIUS + 1, center.y - CONNECTOR_RADIUS + 1, CONNECTOR_RADIUS * 2 - 2, CONNECTOR_RADIUS * 2 - 2);
							break;
						case 'circle':
							this.ctx.beginPath();
							this.ctx.arc(center.x, center.y, CONNECTOR_RADIUS - 1, 0, 2 * Math.PI);
							this.ctx.stroke();
							this.ctx.fill();
							break;
					}
				};
				drawEndpoint(sourceCenter, sourceStyle);
				if(drawSinkpoint) {
					drawEndpoint(sinkCenter, sinkStyle);
				}
			},

			drawIndicator(layout: IndicatorLayout) {
				switch(layout.type) {
					case 'missing':
						this.drawConnection(layout.source, {
							x: layout.sink.x + layout.sink.width / 2,
							y: layout.sink.y + layout.sink.height,
						}, false, false);
						this.ctx.fillStyle = '#888';
						this.text('\uf057', layout.sink, 16, 'center', 'bottom', false, 'FontAwesome');
						break;
					case 'constant':
						this.drawConnection(layout.source, {
							x: layout.sink.x + layout.sink.width / 2,
							y: layout.sink.y + layout.sink.height,
						}, true, false);
						// this.ctx.save();
						// this.ctx.rotate(-Math.PI / 2);
						// const rect: Rect = {
						// 	x: -layout.sink.y,
						// 	y: layout.sink.x,
						// 	width: layout.sink.width,
						// 	height: layout.sink.height,
						// };
						const style = this.getStyleForType(layout.output.type);
						this.ctx.fillStyle = style.fill;
						this.ctx.fillRect(layout.sink.x, layout.sink.y, layout.sink.width, layout.sink.height);
						this.ctx.lineWidth = 1;
						this.ctx.strokeStyle = style.stroke;
						this.ctx.strokeRect(layout.sink.x, layout.sink.y, layout.sink.width, layout.sink.height);
						this.ctx.fillStyle = '#fff';
						this.text(layout.output.tool.name, this.padRect(layout.sink, this.ctx.lineWidth), 16, 'center', 'middle', false);
						this.ctx.lineWidth = 3;
						// this.ctx.restore();
						break;
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
				for(const { tool, rect, inputs, outputs } of reversed(this.layout.tools)) {
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

				for(const layout of this.layout.indicators) {
					if(layout.type == 'constant' && pointInRect(loc, layout.sink)) {
						return this.mouse = {
							state: 'over-indicator',
							loc: pointRelativeTo(loc, layout.sink),
							layout,
							valid: !this.connecting || (this.connecting.type == 'input'),
						};
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
						if(this.layout.tools.length > 0) {
							this.mouse = {
								state: 'dragging-background',
								loc: this.mouse.loc,
								start: { // Convert back to untranslated coordinates
									x: e.offsetX - this.viewport.translation.x * this.viewport.scale,
									y: e.offsetY - this.viewport.translation.y * this.viewport.scale,
								},
							};
						}
						if(this.connecting) {
							this.connecting = undefined;
						} else {
							this.toolManager.selectedTool = undefined;
						}
						break;
					case 'over-tool':
						if(!this.lockAutoLayout) {
							this.mouse.state = 'dragging-tool';
						}
						this.toolManager.selectedTool = this.mouse.tool;
						break;
					case 'over-connector':
						if(!this.mouse.valid) {
							return;
						}
						//TODO Handle dragging a connection instead of clicking the connectors separately
						if(e.ctrlKey) {
							this.mouse.connector.field.watch = !this.mouse.connector.field.watch;
						} else if(this.connecting) {
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
					case 'over-indicator':
						if(!this.mouse.valid) {
							// Ignore
						} else if(this.connecting) {
							this.toolManager.connect(this.connecting.field as Input, this.mouse.layout.output);
							this.connecting = undefined;
						} else {
							this.toolManager.selectedTool = this.mouse.layout.output.tool;
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
				switch(this.mouse.state) {
					case 'over-background':
						this.resetViewport();
						break;
					case 'over-tool':
						this.toolManager.removeTool(this.mouse.tool);
						break;
					case 'over-indicator':
						if(this.mouse.layout.type == 'constant') {
							this.disconnect(this.mouse.layout.source as InputConnector);
						}
						break;
				}
			},

			wheel(e: WheelEvent) {
				if(this.layout.tools.length > 0) {
					if(e.ctrlKey) {
						this.viewport.scale -= e.deltaY / 200;
					} else {
						this.viewport.translation.x -= e.deltaX;
						this.viewport.translation.y -= e.deltaY;
					}
				}
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
