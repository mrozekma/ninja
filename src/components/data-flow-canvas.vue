<template>
	<canvas ref="canvas" width=200 height=200 @mousemove="mousemove" @mouseleave="mouseleave" @mousedown="mousedown" @mouseup="mouseup" @mousedown.right="test">
		{{ canvas }}
	</canvas>
</template>

<script lang="ts">
	//TODO Autolayout: https://github.com/dagrejs/dagre/wiki https://www.npmjs.com/package/elkjs
	import { Point, isPoint, RootData } from '@/types';
	import { ToolInst, Input, Output, updateData } from '@/tools'

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
		state: 'over-tool' | 'dragging-tool',
		loc: Point, // Relative to tool origin
		tool: ToolInst,
	} | {
		state: 'over-connector',
		loc: Point, // Relative to connector origin
		connector: Connector,
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

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		computed: {
			rootData(): RootData {
				//@ts-ignore
				return this.$root;
			},
			cursor(): string {
				if(this.connecting) {
					if(this.mouse.state == 'over-connector') {
						const con1 = this.mouse.connector, con2 = this.connecting;
						// Check if this is a valid second connector
						return (con1.type == con2.type || con1.field.tool == con2.field.tool) ? 'no-drop' : 'pointer';
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
				return this.rootData.tools.map(this.layoutTool);
			},
		},
		data() {
			return {
				// canvas and ctx get set in mounted(), so I'm pretending that they're never undefined because after a certain point that's true
				canvas: undefined as unknown as HTMLCanvasElement,
				ctx: undefined as unknown as CanvasRenderingContext2D,
				mouse: { state: 'off-canvas' } as Mouse,
				connecting: undefined as Connector | undefined, // One side of a currently pending connection
			};
		},
		watch: {
			cursor(val: string) {
				console.log(val);
				this.canvas.style.cursor = val;
			},
		},
		mounted() {
			this.canvas = this.$refs.canvas as HTMLCanvasElement;
			this.ctx = this.canvas.getContext('2d')!;
			this.setupCanvas();

			window.addEventListener('resize', () => this.grow());

			//TODO Is there a way to detect these dependencies? It seems like there should be
			for(const dep of ['rootData.tools', 'rootData.selectedTool', 'mouse', 'connecting']) {
				this.$watch(dep, this.draw, { deep: true });
			}
			this.draw();
		},
		methods: {
			setupCanvas() {
				//TODO Panning/zooming
				//TODO Deal with nodes that are now off-screen
				const dpr = window.devicePixelRatio || 1;
				if(!this.canvas.parentElement) {
					return;
				}
				const colRect = this.canvas.parentElement.getBoundingClientRect();
				// Save space for the header
				const width = colRect.width, height = colRect.height - 50;
				this.canvas.width = width * dpr;
				this.canvas.height = height * dpr;
				this.canvas.style.width = width + 'px';
				this.canvas.style.height = height + 'px';
				this.ctx.scale(dpr, dpr);
				// this.ctx.translate(.5, .5); // https://stackoverflow.com/a/13294650/309308
				// this.ctx.lineJoin = 'round';
			},

			shrink() {
				this.canvas.width = this.canvas.height = 1;
				this.canvas.style.width = this.canvas.style.height = '1px';
			},

			grow() {
				this.setupCanvas();
				this.draw();
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

				// let tools = this.rootData.tools;
				// if(this.rootData.selectedTool && this.rootData.selectedTool.ephemeral) {
				// 	tools = [...tools, this.rootData.selectedTool];
				// }

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
							const outputCon = outputLayout.outputs.find(con => con.field == output)!;
							this.drawConnection(inputCon, outputCon);
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
							// pt - base
							// I want tool loc + mouse loc
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
			},

			findFontSize(text: string, rect: Rect, max?: number) {
				if(max === undefined) {
					for(max = 100; ; max += 100) {
						this.ctx.font = `${max}px ${FONT}`;
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

			text(text: string, rect: Rect, size: number, halign: 'left' | 'center' | 'right' = 'left', valign: 'top' | 'middle' | 'bottom' = 'top', scale: boolean = false) {
				if(scale) {
					size = this.findFontSize(text, rect, size);
				}
				this.ctx.font = `${size}px ${FONT}`;
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

			drawTool(layout: ToolLayout) {
				const { x, y, width, height } = layout.rect;

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
				this.ctx.shadowBlur = (layout.tool == this.rootData.selectedTool) ? 10 : 0;
				this.ctx.shadowColor = '#fff';
				this.ctx.strokeStyle = '#fff';
				this.ctx.stroke();
				// if(tool.ephemeral) {
				// 	const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
				// 	for(let i = 0; i + .05 <= 1; i += .1) {
				// 		grad.addColorStop(i, 'hsl(348, 100%, 61%)');
				// 		grad.addColorStop(i + .05, 'hsl(348, 100%, 70%)');
				// 	}
				// 	this.ctx.fillStyle = grad;
				// } else {
					this.ctx.fillStyle = 'hsl(348, 100%, 61%)';
				// }
				this.ctx.fill();
				this.ctx.shadowBlur = 0;

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
				const textPad = 3;
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

			drawConnection(source: Connector, sink: Connector | Point) {
				const sourceCenter = {
					x: source.rect.x + source.rect.width / 2,
					y: source.rect.y + source.rect.height / 2,
				};
				const sinkCenter = isPoint(sink) ? sink : {
					x: sink.rect.x + sink.rect.width / 2,
					y: sink.rect.y + sink.rect.height / 2,
				};

				// Line between the connectors
				//TODO Bend differently if the output tool is below the input tool
				this.ctx.beginPath();
				this.ctx.moveTo(sourceCenter.x, sourceCenter.y);
				this.ctx.bezierCurveTo(
					sourceCenter.x, sourceCenter.y + (source.type == 'input' ? -50 : 50),
					sinkCenter.x, sinkCenter.y + (source.type == 'input' ? 50 : -50),
					sinkCenter.x, sinkCenter.y,
				);
				this.ctx.strokeStyle = '#fff';
				this.ctx.stroke();

				// Connector circles (these are drawn after the line so the fill is on top)
				for(const point of [sourceCenter, sinkCenter]) {
					this.ctx.beginPath();
					this.ctx.moveTo(point.x, point.y); //TODO Does nothing?
					this.ctx.arc(point.x, point.y, CONNECTOR_RADIUS - 1, 0, 2 * Math.PI);
					this.ctx.strokeStyle = 'hsl(348, 100%, 31%)';
					this.ctx.stroke();
					this.ctx.fillStyle = 'hsl(348, 100%, 61%)';
					this.ctx.fill();
				}
			},

			mousemove(e: MouseEvent) {
				const loc: Point = {
					x: e.offsetX,
					y: e.offsetY,
				};

				// If currently dragging a tool, that continues. Update the tool's position
				if(this.mouse.state == 'dragging-tool') {
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
			},

			mousedown(e: MouseEvent) {
				switch(this.mouse.state) {
					case 'over-background':
						this.rootData.selectedTool = undefined;
						this.connecting = undefined;
						break;
					case 'over-tool':
						this.mouse.state = 'dragging-tool';
						this.rootData.selectedTool = this.mouse.tool;
						break;
					case 'over-connector':
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
					case 'dragging-tool':
						this.mouse.state = 'over-tool';
						break;
				}
			},

			connect(inputCon: InputConnector, outputCon: OutputConnector) {
				inputCon.field.connection = {
					output: outputCon.field,
					upToDate: false,
				};
				updateData(this.rootData.tools, inputCon.field);
			},

			disconnect(inputCon: Connector) {
				if(inputCon.type != 'input') {
					throw new Error("Bad connector type");
				}
				if(inputCon.field.connection === undefined) {
					return false;
				} else {
					inputCon.field.connection = undefined;
					updateData(this.rootData.tools, inputCon.field);
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
