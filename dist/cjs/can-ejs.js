/*can-ejs@3.1.8#can-ejs*/
var legacyHelpers = require('can-legacy-view-helpers');
var extend = require('can-util/js/assign/assign');
var namespace = require('can-namespace');
var each = require('can-util/js/each/each');
var canReflect = require('can-reflect');
var observationReader = require('can-stache-key');
var DOCUMENT = require('can-globals/document/document');
var view = legacyHelpers.view;
var templateId = 0;
var EJS = function (options) {
    if (!this || this.constructor !== EJS) {
        var ejs = new EJS(options);
        var renderer = function (data, helpers) {
            return legacyHelpers.view.frag(ejs.render(data, helpers));
        };
        renderer.renderType = 'fragment';
        renderer.renderAsString = function (data, helpers) {
            return ejs.render(data, helpers);
        };
        renderer.renderAsString.renderType = 'string';
        return renderer;
    }
    if (typeof options === 'function') {
        this.template = { fn: options };
        return;
    }
    if (typeof options === 'string') {
        options = {
            text: options,
            name: '' + ++templateId
        };
    }
    extend(this, options);
    this.template = this.scanner.scan(this.text, this.name);
};
namespace.EJS = EJS;
EJS.prototype.render = function (object, extraHelpers) {
    object = object || {};
    return this.template.fn.call(object, object, new EJS.Helpers(object, extraHelpers || {}));
};
extend(EJS.prototype, {
    scanner: new legacyHelpers.Scanner({
        text: {
            outStart: 'with(_VIEW) { with (_CONTEXT) {',
            outEnd: '}}',
            argNames: '_CONTEXT,_VIEW',
            context: 'this'
        },
        tokens: [
            [
                'templateLeft',
                '<%%'
            ],
            [
                'templateRight',
                '%>'
            ],
            [
                'returnLeft',
                '<%=='
            ],
            [
                'escapeLeft',
                '<%='
            ],
            [
                'commentLeft',
                '<%#'
            ],
            [
                'left',
                '<%'
            ],
            [
                'right',
                '%>'
            ],
            [
                'returnRight',
                '%>'
            ]
        ],
        helpers: [{
                name: /\s*\(([\$\w]+)\)\s*->([^\n]*)/,
                fn: function (content) {
                    var quickFunc = /\s*\(([\$\w]+)\)\s*->([^\n]*)/, parts = content.match(quickFunc);
                    return '(function(__){var ' + parts[1] + '=__;' + parts[2] + '}).bind(this);';
                }
            }],
        transform: function (source) {
            return source.replace(/<%([\s\S]+?)%>/gm, function (whole, part) {
                var brackets = [], foundBracketPair, i;
                part.replace(/[{}]/gm, function (bracket, offset) {
                    brackets.push([
                        bracket,
                        offset
                    ]);
                });
                do {
                    foundBracketPair = false;
                    for (i = brackets.length - 2; i >= 0; i--) {
                        if (brackets[i][0] === '{' && brackets[i + 1][0] === '}') {
                            brackets.splice(i, 2);
                            foundBracketPair = true;
                            break;
                        }
                    }
                } while (foundBracketPair);
                if (brackets.length >= 2) {
                    var result = ['<%'], bracket, last = 0;
                    for (i = 0; bracket = brackets[i]; i++) {
                        result.push(part.substring(last, last = bracket[1]));
                        if (bracket[0] === '{' && i < brackets.length - 1 || bracket[0] === '}' && i > 0) {
                            result.push(bracket[0] === '{' ? '{ %><% ' : ' %><% }');
                        } else {
                            result.push(bracket[0]);
                        }
                        ++last;
                    }
                    result.push(part.substring(last), '%>');
                    return result.join('');
                } else {
                    return '<%' + part + '%>';
                }
            });
        }
    })
});
EJS.Helpers = function (data, extras) {
    this._data = data;
    this._extras = extras;
    this.can = namespace;
    extend(this, extras);
};
EJS.Helpers.prototype = {
    list: function (list, cb) {
        if (canReflect.isObservableLike(list) && canReflect.isListLike(list)) {
            observationReader.get(list, 'length');
        }
        each(list, function (item, i) {
            cb(item, i, list);
        });
    },
    each: function (list, cb) {
        if (Array.isArray(list)) {
            this.list(list, cb);
        } else {
            legacyHelpers.view.lists(list, cb);
        }
    }
};
var templates = {};
EJS.from = function (id) {
    if (!templates[id]) {
        var el = DOCUMENT().getElementById(id);
        templates[id] = EJS(el.innerHTML);
    }
    return templates[id];
};
view.register({
    suffix: 'ejs',
    script: function (id, src) {
        return 'can.EJS(function(_CONTEXT,_VIEW) { ' + new EJS({
            text: src,
            name: id
        }).template.out + ' })';
    },
    renderer: function (id, text) {
        return EJS({
            text: text,
            name: id
        });
    }
});
module.exports = EJS;