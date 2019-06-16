<template>
	<canvas ref="canvas" width=600 height=600 @mousemove="mousemove" @mouseleave="mouseleave" @mousedown="mousedown" @mouseup="mouseup">
		{{ canvas }}
	</canvas>
</template>

<script lang="ts">
	//TODO Autolayout: https://github.com/dagrejs/dagre/wiki https://www.npmjs.com/package/elkjs
	import { Point, Task, isPoint } from '../types';

	interface Rect extends Point {
		width: number;
		height: number;
	}

	function pointInRect(pt: Point, rect: Rect) {
		return pt.x >= rect.x && pt.y >= rect.y && pt.x < rect.x + rect.width && pt.y < rect.y + rect.height;
	}

	interface Connector {
		task: Task;
		name: string;
		type: 'input' | 'output';
		rect: Rect;
	}

	const FONT = 'Arial';

	import Vue, { PropType } from 'vue';
	export default Vue.extend({
		computed: {
			tasks(): Task[] {
				//@ts-ignore
				return this.$root.tasks;
			},
			// drawData() {
			// 	interface DrawData {
			// 		task: Task;
			// 		rect: Rect;
			// 	}
			// },
		},
		data() {
			return {
				// canvas and ctx get set in mounted(), so I'm pretending that they're never undefined because after a certain point that's true
				canvas: undefined as unknown as HTMLCanvasElement,
				ctx: undefined as unknown as CanvasRenderingContext2D,

				selectedTask: undefined as Task | undefined,
				mouse: {
					loc: undefined as Point | undefined, // Current location in the canvas
					task: undefined as Task | undefined, // Task the mouse is over
					connector: undefined as Connector | undefined, // Connector the mouse is over
					dragOffset: undefined as Point | undefined, // Offset within the task that the mouse is dragging from
					connecting: undefined as Connector | undefined, // One endpoint of line being drawn
				},
			};
		},
		watch: {
			mouse: {
				handler(val) {
					this.canvas.style.cursor = val.connector ? (val.connecting && (val.connector.type == val.connecting.type || val.connector.task == val.connecting.task) ? 'no-drop' : 'pointer') : val.task ? 'move' : 'default';
				},
				deep: true,
			},
		},
		mounted() {
			this.canvas = this.$refs.canvas as HTMLCanvasElement;
			this.ctx = this.canvas.getContext('2d')!;
			this.setupCanvas();

			window.addEventListener('resize', () => {
				console.log('resize');
				this.setupCanvas();
				this.draw()
			});

			//TODO Is there a way to detect these dependencies? It seems like there should be
			for(const dep of ['tasks', 'selectedTask', 'mouse.loc', 'mouse.connecting']) {
				this.$watch(dep, this.draw, { deep: true });
			}
			this.draw();
		},
		methods: {
			setupCanvas() {
				//TODO Panning/zooming
				const dpr = window.devicePixelRatio || 1;
				const rect = this.canvas.getBoundingClientRect();
				this.canvas.width = rect.width * dpr;
				this.canvas.height = rect.height * dpr;
				this.canvas.style.width = rect.width + 'px';
				this.canvas.style.height = rect.height + 'px';
				this.ctx.scale(dpr, dpr);
				// this.ctx.translate(.5, .5); // https://stackoverflow.com/a/13294650/309308
				this.ctx.lineJoin = 'round';
			},

			draw() {
				// Clear
				this.ctx.save();
				this.ctx.setTransform(1, 0, 0, 1, 0, 0);
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				this.ctx.restore();

				//TODO This is a horrible hack
				//NB: The keys here are "task_name.connector_name"
				const allConnectors: { [K: string]: Connector } = {};
				function getConnector(task: Task, name: string) {
					const rtn = allConnectors[`${task.name}.${name}`];
					if(rtn === undefined) {
						throw new Error(`Couldn't find connector ${name} on task ${task.name}`);
					}
					return rtn;
				}

				// Draw tasks
				for(const task of this.tasks) {
					this.drawTask(task, allConnectors);
				}
				// Draw line between task connectors
				for(const task of this.tasks) {
					for(const input of task.inputs) {
						if(input.connectedTo) {
							const inputCon = getConnector(task, input.name);
							const outputCon = getConnector(input.connectedTo.task, input.connectedTo.outputName);
							this.drawConnection(inputCon, outputCon);
						}
					}
				}
				// Draw line between task connector and mouse
				if(this.mouse.connecting && this.mouse.loc) {
					this.drawConnection(this.mouse.connecting, this.mouse.loc);
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

			drawTask(task: Task, allConnectors?: { [K: string]: Connector }) {
				const width = 100, height = 75, connectorWidth = 8, connectorGap = 15;
				const { name, loc: { x, y }, inputs, outputs } = task;
				const connectors: Connector[] = [];

				this.ctx.lineWidth = 1;
				this.ctx.beginPath();
				this.ctx.moveTo(x, y);

				// Top
				if(inputs.length > 0) {
					const midWidth = (connectorWidth + connectorGap) * inputs.length;
					const edgeWidth = (width - midWidth) / 2;
					let off = x + edgeWidth;
					this.ctx.lineTo(off, y);
					for(const input of inputs) {
						off += connectorGap / 2;
						this.ctx.lineTo(off, y);
						connectors.push({
							task,
							name: input.name,
							type: 'input',
							rect: {
								x: off,
								y: y - connectorWidth / 2,
								width: connectorWidth,
								height: connectorWidth, // This intentionally covers the whole circle, not just the arc, to make it easier to click
							}
						});
						this.ctx.arc(off + connectorWidth / 2, y, connectorWidth / 2, Math.PI, 0, true);
						off += connectorWidth + connectorGap / 2;
						this.ctx.lineTo(off, y);
					}
				}
				this.ctx.lineTo(x + width, y);

				// Right
				this.ctx.lineTo(x + width, y + height);

				// Bottom
				if(outputs.length > 0) {
					const midWidth = (connectorWidth + connectorGap) * outputs.length;
					const edgeWidth = (width - midWidth) / 2;
					let off = x + width - edgeWidth;
					this.ctx.lineTo(off, y + height);
					for(const output of outputs) {
						off -= connectorGap / 2;
						this.ctx.lineTo(off, y + height);
						connectors.push({
							task,
							name: output.name,
							type: 'output',
							rect: {
								x: off - connectorWidth,
								y: y + height - connectorWidth / 2,
								width: connectorWidth,
								height: connectorWidth, // This intentionally covers the whole circle, not just the arc, to make it easier to click
							}
						});
						this.ctx.arc(off - connectorWidth / 2, y + height, connectorWidth / 2, 0, Math.PI);
						off -= connectorWidth + connectorGap / 2;
						this.ctx.lineTo(off, y + height);
					}
				}
				this.ctx.lineTo(x, y + height);

				// Left
				this.ctx.lineTo(x, y - .5);

				// Draw the task
				this.ctx.shadowBlur = (task == this.selectedTask) ? 10 : 0;
				this.ctx.shadowColor = '#000';
				this.ctx.strokeStyle = '#000';
				this.ctx.stroke();
				this.ctx.fillStyle = 'hsl(210, 100%, 80%)';
				this.ctx.fill();
				this.ctx.shadowBlur = 0;

				// Check if the mouse is in the task and possibly in a connector
				const dpr = window.devicePixelRatio || 1;
				if(this.mouse.loc) {
					if(this.ctx.isPointInPath(this.mouse.loc.x * dpr, this.mouse.loc.y * dpr)) {
						this.mouse.task = task;
					}
					for(const connector of connectors) {
						if(pointInRect(this.mouse.loc, connector.rect)) {
							this.mouse.connector = connector;
							break;
						}
					}
				}

				// Space within the main rectangle that avoids the edges and the connector labels
				const innerTextRect: Rect = {
					x: task.loc.x + 3,
					width: width - 6,
					y: task.loc.y + 14,
					height: height - 26,
				};
				// this.ctx.strokeRect(innerTextRect.x, innerTextRect.y, innerTextRect.width, innerTextRect.height);

				// Draw task and connector labels
				this.ctx.fillStyle = '#000';
				const textPad = 3;
				this.text(task.name, innerTextRect, 24, 'center', 'middle', true);
				const lblShift = {input: 8, output: -8};
				for(const connector of connectors) {
					this.text(connector.name, {
						x: connector.rect.x - textPad,
						y: connector.rect.y + lblShift[connector.type],
						width: connector.rect.width + 2 * textPad,
						height: 10
					}, 10, 'center', 'top');
				}

				if(allConnectors !== undefined) {
					for(const connector of connectors) {
						allConnectors[`${task.name}.${connector.name}`] = connector;
					}
				}
			},

			drawConnection(source: Connector, sink: Connector | Point) {
				const connectorWidth = 8; //TODO Share with drawTask()
				const sourcePoint = {
					x: source.rect.x + source.rect.width / 2,
					y: source.rect.y + source.rect.height / 2,
				};
				const sinkPoint = isPoint(sink) ? sink : {
					x: sink.rect.x + sink.rect.width / 2,
					y: sink.rect.y + sink.rect.height / 2,
				};

				// Line between the connectors
				//TODO Bend differently if the output task is below the input task
				this.ctx.beginPath();
				this.ctx.moveTo(sourcePoint.x, sourcePoint.y);
				this.ctx.bezierCurveTo(
					sourcePoint.x, sourcePoint.y + (source.type == 'input' ? -50 : 50),
					sinkPoint.x, sinkPoint.y + (source.type == 'input' ? 50 : -50),
					sinkPoint.x, sinkPoint.y,
				);
				this.ctx.stroke();

				// Connector circles (these are drawn after the line so the fill is on top)
				for(const point of [sourcePoint, sinkPoint]) {
					this.ctx.beginPath();
					this.ctx.moveTo(point.x, point.y);
					this.ctx.arc(point.x, point.y, connectorWidth / 2 - 1, 0, 2 * Math.PI);
					this.ctx.strokeStyle = 'hsl(210, 100%, 20%)'
					this.ctx.stroke();
					this.ctx.fillStyle = 'hsl(210, 100%, 50%)';
					this.ctx.fill();
				}
			},

			mousemove(e: MouseEvent) {
				this.mouse.loc = {
					x: e.offsetX,
					y: e.offsetY,
				};
				if(this.mouse.dragOffset) {
					this.mouse.task!.loc.x = this.mouse.loc.x - this.mouse.dragOffset.x;
					this.mouse.task!.loc.y = this.mouse.loc.y - this.mouse.dragOffset.y;
				} else {
					// draw() will set these again if necessary
					this.mouse.task = undefined;
					this.mouse.connector = undefined;
				}
			},
			mouseleave() {
				for(const k of Object.keys(this.mouse)) {
					//@ts-ignore Typescript can't deduce that this.mouse[k] exists, but it obviously does
					this.mouse[k] = undefined;
				}
			},
			connect(inputCon: Connector, outputCon: Connector) {
				const input = inputCon.task.inputs.find(inp => inp.name == inputCon.name)!;
				input.connectedTo = {
					task: outputCon.task,
					outputName: outputCon.name,
				};
			},
			disconnect(inputCon: Connector) {
				const input = inputCon.task.inputs.find(inp => inp.name == inputCon.name)!;
				if(input.connectedTo === undefined) {
					return false;
				} else {
					input.connectedTo = undefined;
					return true;
				}
			},
			mousedown(e: MouseEvent) {
				//TODO Handle dragging a connection instead of clicking the source/sink separately
				//TODO Disconnections
				if(this.mouse.connecting) {
					if(this.mouse.connector && this.mouse.connecting.task != this.mouse.connector.task) {
						if(this.mouse.connecting.type == 'input' && this.mouse.connector.type == 'output') {
							this.connect(this.mouse.connecting, this.mouse.connector);
						} else if(this.mouse.connector.type == 'input' && this.mouse.connecting.type == 'output') {
							this.connect(this.mouse.connector, this.mouse.connecting);
						}
						const task = this.mouse.connector.task;

					}
					this.mouse.connecting = undefined;
				} else if(this.mouse.connector) {
					if(this.mouse.connector.type == 'input' && this.disconnect(this.mouse.connector)) {
						// Clicked an existing input and disconnected it
						//TODO Fix the reactivity; currently connectors aren't part of the component state
						this.draw();
						return;
					}
					// Clicked an output or an empty input; make a new connection
					this.mouse.connecting = this.mouse.connector;
				} else if(this.mouse.task) {
					this.selectedTask = this.mouse.task;
					this.mouse.dragOffset = {
						x: this.mouse.loc!.x - this.mouse.task.loc.x,
						y: this.mouse.loc!.y - this.mouse.task.loc.y,
					};
				}
			},
			mouseup(e: MouseEvent) {
				if(this.mouse.dragOffset) {
					this.mouse.dragOffset = undefined;
				} else {
					this.selectedTask = undefined;
				}
			},
		},
	});
</script>

<style lang="less" scoped>
	canvas {
		border: 1px solid #f00;
		// Buefy changes all box-sizing to border-box, which for some unknown reason makes the canvas blurry
		box-sizing: content-box;
	}
</style>
