<!-- Copied from node_modules/buefy/src/components/numberinput/Numberinput.vue -->
<template>
	<div class="b-numberinput field" :class="fieldClasses">
		<p class="control">
			<button
				type="button"
				class="button"
				:class="buttonClasses"
				:disabled="disabled || disabledMin"
				@mousedown="onStartLongPress($event, false)"
				@mouseup="onStopLongPress(false)"
				@mouseleave="onStopLongPress(false)"
				@touchstart.prevent="onStartLongPress($event, false)"
				@touchend="onStopLongPress(false)"
				@touchcancel="onStopLongPress(false)"
				@click="onControlClick($event, false)">
				<b-icon
					icon="minus"
					:pack="iconPack"
					:size="iconSize"/>
			</button>
		</p>

		<b-input
			type="number"
			ref="input"
			v-model.number="computedValue"
			v-bind="$attrs"
			:step="newStep"
			:max="max"
			:min="min"
			:size="size"
			:disabled="disabled"
			:readonly="!editable"
			:loading="loading"
			:rounded="rounded"
			:icon="icon"
			:icon-pack="iconPack"
			:autocomplete="autocomplete"
			:expanded="expanded"
			@focus="$emit('focus', $event)"
			@blur="$emit('blur', $event)" />

		<!-- Added: -->
		<p class="control" v-if="showMax && maxNumber !== undefined">
			<span class="button is-static" :class="buttonClasses">/{{ maxNumber }}</span>
		</p>

		<p class="control">
			<button
				type="button"
				class="button"
				:class="buttonClasses"
				:disabled="disabled || disabledMax"
				@mousedown="onStartLongPress($event, true)"
				@mouseup="onStopLongPress(true)"
				@mouseleave="onStopLongPress(true)"
				@touchstart.prevent="onStartLongPress($event, true)"
				@touchend="onStopLongPress(true)"
				@touchcancel="onStopLongPress(true)"
				@click="onControlClick($event, true)">
				<b-icon
					icon="plus"
					:pack="iconPack"
					:size="iconSize"/>
			</button>
		</p>
	</div>
</template>

<script>
	// import Icon from 'buefy/src/components/icon/Icon'
	// import Input from 'buefy/src/components/input/Input'
	import FormElementMixin from 'buefy/src/utils/FormElementMixin'

	export default {
		name: 'BNumberinput',
		// components: {
		// 	[Icon.name]: Icon,
		// 	[Input.name]: Input
		// },
		mixins: [FormElementMixin],
		inheritAttrs: false,
		props: {
			value: Number,
			min: [Number, String],
			max: [Number, String],
			step: [Number, String],
			disabled: Boolean,
			type: {
				type: String,
				default: 'is-primary'
			},
			editable: {
				type: Boolean,
				default: true
			},
			controlsRounded: {
				type: Boolean,
				default: false
			},
			controlsPosition: String,
			showMax: { // Added
				type: Boolean,
				default: false,
			},
		},
		data() {
			return {
				newValue: !isNaN(this.value) ? this.value : parseFloat(this.min) || 0,
				newStep: this.step || 1,
				_elementRef: 'input'
			}
		},
		computed: {
			computedValue: {
				get() {
					return this.newValue
				},
				set(value) {
					let newValue = value
					if (value === '') {
						newValue = parseFloat(this.min) || 0
					}
					this.newValue = newValue
					this.$emit('input', newValue)
					this.$refs.input.checkHtml5Validity()
				}
			},
			fieldClasses() {
				return [
					{ 'has-addons': this.controlsPosition === 'compact' },
					{ 'is-grouped': this.controlsPosition !== 'compact' }
				]
			},
			buttonClasses() {
				return [
					this.type,
					this.size,
					{ 'is-rounded': this.controlsRounded }
				]
			},
			minNumber() {
				return typeof this.min === 'string'
					? parseFloat(this.min) : this.min
			},
			maxNumber() {
				return typeof this.max === 'string'
					? parseFloat(this.max) : this.max
			},
			stepNumber() {
				return typeof this.newStep === 'string'
					? parseFloat(this.newStep) : this.newStep
			},
			disabledMin() {
				return (this.computedValue - this.stepNumber) < this.minNumber
			},
			disabledMax() {
				return (this.computedValue + this.stepNumber) > this.maxNumber
			},
			stepDecimals() {
				const step = this.stepNumber.toString()
				const index = step.indexOf('.')
				if (index >= 0) {
					return step.substring(index + 1).length
				}
				return 0
			}
		},
		watch: {
			/**
			 * When v-model is changed:
			 *   1. Set internal value.
			 */
			value(value) {
				this.newValue = value
			}
		},
		methods: {
			decrement() {
				if (typeof this.minNumber === 'undefined' ||
					(this.computedValue - this.stepNumber) >= this.minNumber) {
					const value = this.computedValue - this.stepNumber
					this.computedValue = parseFloat(value.toFixed(this.stepDecimals))
				}
			},
			increment() {
				if (typeof this.maxNumber === 'undefined' ||
					(this.computedValue + this.stepNumber) <= this.maxNumber) {
					const value = this.computedValue + this.stepNumber
					this.computedValue = parseFloat(value.toFixed(this.stepDecimals))
				}
			},
			onControlClick(event, inc) {
				if (event.detail !== 0) return
				if (inc) this.increment()
				else this.decrement()
			},
			onStartLongPress(event, inc) {
				if (event.button !== 0 && event.type !== 'touchstart') return
				this._$intervalTime = new Date()
				clearInterval(this._$intervalRef)
				this._$intervalRef = this._$intervalRef = setInterval(() => {
					if (inc) this.increment()
					else this.decrement()
				}, 100)
			},
			onStopLongPress(inc) {
				const d = new Date()
				if (d - this._$intervalTime < 100) {
					// Added:
					if(event.ctrlKey && inc && this.maxNumber !== undefined) {
						this.computedValue = this.maxNumber;
					} else if(event.ctrlKey && !inc && this.minNumber !== undefined) {
						this.computedValue = this.minNumber;
					} else

					if (inc) this.increment()
					else this.decrement()
				}
				clearInterval(this._$intervalRef)
				this._$intervalRef = null
			}
		}
	}
</script>
