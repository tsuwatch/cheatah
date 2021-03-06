var fs = require('fs')
var path = require('path')
var ejs = require('ejs')
var parse = require('css-parse')
var stringify = require('css-stringify')
var enclose = require('html-enclose')
var util = require('./lib/util')
var config = require('node-prefix')
var nodePrefix = config.prefix()
var globalModulePath = config.global('cheatah')
// globalModulePath = ""

module.exports = Cheatah

function Cheatah (cssPath, options) {
    if (!(this instanceof Cheatah)) return new Cheatah(cssPath, options);

    this.options = options || {}

    this.cssPath = cssPath
    this.css = util.read(cssPath)
    this.ast = parse(this.css)

    this.template = util.importTemplate(this.options)
    this.style = util.importStyle(this.options)
}

Cheatah.prototype.selectors = function () {
    var selectors = []

    this.ast.stylesheet.rules.forEach(function visit (rule) {
        if (rule.rules) rule.rules.forEach(visit);

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
        if (rule.rules) rule.rules.forEach(visit);

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

    return declarations
}

Cheatah.prototype.trimmedDeclarations  = function (selector) {
    var trimmedAst = this.trim()
    var properties = []
    var values = []
    var declaration_num = 0
    var declarations = []

    trimmedAst.stylesheet.rules.forEach(function visit (rule) {
        if (rule.rules) rule.rules.forEach(visit);

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

    return declarations
}

Cheatah.prototype.isInline = function (selector) {
    var ret = true

    this.ast.stylesheet.rules.forEach(function visit (rule) {
        if (rule.rules) rule.rules.forEach(visit);

        rule.declarations.forEach(function (declaration) {
            if (declaration.property.match(/width|height/)
            || (declaration.property === 'display' && declaration.value === 'block')) {
                ret = false
            }
        })
    })

    return ret
}

Cheatah.prototype.isDecoration = function (property) {
    var decorationProp = util.decorationProp()
    var ret = false;

    decorationProp.forEach(function (dp) {
        if (property === dp) {
            ret = true
            return
        }
    })

    return ret
}

Cheatah.prototype.isAnimation = function (property) {
    var animationProp = util.animationProp()
    var ret = false;

    animationProp.forEach(function (ap) {
        if (property === ap) {
            ret = true
            return
        }
    })

    return ret
}

Cheatah.prototype.trim = function () {
    var self = this
    var decorationProp = util.decorationProp()
    var animationProp = util.animationProp()
    var trimmedRule = []

    var height = {
        property: 'height',
        type: 'declaration',
        value: '200px'
    }
    var width = {
        property: 'width',
        type: 'declaration',
        value: '250px'
    }

    self.ast.stylesheet.rules.forEach(function visit (rule) {
        if (rule.rules) rule.rules.forEach(visit);

        var count = 0
        var dec = []
        rule.declarations.forEach(function (declaration) {
            if (self.isDecoration(declaration.property) || self.isAnimation(declaration.property)) {
                dec.push(rule.declarations[count])
            }
            count++
        })
        dec.push(height)
        dec.push(width)
        trimmedRule.push({
            type: 'rule',
            selectors: rule.selectors,
            declarations: dec
        })
    })

    var ret = {
        type: 'stylesheet',
        stylesheet: {
            rules: trimmedRule
        }
    }

    return ret
}

Cheatah.prototype.build = function () {
    var self = this
    var tmplData = {}

    if (this.options.style) tmplData.tmplCssPath = this.options.style;
    // Twitter Bootstrap
    else tmplData.tmplCssPath = 'http://netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css';

    tmplData.cssPath = self.cssPath
    tmplData.selectors = self.selectors()
    tmplData.styleAttr = []
    tmplData.declarations = []
    tmplData.style = stringify(self.trim())

    tmplData.selectors.forEach(function (selector) {
        tmplData.styleAttr.push(self.trimmedDeclarations(selector).join(''))

        var enclosedDec = [];
        self.declarations(selector).forEach(function (dec) {
            enclosedDec.push(enclose(dec, 'p', "class=code"))
        })

        tmplData.declarations.push(enclosedDec.join(''))
    })

    var html = ejs.render(this.template, tmplData)
    fs.writeFile('cheatah.html', html, function (err) {
        if (err) throw err;
        console.log('')
        console.log('Successed to generate styleguide! (cheatah.html)')
    })
}
