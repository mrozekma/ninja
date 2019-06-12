<template>
	<canvas ref="canvas" width=600 height=600 @mousemove="mousemove" @mouseleave="mouseleave" @mousedown="mousedown" @mouseup="mouseup">
		{{ canvas }}
	</canvas>
</template>

<script lang="ts">
	interface Point {
		x: number;
		y: number;
	}

	// Adapted from http://scaledinnovation.com/analytics/splines/splines.html
	namespace Bezier {
		function getControlPoints(p0: Point, p1: Point, p2: Point, t: number): [ Point, Point ] {
			//  Scaling factors: distances from this knot to the previous and following knots.
			const d01 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
			const d12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

			const fa = t * d01 / (d01 + d12);
			const fb = t - fa;

			return [{
				x: p1.x + fa * (p0.x - p2.x),
				y: p1.y + fa * (p0.y - p2.y),
			}, {
				x: p1.x - fb * (p0.x - p2.x),
				y: p1.y - fb * (p0.y - p2.y),
			}];
		}

		export function drawSpline(ctx: CanvasRenderingContext2D, pts: Point[], t: number) {
			ctx.save();
			ctx.lineWidth = 4;

			// First arc
			let [cp0, cp1] = getControlPoints(pts[0], pts[1], pts[2], .3);
			ctx.beginPath();
			ctx.moveTo(pts[0].x, pts[0].y);
			ctx.quadraticCurveTo(cp0.x, cp0.y, pts[1].x, pts[1].y);
			ctx.stroke();
			ctx.closePath();

			// Every middle arc
			for(let i = 2; i < pts.length - 1; i++) {
				let cp2;
				cp0 = cp1;
				[cp1, cp2] = getControlPoints(pts[i-1], pts[i], pts[i+1], .3);
				ctx.beginPath();
				ctx.moveTo(pts[i-1].x, pts[i-1].y);
				ctx.bezierCurveTo(cp0.x, cp0.y, cp1.x, cp1.y, pts[i].x, pts[i].y);
				ctx.stroke();
				ctx.closePath();
				cp1 = cp2;
			}

			// Last arc
			ctx.beginPath();
			ctx.moveTo(pts[pts.length-2].x, pts[pts.length-2].y);
			ctx.quadraticCurveTo(cp1.x, cp1.y, pts[pts.length-1].x, pts[pts.length-1].y);
			ctx.stroke();
			ctx.closePath();
			ctx.restore();
		}
	}

	interface Rect extends Point {
		width: number;
		height: number;
	}

	function pointInRect(pt: Point, rect: Rect) {
		return pt.x >= rect.x && pt.y >= rect.y && pt.x < rect.x + rect.width && pt.y < rect.y + rect.height;
	}

	interface Task {
		name: string;
		loc: Point;
		inputs: string[];
		outputs: string[];
	}

	const FONT = 'Arial';

	import Vue, { VNode } from 'vue';
	export default Vue.extend({
		data() {
			const tasks: Task[] = [
				{
					name: 'Foo',
					loc: {x: 30, y: 100},
					inputs: [],
					outputs: [],
				},
				{
					name: 'Bar',
					loc: {x: 150, y: 100},
					inputs: ['foo', 'bar', 'baz'],
					outputs: [],
				},
				{
					name: 'Baz',
					loc: {x: 270, y: 100},
					inputs: ['foo', 'bar'],
					outputs: ['baz'],
				},
			];
			return {
				// canvas and ctx get set in mounted(), so I'm pretending that they're never undefined because after a certain point that's true
				canvas: undefined as unknown as HTMLCanvasElement,
				ctx: undefined as unknown as CanvasRenderingContext2D,

				tasks,
				selectedTask: undefined as Task | undefined,
				mouse: {
					loc: undefined as Point | undefined, // Current location in the canvas
					task: undefined as Task | undefined, // Task the mouse is over
					connector: undefined as string | undefined, // Connector the mouse is over
					dragOffset: undefined as Point | undefined, // Offset within the task that the mouse is dragging from
				},
			};
		},
		watch: {
			mouse: {
				handler(val) {
					this.canvas.style.cursor = val.connector ? 'pointer' : val.task ? 'move' : 'default';
				},
				deep: true,
			},
		},
		mounted() {
			this.canvas = this.$refs.canvas as HTMLCanvasElement;
			this.ctx = this.canvas.getContext('2d')!;
			this.setupCanvas();
			//TODO Update on resize

			//TODO Is there a way to detect these dependencies? It seems like there should be
			for(const dep of ['tasks', 'selectedTask', 'mouse.loc']) {
				this.$watch(dep, this.draw, { deep: true });
			}
			this.draw();
		},
		methods: {
			setupCanvas() {
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

				for(const task of this.tasks) {
					this.drawTask(task);
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

			drawTask(task: Task) {
				const width = 100, height = 75, connectorWidth = 8, connectorGap = 15;
				const { name, loc: { x, y }, inputs, outputs } = task;

				this.ctx.lineWidth = 1;
				this.ctx.beginPath();

				const connectors: {
					name: string;
					type: 'input' | 'output',
					rect: Rect;
				}[] = [];

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
							name: input,
							type: 'input',
							rect: {
								x: off,
								y: y - connectorWidth / 2,
								width: connectorWidth,
								height: connectorWidth, // This intentionally covers the whole circle, not just the arc, to make it easier to click
							}
						});
						this.ctx.arc(off + connectorWidth / 2, y, connectorWidth / 2, Math.PI, 0);
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
							name: output,
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
				if(this.mouse.loc && this.ctx.isPointInPath(this.mouse.loc.x * dpr, this.mouse.loc.y * dpr)) {
					this.mouse.task = task;
					for(const connector of connectors) {
						if(pointInRect(this.mouse.loc, connector.rect)) {
							this.mouse.connector = connector.name;
						}
					}
				}

				// Draw task and connector labels
				this.ctx.fillStyle = '#000';
				const textPad = 3;
				this.text(task.name, { x: task.loc.x + textPad, y: task.loc.y + textPad, width: width - 2 * textPad, height: height - 2 * textPad }, 24, 'center', 'middle', true);
				const lblShift = {input: 6, output: -8};
				for(const { name, type, rect: { x, y, width } } of connectors) {
					this.text(name, { x: x - textPad, y: y + lblShift[type], width: width + 2 * textPad, height: 10 }, 10, 'center', 'top');
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
				this.mouse = {
					loc: undefined,
					task: undefined,
					connector: undefined,
					dragOffset: undefined,
				};
			},
			mousedown(e: MouseEvent) {
				if(this.mouse.connector) {
					//TODO
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
	}
</style>
