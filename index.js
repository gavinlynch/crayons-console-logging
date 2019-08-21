import _ from 'lodash'
import colors from './colors'

const baseStyle = [
  'display: block;',
  'padding: 0.5em 0.2em;',
  'line-height: 1em;'
].join('')

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
    this.baseStyle = options.baseStyle || baseStyle
    this.styles = []
    return this.proxyConstructor(logger)
  }

  add(name, style){
    console.log(this, name, style)
    this.styles[name] = style
  }

  getFgColoring(name){
    return this.baseStyle + `color: ${name};`
  }

  getBgColoring(name){
    return this.baseStyle + `background-color: ${name};`
  }

  toCSS(ops={}) {
    return this.baseStyle + (Object.keys(ops).reduce((sum, styleKey) => {
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

  proxyConstructor(logger) {
    const self = this
    return new Proxy(logger, {
      get: (target, key) => {
        let styles

        // add named styles
        if (key === 'add') return (name, style) => this.add(name, style)

        // when calling crayon.draw()
        if (key === 'draw') return (options) => {
          // get a pre-defined named style
          if (typeof options === 'string' && !!this.styles[options]) {
            return this.returnStyles(this.transformStyles(this.styles[options]))
          }

          const drawn = this.transformStyles(options)
          // multiple styles
          if (Array.isArray(options)) {
            return drawn
          }
          // singular style
          else {
            return this.transformStyles(options)[0]
          }
        }

        // when calling a crayon[color]()
        if (isBgColor(key)) return () => this.getBgColoring(key)
        if (isColor(key)) return () => this.getFgColoring(key)

        // when calling a logger[method](), the color will be the second parameter
        if (Object.getOwnPropertyNames(logger).includes(key)) {
          return new Proxy({}, {
            get: (trgt, clr) => {
              const color = getColor(clr)
              return (...args) => {
                this.render(target, key, clr, args)
              }
            }
          })
        }

      }
    })

  }
}

export default Crayons
