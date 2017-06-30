/*[global-shim-start]*/
(function(exports, global, doEval){ // jshint ignore:line
	var origDefine = global.define;

	var get = function(name){
		var parts = name.split("."),
			cur = global,
			i;
		for(i = 0 ; i < parts.length; i++){
			if(!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val){
		var parts = name.split("."),
			cur = global,
			i, part, next;
		for(i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if(!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod){
		if(!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, "default": true };
		for(var p in mod) {
			if(!esProps[p]) return false;
		}
		return true;
	};
	var modules = (global.define && global.define.modules) ||
		(global._define && global._define.modules) || {};
	var ourDefine = global.define = function(moduleName, deps, callback){
		var module;
		if(typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for(i =0; i < deps.length; i++) {
			args.push( exports[deps[i]] ? get(exports[deps[i]]) : ( modules[deps[i]] || get(deps[i]) )  );
		}
		// CJS has no dependencies but 3 callback arguments
		if(!deps.length && callback.length) {
			module = { exports: {} };
			var require = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args.push(require, module.exports, module);
		}
		// Babel uses the exports and module object.
		else if(!args[0] && deps[0] === "exports") {
			module = { exports: {} };
			args[0] = module.exports;
			if(deps[1] === "module") {
				args[1] = module;
			}
		} else if(!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if(globalExport && !get(globalExport)) {
			if(useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	};
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function(){
		// shim for @@global-helpers
		var noop = function(){};
		return {
			get: function(){
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load){
				doEval(__load.source, global);
			}
		};
	});
}
)({},window,function(__$source__, __$global__) { // jshint ignore:line
	eval("(function() { " + __$source__ + " \n }).call(__$global__);");
}
)
/*can-ejs@3.1.1#can-ejs*/
define('can-ejs', function (require, exports, module) {
    var legacyHelpers = require('can-legacy-view-helpers');
    var extend = require('can-util/js/assign/assign');
    var namespace = require('can-namespace');
    var each = require('can-util/js/each/each');
    var canReflect = require('can-reflect');
    var observationReader = require('can-stache-key');
    var DOCUMENT = require('can-util/dom/document/document');
    var templateId = 0;
    var EJS = function (options) {
        if (!this || this.constructor !== EJS) {
            var ejs = new EJS(options);
            return function (data, helpers) {
                return legacyHelpers.view.frag(ejs.render(data, helpers));
            };
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
    module.exports = EJS;
});
/*[global-shim-end]*/
(function(){ // jshint ignore:line
	window._define = window.define;
	window.define = window.define.orig;
}
)();