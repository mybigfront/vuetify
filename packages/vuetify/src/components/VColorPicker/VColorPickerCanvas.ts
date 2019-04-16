// Styles
import './VColorPickerCanvas.sass'

// Helpers
import { clamp, convertToUnit, throttle } from '../../util/helpers'
import { fromHSVA, VColorPickerColor, fromRGBA } from './util'

// Types
import Vue, { VNode } from 'vue'
import { PropValidator } from 'vue/types/options'

export default Vue.extend({
  name: 'v-color-picker-canvas',

  props: {
    color: {
      type: Object,
      default: () => fromRGBA({ r: 255, g: 0, b: 0, a: 1 })
    } as PropValidator<VColorPickerColor>,
    disabled: Boolean,
    dotSize: {
      type: Number,
      default: 10
    },
    height: {
      type: [Number, String],
      default: 150
    },
    width: {
      type: [Number, String],
      default: 300
    }
  },

  data () {
    return {
      boundingRect: {
        width: 0,
        height: 0,
        left: 0,
        top: 0
      } as ClientRect
    }
  },

  computed: {
    dot (): { x: number, y: number} {
      if (!this.color) return { x: 0, y: 0 }

      return {
        x: this.color.hsva.s * parseInt(this.width, 10),
        y: (1 - this.color.hsva.v) * parseInt(this.height, 10)
      }
    }
  },

  watch: {
    color (v: VColorPickerColor) {
      this.updateCanvas()
    }
  },

  mounted () {
    this.updateCanvas()
  },

  methods: {
    emitColor (x: number, y: number) {
      const { left, top, width, height } = this.boundingRect

      this.$emit('update:color', fromHSVA({
        h: this.color.hue,
        s: clamp(x - left, 0, width) / width,
        v: 1 - clamp(y - top, 0, height) / height,
        a: this.color.alpha
      }))
    },
    updateCanvas () {
      if (!this.color) return

      const canvas = this.$refs.canvas as HTMLCanvasElement
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      const saturationGradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
      saturationGradient.addColorStop(0, 'white')
      saturationGradient.addColorStop(1, `hsla(${this.color.hue}, 100%, 50%, 1)`)
      ctx.fillStyle = saturationGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const valueGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      valueGradient.addColorStop(0, 'transparent')
      valueGradient.addColorStop(1, 'black')
      ctx.fillStyle = valueGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    },
    handleClick (e: MouseEvent) {
      if (this.disabled) return

      this.boundingRect = this.$el.getBoundingClientRect()
      this.emitColor(e.clientX, e.clientY)
    },
    handleMouseDown (e: MouseEvent) {
      // To prevent selection while moving cursor
      e.preventDefault()

      if (this.disabled) return

      this.boundingRect = this.$el.getBoundingClientRect()

      window.addEventListener('mousemove', this.handleMouseMove)
      window.addEventListener('mouseup', this.handleMouseUp)
    },
    handleMouseMove: throttle(function (e: MouseEvent) {
      // TODO: I could not find a way to type this
      // @ts-ignore
      if (this.disabled) return

      // @ts-ignore
      this.emitColor(e.clientX, e.clientY)
    }, 25),
    handleMouseUp () {
      window.removeEventListener('mousemove', this.handleMouseMove)
      window.removeEventListener('mouseup', this.handleMouseUp)
    },
    genCanvas (): VNode {
      return this.$createElement('canvas', {
        ref: 'canvas',
        attrs: {
          width: this.width,
          height: this.height
        }
      })
    },
    genDot (): VNode {
      return this.$createElement('div', {
        staticClass: 'v-color-picker__canvas-dot',
        class: {
          'v-color-picker__canvas-dot--disabled': this.disabled
        },
        style: {
          width: convertToUnit(this.dotSize),
          height: convertToUnit(this.dotSize),
          left: convertToUnit(this.dot.x - (this.dotSize / 2)),
          top: convertToUnit(this.dot.y - (this.dotSize / 2))
        }
      })
    }
  },

  render (h): VNode {
    return h('div', {
      staticClass: 'v-color-picker__canvas',
      style: {
        width: convertToUnit(this.width),
        height: convertToUnit(this.height)
      },
      on: {
        click: this.handleClick,
        mousedown: this.handleMouseDown
      }
    }, [
      this.genCanvas(),
      this.genDot()
    ])
  }
})