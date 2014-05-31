var fs = require('fs')
var ejs = require('ejs')
var parse = require('css-parse')

module.exports = Cheatah;

function Cheatah (cssPath, options) {
  if (!(this instanceof Cheatah)) return new Cheatah(cssPath, options);

  options = options || {}

  this.cssPath = cssPath
  this.css = read(cssPath)
  this.ast = parse(this.css)
  console.log(this.ast.stylesheet)

  this.template = importTemplate(options)
  this.style = importStyle(options)
}

Cheatah.prototype.selectors = function () {
  var selectors = []

  this.ast.stylesheet.rules.forEach(function visit (rule) {
    if (rule.rules) rule.rules.forEach(visit)

    selectors.push(rule.selectors.toString())

  })

  return selectors
}

Cheatah.prototype.declarations  = function (selector) {
  var properties = []
  var values = []
  var declaration_num = 0
  var declarations = []

  this.ast.stylesheet.rules.forEach(function visit (rule) {
    if (rule.rules) rule.rules.forEach(visit)

    if (rule.selectors.toString() === selector) {
      rule.declarations.forEach(function (declaration) {
        if (declaration.type === 'declaration') {
          properties.push(declaration.property + ':')
          values.push(declaration.value + ';')
          declaration_num++
        }
      })
    }
  })

  for (var i = 0; i < declaration_num; i++) {
    declarations.push(properties[i] + values[i])
  }

  return declarations.join('')
}

Cheatah.prototype.isInline = function (selector) {
  var ret = true

  this.ast.stylesheet.rules.forEach(function visit (rule) {
    if (rule.rules) rule.rules.forEach(visit)

    rule.declarations.forEach(function (declaration) {
      if (declaration.property.match(/width|height/)
      || (declaration.property === 'display' && declaration.value === 'block')) {
        ret = false
      }
    })
  })

  return ret
}

Cheatah.prototype.template = function () {
  var self = this

  var tmplData = {}
  tmplData.tmplCss = self.style;
  tmplData.cssPath = self.cssPath;
  tmplData.selectors = self.selectors()
  tmplData.declarations = []

  tmplData.selectors.forEach(function (selector) {
    tmplData.declarations.push(self.declarations(selector))
  })

  var html = ejs.render(this.template, tmplData)

  fs.witeFileSync('doc.html', html);
}

function importTemplate (options) {
  if (options.template) var template = read(options.template)
  else var template = read('template/default.ejs')

  return template
}

function importStyle (options) {
  if (options.stylesheet) var style = read(options.stylesheet)
  else var style = read('template/default.css')

  return style
}

function read (name) {
  return fs.readFileSync(name, 'utf-8').trim()
}
