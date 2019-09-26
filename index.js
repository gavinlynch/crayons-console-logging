/**
 * A colorful console styling library.
 *
 * @TODO: everything.
 *
 * @example:
 *
 *   // lib
 *   import Crayons from 'crayons-console-logging'
 *
 *   // Proxy console with crayons logging.
 *   const crayons = new Crayons(console)
 *
 *   // Add crayons to the crayonbox.
 *   crayons.add({
 *     name: 'warning',
 *     type: 'warning',
 *     style: {
 *       fontSize: '14px',
 *       color: 'Gold',
 *       backgroundColor: 'OrangeRed'
 *     }
 *   })
 *
 *   crayons.add({
 *     name: 'info',
 *     type: 'log',
 *     style: {
 *       fontSize: '14px',
 *       color: 'LightCyan',
 *       backgroundColor: 'CadetBlue'
 *     }
 *   })
 *
 *   export default crayons
 */

import _ from 'lodash'
import colors from './colors'

const DEFAULT_LOG_LEVEL = 'log'

const resetStyle = [
  'display: block'
].join(';')

const baseStyle = [
  'display: block',
  'padding: 0.5em 0.33em',
  'line-height: 1em'
].join(';')

function isColor(name){
  const n = name.toLowerCase()
  return n in colors
}

function isBgColor(name){
  const c = getBgColor(name)
  return !!c && !!colors[c]
}

function getBgColor(name){
  const matches = name && name.toLowerCase().match(/^bg(.*)/i)
  return !!matches && !!matches[1] && matches[1].toLowerCase()
}

function getFgColor(name){
  if (isColor(name)) return name
}

function getColor(name){
  const bgC = getBgColor(name)
  const fgC = getFgColor(name)
  return (bgC || fgC)
}

class Crayons {
  constructor(logger, options={}){
    this.logger = Object.assign({}, logger)
    this.native = Object.assign({}, logger)
    this.baseStyle = options.baseStyle || baseStyle
    this.crayons = []
    return this.proxyConstructor(logger)
  }

  add(crayon){
    this.crayons[crayon.name] = Object.assign({}, crayon, {
      type: DEFAULT_LOG_LEVEL,
      style: this.toCSS(crayon.style)
    })
  }

  get(name){
    return this.crayons[name]
  }

  getFgColoring(name){
    return this.baseStyle + `color: ${name};`
  }

  getBgColoring(name){
    return this.baseStyle + `background-color: ${name};`
  }

  toCSS(ops={}) {
    return `${this.baseStyle};` + (Object.keys(ops).reduce((sum, styleKey) => {
      return sum.concat(`${_.kebabCase(styleKey)}: ${ops[styleKey]}`)
    }, [])).join('; ')
  }

  transformStyles(styles){
    const ops = Array.isArray(styles) ? styles : [styles]
    const r = ops.reduce((sum, styleOps) => {
      return sum.concat(this.toCSS(styleOps))
    }, [])
    return r
  }

  render(target, method='log', style, txt) {
    let coloring = []
    if (isBgColor(style)) coloring.push(this.getBgColoring(style))
    if (isColor(style)) coloring.push(this.getFgColoring(style))

    const colored = [txt.join(' '), coloring.join('; ')]
    target[method](...colored)
  }

  returnStyles(styles) {
    if (styles.length === 1) return styles[0]
    return styles
  }

  isCrayon(obj){
    if (typeof obj !== 'object') return false
    return ('name' in obj) && ('type' in obj) && ('style' in obj)
  }

  proxyConstructor(logger) {
    const self = this
    return new Proxy(logger, {
      get: (target, key) => {
        let styles

        // when calling console.addCrayon()
        if (key === 'add'){
          return (crayon) => this.add(crayon)
        }

        // when calling console.getCrayon()
        if (key === 'get') return (name) => {
          const crayon = this.get(name)
          return crayon
        }

        // when calling crayon.draw()
        if (key === 'draw') return (...args) => {
          const icon = '%c\u270E '

          const foundCrayons = args.reduce((sum, consoleArg) => {
            if (this.isCrayon(consoleArg)) sum.push(consoleArg)
            return sum
          }, [])

          const logItems = args.slice(0, args.length - 1)
          const messages = logItems.map((msg) => {
            if (!msg) msg = ''
            if (msg === null) msg = 'null'
            if (msg === undefined) msg = 'undefined'
            if (msg.indexOf('%c') === -1) msg = `%c${msg}`
            return msg
          }).join('')

          const drawWithCrayons = logItems.map((msg, i) => {
            const crayon = foundCrayons[i] || foundCrayons[0]
            return crayon ? crayon.style : null
          })

          if (foundCrayons.length === 0) return

          const {type} = foundCrayons[0]
          return this.native[type].apply(this, [messages, ...drawWithCrayons])
        }

        return (...args) => {
          const icon = '\u270E '
          const iconStyle = 'font-size: 36px;'
          const logItems = [icon].concat(args.slice(0, args.length - 1))
          const messages = logItems.map((msg) => {
            if (msg && msg.indexOf('%c') === -1) msg = `%c${msg}`
            return msg
          }).join('')

          const drawWithCrayons = logItems.map((msg, i) => {
            return (i === 0) ? iconStyle : resetStyle
          })

          this.native[key].apply(this, [messages, ...drawWithCrayons])
        }

      }
    })

  }
}

export default Crayons
