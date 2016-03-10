/*can-ejs@0.0.0#can-ejs*/
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { 'default': obj };
}
var _can = require('can');
var _can2 = _interopRequireDefault(_can);
require('can-legacy-view-helpers');
require('can/view/view');
require('can/util/string/string');
require('can/compute/compute');
var extend = _can2['default'].extend, EJS = function EJS(options) {
        if (!this || this.constructor !== EJS) {
            var ejs = new EJS(options);
            return function (data, helpers) {
                return ejs.render(data, helpers);
            };
        }
        if (typeof options === 'function') {
            this.template = { fn: options };
            return;
        }
        extend(this, options);
        this.template = this.scanner.scan(this.text, this.name);
    };
_can2['default'].EJS = EJS;
EJS.prototype.render = function (object, extraHelpers) {
    object = object || {};
    return this.template.fn.call(object, object, new EJS.Helpers(object, extraHelpers || {}));
};
extend(EJS.prototype, {
    scanner: new _can2['default'].view.Scanner({
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
                fn: function fn(content) {
                    var quickFunc = /\s*\(([\$\w]+)\)\s*->([^\n]*)/, parts = content.match(quickFunc);
                    return 'can.proxy(function(__){var ' + parts[1] + '=can.$(__);' + parts[2] + '}, this);';
                }
            }],
        transform: function transform(source) {
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
    extend(this, extras);
};
EJS.Helpers.prototype = {
    list: function list(_list, cb) {
        _can2['default'].each(_list, function (item, i) {
            cb(item, i, _list);
        });
    },
    each: function each(list, cb) {
        if (_can2['default'].isArray(list)) {
            this.list(list, cb);
        } else {
            _can2['default'].view.lists(list, cb);
        }
    }
};
_can2['default'].view.register({
    suffix: 'ejs',
    script: function script(id, src) {
        return 'can.EJS(function(_CONTEXT,_VIEW) { ' + new EJS({
            text: src,
            name: id
        }).template.out + ' })';
    },
    renderer: function renderer(id, text) {
        return EJS({
            text: text,
            name: id
        });
    }
});
_can2['default'].ejs.Helpers = EJS.Helpers;
exports['default'] = _can2['default'];
module.exports = exports['default'];