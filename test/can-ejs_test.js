var QUnit = require("steal-qunit");
var EJS = require("can-ejs");
var CanMap = require("can-map");
var legacyHelpers = require("can-legacy-view-helpers");
var domData = require("can-util/dom/data/data");
var CanList = require("can-list");
var can = require("can-namespace");
var canCompute = require("can-compute");
var domMutate = require("can-util/dom/mutate/mutate");
var Deferred = require("can-legacy-view-helpers/deferred");

QUnit.module('can-ejs, rendering', {
	beforeEach: function(assert) {

		this.animals = [
			'sloth',
			'bear',
			'monkey'
		];
		if (!this.animals.each) {
			this.animals.each = function (func) {
				for (var i = 0; i < this.length; i++) {
					func(this[i]);
				}
			};
		}
		this.squareBrackets = '<ul><% this.animals.each(function(animal){%>' + '<li><%= animal %></li>' + '<%});%></ul>';
		this.squareBracketsNoThis = '<ul><% animals.each(function(animal){%>' + '<li><%= animal %></li>' + '<%});%></ul>';
		this.angleBracketsNoThis = '<ul><% animals.each(function(animal){%>' + '<li><%= animal %></li>' + '<%});%></ul>';
	}
});
var getAttr = function (el, attrName) {
	return attrName === 'class' ? el.className : el.getAttribute(attrName);
};
QUnit.test('render with left bracket', function(assert) {
	var compiled = new EJS({
		text: this.squareBrackets,
		type: '['
	})
		.render({
			animals: this.animals
		});
	assert.equal(compiled, '<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>', 'renders with bracket');
});
QUnit.test('render with with', function(assert) {
	var compiled = new EJS({
		text: this.squareBracketsNoThis,
		type: '['
	})
		.render({
			animals: this.animals
		});
	assert.equal(compiled, '<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>', 'renders bracket with no this');
});
QUnit.test('default carrot', function(assert) {
	var compiled = new EJS({
		text: this.angleBracketsNoThis
	})
		.render({
			animals: this.animals
		});
	assert.equal(compiled, '<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>');
});
QUnit.test('render with double angle', function(assert) {
	var text = '<%% replace_me %>' + '<ul><% animals.each(function(animal){%>' + '<li><%= animal %></li>' + '<%});%></ul>';
	var compiled = new EJS({
		text: text
	})
		.render({
			animals: this.animals
		});
	assert.equal(compiled, '<% replace_me %><ul><li>sloth</li><li>bear</li><li>monkey</li></ul>', 'works');
});
QUnit.test('comments', function(assert) {
	var text = '<%# replace_me %>' + '<ul><% animals.each(function(animal){%>' + '<li><%= animal %></li>' + '<%});%></ul>';
	var compiled = new EJS({
		text: text
	})
		.render({
			animals: this.animals
		});
	assert.equal(compiled, '<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>');
});
QUnit.test('multi line', function(assert) {
	var text = 'a \n b \n c',
		result = new EJS({
			text: text
		})
			.render({});
	assert.equal(result, text);
});
QUnit.test('multi line elements', function(assert) {
	var text = '<img\n class="<%=myClass%>" />',
		result = new EJS({
			text: text
		})
			.render({
				myClass: 'a'
			});
	assert.ok(result.indexOf('<img\n class="a"') !== -1, 'Multi-line elements render correctly.');
	// clear hookups b/c we are using .render;
	legacyHelpers.view.hookups = {};
});
QUnit.test('escapedContent', function(assert) {
	var text = '<span><%= tags %></span><label>&amp;</label><strong><%= number %></strong><input value=\'<%= quotes %>\'/>';
	var compiled = new EJS({
		text: text
	})
		.render({
			tags: 'foo < bar < car > zar > poo',
			quotes: 'I use \'quote\' fingers "a lot"',
			number: 123
		});
	var div = document.createElement('div');
	div.innerHTML = compiled;
	assert.equal(div.getElementsByTagName('span')[0].firstChild.nodeValue, 'foo < bar < car > zar > poo');
	assert.equal(div.getElementsByTagName('strong')[0].firstChild.nodeValue, 123);
	assert.equal(div.getElementsByTagName('input')[0].value, 'I use \'quote\' fingers "a lot"');
	assert.equal(div.getElementsByTagName('label')[0].innerHTML, '&amp;');
	// clear hookups b/c we are using .render;
	legacyHelpers.view.hookups = {};
});
QUnit.test('unescapedContent', function(assert) {
	var text = '<span><%== tags %></span><div><%= tags %></div><input value=\'<%== quotes %>\'/>';
	var compiled = new EJS({
		text: text
	})
		.render({
			tags: '<strong>foo</strong><strong>bar</strong>',
			quotes: 'I use \'quote\' fingers "a lot"'
		});
	var div = document.createElement('div');
	div.innerHTML = compiled;
	assert.equal(div.getElementsByTagName('span')[0].firstChild.nodeType, 1);
	assert.equal(div.getElementsByTagName('div')[0].firstChild.nodeValue.toLowerCase(), '<strong>foo</strong><strong>bar</strong>');
	assert.equal(div.getElementsByTagName('span')[0].innerHTML.toLowerCase(), '<strong>foo</strong><strong>bar</strong>');
	assert.equal(div.getElementsByTagName('input')[0].value, 'I use \'quote\' fingers "a lot"', 'escapped no matter what');
	// clear hookups b/c we are using .render;
	legacyHelpers.view.hookups = {};
});
QUnit.test('returning blocks', function(assert) {
	var somethingHelper = function (cb) {
		return cb([
			1,
			2,
			3,
			4
		]);
	};

	var template = "<%# Test Something Produces Items%>"+
		"<%== something(function(items){ %>"+
		" <%== items.length%> "+
		"<% items.map( function(){ %><%# Test Something Produces Items%>"+
		"<%==  something(function(items){ %>ItemsLength<%== items.length %><% }) %>"+
		"<% }) %>"+
		"<% }) %>"+
		"<% for( var i =0; i < items.length; i++) { %>for <%= items[i] %><% } %>";

	var temp = new EJS(template)

	var res = temp.render({
		something: somethingHelper,
		items: [
			'a',
			'b'
		]
	});
	// make sure expected values are in res
	assert.ok(/\s4\s/.test(res), 'first block called');
	assert.equal(res.match(/ItemsLength4/g)
		.length, 4, 'innerBlock and each');
});
QUnit.test('easy hookup', function(assert) {
	var div = document.createElement('div');
	var templateStr = "<div <%= (el)-> el.className = text %>>";
	var template = EJS(templateStr);
	var res = template({
		text: 'yes'
	});
	div.appendChild(res);
	assert.ok(div.getElementsByTagName('div')[0].className.indexOf('yes') !== -1, 'has yes');
});
QUnit.test('multiple function hookups in a tag', function(assert) {
	var text = '<span <%= (el)-> domData.set.call(el,\'foo\',\'bar\') %>' + ' <%= (el)-> domData.set.call(el,\'baz\',\'qux\') %>>lorem ipsum</span>',
		compiled = new EJS({
			text: text
		})
			.render({domData: domData}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var span = div.getElementsByTagName('span')[0];
	assert.equal(domData.get.call(span, 'foo'), 'bar', 'first hookup');
	assert.equal(domData.get.call(span, 'baz'), 'qux', 'second hookup');
});
QUnit.test('helpers', function(assert) {
	EJS.Helpers.prototype.simpleHelper = function () {
		return 'Simple';
	};
	EJS.Helpers.prototype.elementHelper = function () {
		return function (el) {
			el.innerHTML = 'Simple';
		};
	};
	var text = '<div><%= simpleHelper() %></div>';
	var compiled = new EJS({
		text: text
	})
		.render();
	assert.equal(compiled, '<div>Simple</div>');
	text = '<div id="hookup" <%= elementHelper() %>></div>';
	compiled = new EJS({
		text: text
	})
		.render();
	var qF = document.getElementById("qunit-fixture");

	qF.appendChild(legacyHelpers.view.frag(compiled));
	var hookup = document.getElementById("hookup");

	assert.equal(hookup.innerHTML, 'Simple');
});
QUnit.test('list helper', function(assert) {
	var text = '<% list(todos, function(todo){ %><div><%= todo.name %></div><% }) %>';
	var todos = new CanList([{
		id: 1,
		name: 'Dishes'
	}]),
		compiled = new EJS({
			text: text
		})
			.render({
				todos: todos
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.getElementsByTagName('div')
		.length, 1, '1 item in list');
	todos.push({
		id: 2,
		name: 'Laundry'
	});
	assert.equal(div.getElementsByTagName('div')
		.length, 2, '2 items in list');
	todos.splice(0, 2);
	assert.equal(div.getElementsByTagName('div')
		.length, 0, '0 items in list');
	todos.push({
		id: 4,
		name: 'Pick up sticks'
	});
	assert.equal(div.getElementsByTagName('div')
		.length, 1, '1 item in list again');
});
QUnit.test('attribute single unescaped, html single unescaped', function(assert) {
	var text = '<div id=\'me\' class=\'<%== task.attr(\'completed\') ? \'complete\' : \'\'%>\'><%== task.attr(\'name\') %></div>';
	var task = new CanMap({
		name: 'dishes'
	});
	var compiled = new EJS({
		text: text
	})
		.render({
			task: task
		});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'dishes', 'html correctly dishes');
	assert.equal(div.getElementsByTagName('div')[0].className, '', 'class empty');
	task.attr('name', 'lawn');
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'lawn', 'html correctly lawn');
	assert.equal(div.getElementsByTagName('div')[0].className, '', 'class empty');
	task.attr('completed', true);
	assert.equal(div.getElementsByTagName('div')[0].className, 'complete', 'class changed to complete');
});
QUnit.test('select live binding', function(assert) {
	var text = '<select><% todos.each(function(todo){ %><option><%= todo.name %></option><% }) %></select>',
		Todos = new CanList([{
			id: 1,
			name: 'Dishes'
		}]),
		compiled = new EJS({
			text: text
		})
			.render({
				todos: Todos
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.getElementsByTagName('option')
		.length, 1, '1 item in list');
	Todos.push({
		id: 2,
		name: 'Laundry'
	});
	assert.equal(div.getElementsByTagName('option')
		.length, 2, '2 items in list');
	Todos.splice(0, 2);
	assert.equal(div.getElementsByTagName('option')
		.length, 0, '0 items in list');
});
QUnit.test('block live binding', function(assert) {
	var text = '<div><% if( obs.attr(\'sex\') == \'male\' ){ %>' + '<span>Mr.</span>' + '<% } else { %>' + '<label>Ms.</label>' + '<% } %>' + '</div>';
	var obs = new CanMap({
		sex: 'male'
	});
	var compiled = new EJS({
		text: text
	})
		.render({
			obs: obs
		});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	// We have to test using nodeName and innerHTML (and not outerHTML) because IE 8 and under treats
	// user-defined properties on nodes as attributes.
	assert.equal(div.getElementsByTagName('div')[0].firstChild.nodeName.toUpperCase(), 'SPAN', 'initial span tag');
	assert.equal(div.getElementsByTagName('div')[0].firstChild.innerHTML, 'Mr.', 'initial span content');
	obs.attr('sex', 'female');
	assert.equal(div.getElementsByTagName('div')[0].firstChild.nodeName.toUpperCase(), 'LABEL', 'updated label tag');
	assert.equal(div.getElementsByTagName('div')[0].firstChild.innerHTML, 'Ms.', 'updated label content');
});
QUnit.test('hookups in tables', function(assert) {
	var text = '<table><tbody><% if( obs.attr(\'sex\') == \'male\' ){ %>' + '<tr><td>Mr.</td></tr>' + '<% } else { %>' + '<tr><td>Ms.</td></tr>' + '<% } %>' + '</tbody></table>';
	var obs = new CanMap({
		sex: 'male'
	});
	var compiled = new EJS({
		text: text
	})
		.render({
			obs: obs
		});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	// We have to test using nodeName and innerHTML (and not outerHTML) because IE 8 and under treats
	// user-defined properties on nodes as attributes.
	assert.equal(div.getElementsByTagName('tbody')[0].firstChild.firstChild.nodeName, 'TD', 'initial tag');
	assert.equal(div.getElementsByTagName('tbody')[0].firstChild.firstChild.innerHTML.replace(/(\r|\n)+/g, ''), 'Mr.', 'initial content');
	obs.attr('sex', 'female');
	assert.equal(div.getElementsByTagName('tbody')[0].firstChild.firstChild.nodeName, 'TD', 'updated tag');
	assert.equal(div.getElementsByTagName('tbody')[0].firstChild.firstChild.innerHTML.replace(/(\r|\n)+/g, ''), 'Ms.', 'updated content');
});
//Issue 233
QUnit.test('multiple tbodies in table hookup', function(assert) {
	var text = '<table>' + '<% list(people, function(person){ %>' + '<tbody><tr><td><%= person.name %></td></tr></tbody>' + '<% }) %>' + '</table>',
		people = new CanList([{
			name: 'Steve'
		}, {
			name: 'Doug'
		}]),
		compiled = new EJS({
			text: text
		})
			.render({
				people: people
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.getElementsByTagName('tbody')
		.length, 2, 'two tbodies');
});
QUnit.test('multiple hookups in a single attribute', function(assert) {
	var text = '<div class=\'<%= obs.attr("foo") %>a<%= obs.attr("bar") %>b<%= obs.attr("baz") %>\'></div>',
		obs = new CanMap({
			foo: '1',
			bar: '2',
			baz: '3'
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				obs: obs
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var innerDiv = div.childNodes[0];
	assert.equal(getAttr(innerDiv, 'class'), '1a2b3', 'initial render');
	obs.attr('bar', '4');
	assert.equal(getAttr(innerDiv, 'class'), '1a4b3', 'initial render');
	obs.attr('bar', '5');
	assert.equal(getAttr(innerDiv, 'class'), '1a5b3', 'initial render');
});
QUnit.test('adding and removing multiple html content within a single element', function(assert) {
	var text = '<div><%== obs.attr("a") %><%== obs.attr("b") %><%== obs.attr("c") %></div>',
		obs = new CanMap({
			a: 'a',
			b: 'b',
			c: 'c'
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				obs: obs
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.firstChild.nodeName.toUpperCase(), 'DIV', 'initial render node name');
	assert.equal(div.firstChild.innerHTML, 'abc', 'initial render text');
	obs.attr({
		a: '',
		b: '',
		c: ''
	});
	assert.equal(div.firstChild.nodeName.toUpperCase(), 'DIV', 'updated render node name');
	assert.equal(div.firstChild.innerHTML, '', 'updated render text');
	obs.attr({
		c: 'c'
	});
	assert.equal(div.firstChild.nodeName.toUpperCase(), 'DIV', 'updated render node name');
	assert.equal(div.firstChild.innerHTML, 'c', 'updated render text');
});
QUnit.test('live binding and removeAttr', function(assert) {
	var text = '<% if(obs.attr("show")) { %>' +
			'<p <%== obs.attr("attributes") %> class="<%= obs.attr("className")%>"><span><%= obs.attr("message") %></span></p>' +
		'<% } %>',
		obs = new CanMap({
			show: true,
			className: 'myMessage',
			attributes: 'some="myText"',
			message: 'Live long and prosper'
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				obs: obs
			}),
		div = document.createElement('div');

	div.appendChild(legacyHelpers.view.frag(compiled));

	var p = div.getElementsByTagName('p')[0],
		span = p.getElementsByTagName('span')[0];

	assert.equal(p.getAttribute('some'), 'myText', 'initial render attr');
	assert.equal(getAttr(p, 'class'), 'myMessage', 'initial render class');
	assert.equal(span.innerHTML, 'Live long and prosper', 'initial render innerHTML');
	obs.removeAttr('className');
	assert.equal(getAttr(p, 'class'), '', 'class is undefined');
	obs.attr('className', 'newClass');
	assert.equal(getAttr(p, 'class'), 'newClass', 'class updated');
	obs.removeAttr('attributes');
	assert.equal(p.getAttribute('some'), null, 'attribute is undefined');
	obs.attr('attributes', 'some="newText"');
	assert.equal(p.getAttribute('some'), 'newText', 'attribute updated');
	obs.removeAttr('message');

	assert.equal(span.innerHTML, '', 'text node value is empty');

	obs.attr('message', 'Warp drive, Mr. Sulu');
	assert.equal(span.innerHTML, 'Warp drive, Mr. Sulu', 'text node updated');
	obs.removeAttr('show');
	assert.equal(div.innerHTML, '', 'value in block statement is undefined');
	obs.attr('show', true);
	p = div.getElementsByTagName('p')[0];
	span = p.getElementsByTagName('span')[0];
	assert.equal(p.getAttribute('some'), 'newText', 'value in block statement updated attr');
	assert.equal(getAttr(p, 'class'), 'newClass', 'value in block statement updated class');
	assert.equal(span.innerHTML, 'Warp drive, Mr. Sulu', 'value in block statement updated innerHTML');
});
QUnit.test('hookup within a tag', function(assert) {
	var text = '<div <%== obs.attr("foo") %> ' + '<%== obs.attr("baz") %>>lorem ipsum</div>',
		obs = new CanMap({
			foo: 'class="a"',
			baz: 'some=\'property\''
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				obs: obs
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var anchor = div.getElementsByTagName('div')[0];
	assert.equal(getAttr(anchor, 'class'), 'a');
	assert.equal(anchor.getAttribute('some'), 'property');
	obs.attr('foo', 'class="b"');
	assert.equal(getAttr(anchor, 'class'), 'b');
	assert.equal(anchor.getAttribute('some'), 'property');
	obs.attr('baz', 'some=\'new property\'');
	assert.equal(getAttr(anchor, 'class'), 'b');
	assert.equal(anchor.getAttribute('some'), 'new property');
	obs.attr('foo', 'class=""');
	obs.attr('baz', '');
	assert.equal(getAttr(anchor, 'class'), '', 'anchor class blank');
	assert.equal(anchor.getAttribute('some'), undefined, 'attribute "some" is undefined');
});
QUnit.test('single escaped tag, removeAttr', function(assert) {
	var text = '<div <%= obs.attr("foo") %>>lorem ipsum</div>',
		obs = new CanMap({
			foo: 'data-bar="john doe\'s bar"'
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				obs: obs
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var anchor = div.getElementsByTagName('div')[0];
	assert.equal(anchor.getAttribute('data-bar'), 'john doe\'s bar');
	obs.removeAttr('foo');
	assert.equal(anchor.getAttribute('data-bar'), null);
	obs.attr('foo', 'data-bar="baz"');
	assert.equal(anchor.getAttribute('data-bar'), 'baz');
});
QUnit.test('html comments', function(assert) {
	var text = '<!-- bind to changes in the todo list --> <div><%= obs.attr("foo") %></div>',
		obs = new CanMap({
			foo: 'foo'
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				obs: obs
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'foo', 'Element as expected');
});
QUnit.test('hookup and live binding', function(assert) {
	var text = '<div class=\'<%= task.attr(\'completed\') ? \'complete\' : \'\' %>\' <%= (el)-> domData.set.call(el,\'task\',task) %>>' +
		'<%== task.attr(\'name\') %>' + '</div>',
		task = new CanMap({
			completed: false,
			className: 'someTask',
			name: 'My Name'
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				task: task,
				domData: domData
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var child = div.getElementsByTagName('div')[0];
	assert.ok(child.className.indexOf('complete') === -1, 'is incomplete');
	assert.ok( !! domData.get.call(child, 'task'), 'has data');
	assert.equal(child.innerHTML, 'My Name', 'has name');
	task.attr({
		completed: true,
		name: 'New Name'
	});
	assert.ok(child.className.indexOf('complete') !== -1, 'is complete');
	assert.equal(child.innerHTML, 'New Name', 'has new name');
});
/*
 test('multiple curly braces in a block', function() {
 var text =  '<% if(!obs.attr("items").length) { %>' +
 '<li>No items</li>' +
 '<% } else { each(obs.items, function(item) { %>' +
 '<li><%= item.attr("name") %></li>' +
 '<% }) }%>',

 obs = new CanMap({
 items: []
 }),

 compiled = new EJS({ text: text }).render({ obs: obs });

 var ul = document.createElement('ul');
 ul.appendChild(legacyHelpers.view.frag(compiled));

 equal(ul.innerHTML, '<li>No items</li>', 'initial observable state');

 obs.attr('items', [{ name: 'foo' }]);
 equal(u.innerHTML, '<li>foo</li>', 'updated observable');
 });
 */
QUnit.test('unescape bindings change', function(assert) {
	var l = new CanList([{
		complete: true
	}, {
		complete: false
	}, {
		complete: true
	}]);
	var completed = function () {
		l.attr('length');
		var num = 0;
		l.each(function (item) {
			if (item.attr('complete')) {
				num++;
			}
		});
		return num;
	};
	var text = '<div><%== completed() %></div>',
		compiled = new EJS({
			text: text
		})
			.render({
				completed: completed
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var child = div.getElementsByTagName('div')[0];
	assert.equal(child.innerHTML, '2', 'at first there are 2 true bindings');
	var item = new CanMap({
		complete: true,
		id: 'THIS ONE'
	});
	l.push(item);
	assert.equal(child.innerHTML, '3', 'now there are 3 complete');
	item.attr('complete', false);
	assert.equal(child.innerHTML, '2', 'now there are 2 complete');
	l.pop();
	item.attr('complete', true);
	assert.equal(child.innerHTML, '2', 'there are still 2 complete');
});
QUnit.test('escape bindings change', function(assert) {
	var l = new CanList([{
		complete: true
	}, {
		complete: false
	}, {
		complete: true
	}]);
	var completed = function () {
		l.attr('length');
		var num = 0;
		l.each(function (item) {
			if (item.attr('complete')) {
				num++;
			}
		});
		return num;
	};
	var text = '<div><%= completed() %></div>',
		compiled = new EJS({
			text: text
		})
			.render({
				completed: completed
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var child = div.getElementsByTagName('div')[0];
	assert.equal(child.innerHTML, '2', 'at first there are 2 true bindings');
	var item = new CanMap({
		complete: true
	});
	l.push(item);
	assert.equal(child.innerHTML, '3', 'now there are 3 complete');
	item.attr('complete', false);
	assert.equal(child.innerHTML, '2', 'now there are 2 complete');
});
QUnit.test('tag bindings change', function(assert) {
	var l = new CanList([{
		complete: true
	}, {
		complete: false
	}, {
		complete: true
	}]);
	var completed = function () {
		l.attr('length');
		var num = 0;
		l.each(function (item) {
			if (item.attr('complete')) {
				num++;
			}
		});
		return 'items=\'' + num + '\'';
	};
	var text = '<div <%= completed() %>></div>',
		compiled = new EJS({
			text: text
		})
			.render({
				completed: completed
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var child = div.getElementsByTagName('div')[0];
	assert.equal(child.getAttribute('items'), '2', 'at first there are 2 true bindings');
	var item = new CanMap({
		complete: true
	});
	l.push(item);
	assert.equal(child.getAttribute('items'), '3', 'now there are 3 complete');
	item.attr('complete', false);
	assert.equal(child.getAttribute('items'), '2', 'now there are 2 complete');
});
QUnit.test('attribute value bindings change', function(assert) {
	var l = new CanList([{
		complete: true
	}, {
		complete: false
	}, {
		complete: true
	}]);
	var completed = function () {
		l.attr('length');
		var num = 0;
		l.each(function (item) {
			if (item.attr('complete')) {
				num++;
			}
		});
		return num;
	};
	var text = '<div items="<%= completed() %>"></div>',
		compiled = new EJS({
			text: text
		})
			.render({
				completed: completed
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var child = div.getElementsByTagName('div')[0];
	assert.equal(child.getAttribute('items'), '2', 'at first there are 2 true bindings');
	var item = new CanMap({
		complete: true
	});
	l.push(item);
	assert.equal(child.getAttribute('items'), '3', 'now there are 3 complete');
	item.attr('complete', false);
	assert.equal(child.getAttribute('items'), '2', 'now there are 2 complete');
});
QUnit.test('in tag toggling', function(assert) {
	var text = '<div <%== obs.attr(\'val\') %>></div>';
	var obs = new CanMap({
		val: 'foo="bar"'
	});
	var compiled = new EJS({
		text: text
	})
		.render({
			obs: obs
		});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	obs.attr('val', 'bar=\'foo\'');
	obs.attr('val', 'foo="bar"');
	var d2 = div.getElementsByTagName('div')[0];
	// toUpperCase added to normalize cases for IE8
	assert.equal(d2.getAttribute('foo'), 'bar', 'bar set');
	assert.equal(d2.getAttribute('bar'), null, 'bar set');
});
QUnit.test('parent is right with bock', function(assert) {
	var text = '<ul><% if(!obs.attr("items").length) { %>' + '<li>No items</li>' + '<% } else { %> <%== obs.attr("content") %>' + '<% } %></ul>',
		obs = new CanMap({
			content: '<li>Hello</li>',
			items: [{
				name: 'Justin'
			}]
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				obs: obs
			});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var ul = div.getElementsByTagName('ul')[0];
	var li = div.getElementsByTagName('li')[0];
	assert.ok(ul, 'we have a ul');
	assert.ok(li, 'we have a li');
});
QUnit.test('nested properties', function(assert) {
	var text = '<div><%= obs.attr(\'name.first\')%></div>';
	var obs = new CanMap({
		name: {
			first: 'Justin'
		}
	});
	var compiled = new EJS({
		text: text
	})
		.render({
			obs: obs
		});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	div = div.getElementsByTagName('div')[0];
	assert.equal(div.innerHTML, 'Justin');
	obs.attr('name.first', 'Brian');
	assert.equal(div.innerHTML, 'Brian');
});
QUnit.test('tags without chidren or ending with /> do not change the state', function(assert) {
	var text = '<table><tr><td></td><%== obs.attr(\'content\') %></tr></div>';
	var obs = new CanMap({
		content: '<td>Justin</td>'
	});
	var compiled = new EJS({
		text: text
	})
		.render({
			obs: obs
		});
	var div = document.createElement('div');
	var html = legacyHelpers.view.frag(compiled);
	div.appendChild(html);
	assert.equal(div.getElementsByTagName('span')
		.length, 0, 'there are no spans');
	assert.equal(div.getElementsByTagName('td')
		.length, 2, 'there are 2 td');
});

// Similar to the nested live bindings test, this makes sure templates with control blocks
// will eventually remove themselves if at least one change happens
// before things are removed.
// It is currently commented out because
//
/*test("memory safe without parentElement of blocks", function(){

 })*/
QUnit.test('trailing text', function(assert) {
	var template = EJS('There are <%= this.attr(\'length\') %> todos');
	var div = document.createElement('div');
	div.appendChild(template( new CanList([{}, {}])));
	assert.ok(/There are 2 todos/.test(div.innerHTML), 'got all text');
});


QUnit.test('live binding select', function(assert) {
	var text = '<select><% items.each(function(ob) { %>' + '<option value=\'<%= ob.attr(\'id\') %>\'><%= ob.attr(\'title\') %></option>' + '<% }); %></select>',
		items = new CanList([{
			title: 'Make bugs',
			is_done: true,
			id: 0
		}, {
			title: 'Find bugs',
			is_done: false,
			id: 1
		}, {
			title: 'Fix bugs',
			is_done: false,
			id: 2
		}]),
		compiled = new EJS({
			text: text
		})
			.render({
				items: items
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.getElementsByTagName('option')
		.length, 3, '3 items in list');
	var option = div.getElementsByTagName('option')[0];
	assert.equal(option.value, '' + items[0].id, 'value attr set');
	assert.equal(option.textContent || option.text, items[0].title, 'content of option');
	items.push({
		id: 3,
		name: 'Go to pub'
	});
	assert.equal(div.getElementsByTagName('option')
		.length, 4, '4 items in list');
});
QUnit.test('live binding textarea', function(assert) {
	var template = EJS('<textarea>Before<%= obs.attr(\'middle\') %>After</textarea>');

	var obs = new CanMap({
		middle: 'yes'
	}),
		div = document.createElement('div');
	var node = template({
		obs: obs
	});
	div.appendChild(node);
	var textarea = div.firstChild;
	assert.equal(textarea.value, 'BeforeyesAfter');
	obs.attr('middle', 'Middle');
	assert.equal(textarea.value, 'BeforeMiddleAfter');
});
QUnit.test('reset on a live bound input', function(assert) {
	var text = '<input type=\'text\' value=\'<%= person.attr(\'name\') %>\'><button type=\'reset\'>Reset</button>',
		person = new CanMap({
			name: 'Bob'
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				person: person
			}),
		form = document.createElement('form'),
		input;
	form.appendChild(legacyHelpers.view.frag(compiled));
	input = form.getElementsByTagName('input')[0];
	form.reset();
	assert.equal(input.value, 'Bob', 'value is correct');
});

QUnit.test('attribute unquoting', function(assert) {
	var text = '<input type="radio" ' + '<%== facet.single ? \'name="facet-\' + facet.attr("id") + \'"\' : "" %> ' + 'value="<%= facet.single ? "facet-" + facet.attr("id") : "" %>" />',
		facet = new CanMap({
			id: 1,
			single: true
		}),
		compiled = new EJS({
			text: text
		})
			.render({
				facet: facet
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.children[0].name, 'facet-1');
	assert.equal(div.children[0].value, 'facet-1');
});
QUnit.test('empty element hooks work correctly', function(assert) {
	var text = '<div <%= function(e){ e.innerHTML = "1 Will show"; } %>></div>' + '<div <%= function(e){ e.innerHTML = "2 Will not show"; } %>></div>' + '3 Will not show';
	var compiled = new EJS({
		text: text
	})
		.render(),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.childNodes.length, 3, 'all three elements present');
});
QUnit.test('live binding with parent dependent tags but without parent tag present in template', function(assert) {
	var text = [
		'<tbody>',
		'<% if( person.attr("first") ){ %>',
		'<tr><td><%= person.first %></td></tr>',
		'<% }%>',
		'<% if( person.attr("last") ){ %>',
		'<tr><td><%= person.last %></td></tr>',
		'<% } %>',
		'</tbody>'
	];
	var person = new CanMap({
		first: 'Austin',
		last: 'McDaniel'
	});
	var compiled = new EJS({
		text: text.join('\n')
	})
		.render({
			person: person
		});
	var table = document.createElement('table');
	table.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(table.getElementsByTagName('tr')[0].firstChild.nodeName.toUpperCase(), 'TD');
	assert.equal(table.getElementsByTagName('tr')[0].firstChild.innerHTML, 'Austin');
	assert.equal(table.getElementsByTagName('tr')[1].firstChild.nodeName.toUpperCase(), 'TD');
	assert.equal(table.getElementsByTagName('tr')[1].firstChild.innerHTML, 'McDaniel');
	person.removeAttr('first');
	assert.equal(table.getElementsByTagName('tr')[0].firstChild.nodeName.toUpperCase(), 'TD');
	assert.equal(table.getElementsByTagName('tr')[0].firstChild.innerHTML, 'McDaniel');
	person.removeAttr('last');
	assert.equal(table.getElementsByTagName('tr')
		.length, 0);
	person.attr('first', 'Justin');
	assert.equal(table.getElementsByTagName('tr')[0].firstChild.nodeName.toUpperCase(), 'TD');
	assert.equal(table.getElementsByTagName('tr')[0].firstChild.innerHTML, 'Justin');
});
QUnit.test('spaces between attribute name and value', function(assert) {
	var text = '<input type="text" value = "<%= test %>" />',
		compiled = new EJS({
			text: text
		})
			.render({
				test: 'testing'
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var input = div.getElementsByTagName('input')[0];
	assert.equal(input.value, 'testing');
	assert.equal(input.type, 'text');
});
QUnit.test('live binding with computes', function(assert) {
	var text = '<span><%= compute() %></span>',
		compute = canCompute(5),
		compiled = new EJS({
			text: text
		})
			.render({
				compute: compute
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var span = div.getElementsByTagName('span');
	assert.equal(span.length, 1);
	span = span[0];
	assert.equal(span.innerHTML, '5');
	compute(6);
	assert.equal(span.innerHTML, '6');
	compute('Justin');
	assert.equal(span.innerHTML, 'Justin');
	compute(true);
	assert.equal(span.innerHTML, 'true');
});
QUnit.test('testing for clean tables', function(assert) {

	var templateStr = '<table cellpadding="0" cellspacing="0" border="0" class="display">'+
	    '<thead>'+
	        '<tr>'+
	            '<th> Game Name </th>'+
	            '<th> Rating </th>'+
	        '</tr>'+
	    '</thead>'+
	    '<tbody>'+
	        '<% games.each( function(game) { %>'+
	            '<tr class="game">'+
	                "<td> <%= game.attr('name') %></td>"+
	                "<td> <%= game.attr('rating') %></td>"+
	            "</tr>"+
	        "<% }) %>"+
	        '<% games.each( function(game) { %>'+
	            '<tr class="game">'+
	                "<td> <%= game.attr('name') %></td>"+
	                "<td> <%= game.attr('rating') %></td>"+
	            "</tr>"+
	        "<% }) %>"+
	    "</tbody>"+
	"</table>";
	var template = EJS(templateStr);

	var games = new CanList();
	games.push({
		name: 'The Legend of Zelda',
		rating: 10
	});
	games.push({
		name: 'The Adventures of Link',
		rating: 9
	});
	games.push({
		name: 'Dragon Warrior',
		rating: 9
	});
	games.push({
		name: 'A Dude Named Daffl',
		rating: 8.5
	});
	var res = template({
		games: games
	}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(res));
	assert.ok(!/@@!!@@/.test(div.innerHTML), 'no placeholders');
});

// http://forum.javascriptmvc.com/topic/live-binding-on-mustache-template-does-not-seem-to-be-working-with-nested-properties
QUnit.test('Observe with array attributes', function(assert) {
	var template = EJS('<ul><% list(todos, function(todo, i) { %><li><%= todos.attr(""+i) %></li><% }) %></ul><div><%= this.attr("message") %></div>');


	var div = document.createElement('div');
	var data = new CanMap({
		todos: [
			'Line #1',
			'Line #2',
			'Line #3'
		],
		message: 'Hello',
		count: 2
	});
	div.appendChild(template( data));

	assert.equal(div.getElementsByTagName('li')[1].innerHTML, 'Line #2', 'Check initial array');
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'Hello', 'Check initial message');
	data.attr('todos.1', 'Line #2 changed');
	data.attr('message', 'Hello again');
	assert.equal(div.getElementsByTagName('li')[1].innerHTML, 'Line #2 changed', 'Check updated array');
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'Hello again', 'Check updated message');
});
QUnit.test('hookup this correctly', function(assert) {
	var obj = {
		from: 'cows'
	};
	var html = '<span <%== (el) -> domData.set.call(el, \'foo\', this.from) %>>tea</span>';
	var compiled = new EJS({
		text: html
	})
		.render(obj,{domData: domData});
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	var span = div.getElementsByTagName('span')[0];
	assert.equal(domData.get.call(span, 'foo'), obj.from, 'object matches');
});
//Issue 271
QUnit.test('live binding with html comment', function(assert) {
	var text = '<table><tr><th>Todo</th></tr><!-- do not bother with me -->' + '<% todos.each(function(todo){ %><tr><td><%= todo.name %></td></tr><% }) %></table>',
		Todos = new CanList([{
			id: 1,
			name: 'Dishes'
		}]),
		compiled = new EJS({
			text: text
		})
			.render({
				todos: Todos
			}),
		div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.getElementsByTagName('table')[0].getElementsByTagName('td')
		.length, 1, '1 item in list');
	Todos.push({
		id: 2,
		name: 'Laundry'
	});
	assert.equal(div.getElementsByTagName('table')[0].getElementsByTagName('td')
		.length, 2, '2 items in list');
	Todos.splice(0, 2);
	assert.equal(div.getElementsByTagName('table')[0].getElementsByTagName('td')
		.length, 0, '0 items in list');
});
QUnit.test('HTML comment with element callback', function(assert) {
	var text = [
		'<ul>',
		'<% todos.each(function(todo) { %>',
		'<li<%= (el) -> domData.set.call(el,\'todo\',todo) %>>',
		'<!-- html comment #1 -->',
		'<%= todo.name %>',
		'<!-- html comment #2 -->',
		'</li>',
		'<% }) %>',
		'</ul>'
	],
		Todos = new CanList([{
			id: 1,
			name: 'Dishes'
		}]),
		compiled = new EJS({
			text: text.join('\n')
		})
			.render({
				todos: Todos,
				domData: domData
			}),
		div = document.createElement('div'),
		li, comments;
	comments = function (el) {
		var count = 0;
		for (var i = 0; i < el.childNodes.length; i++) {
			if (el.childNodes[i].nodeType === 8) {
				++count;
			}
		}
		return count;
	};
	div.appendChild(legacyHelpers.view.frag(compiled));
	li = div.getElementsByTagName('ul')[0].getElementsByTagName('li');
	assert.equal(li.length, 1, '1 item in list');
	assert.equal(comments(li[0]), 2, '2 comments in item #1');
	Todos.push({
		id: 2,
		name: 'Laundry'
	});
	assert.equal(li.length, 2, '2 items in list');
	assert.equal(comments(li[0]), 2, '2 comments in item #1');
	assert.equal(comments(li[1]), 2, '2 comments in item #2');
	Todos.splice(0, 2);
	assert.equal(li.length, 0, '0 items in list');
});

QUnit.test('correctness of data-view-id and only in tag opening', function(assert) {
	var text = [
		'<textarea><select><% list(this.items, function(item) { %>',
		'<option<%= (el) -> el.data(\'item\', item) %>><%= item.title %></option>',
		'<% }) %></select></textarea>'
	],
		items = [{
			id: 1,
			title: 'One'
		}, {
			id: 2,
			title: 'Two'
		}],
		compiled = new EJS({
			text: text.join('')
		})
			.render({
				items: items
			}),
		expected = '^<textarea data-view-id=\'[0-9]+\'><select><option data-view-id=\'[0-9]+\'>One</option>' + '<option data-view-id=\'[0-9]+\'>Two</option></select></textarea>$';
	assert.ok(compiled.search(expected) === 0, 'Rendered output is as expected');
	// clear hookups b/c we are using .render;
	legacyHelpers.view.hookups = {};
});
QUnit.test('return blocks within element tags', function(assert) {
	var animals = new CanList([
		'sloth',
		'bear'
	]),
		template = '<ul>' + '<%==lister(animals, function(animal){%>' + '<li><%=animal %></li>' + '<%})%>' + '</ul>';
	var renderer = EJS(template);
	var div = document.createElement('div');
	var frag = renderer({
		lister: function () {
			return function (el) {
				assert.equal(el.nodeName.toLowerCase(), 'li', 'got the LI it created');
			};
		},
		animals: animals
	});
	div.appendChild(frag);
});
QUnit.test('Each does not redraw items', function(assert) {
	var animals = new CanList([
		'sloth',
		'bear'
	]),
		template = '<div>my<b>favorite</b>animals:' + '<%==each(animals, function(animal){%>' + '<label>Animal=</label> <span><%=animal %></span>' + '<%})%>' + '!</div>';
	var renderer = EJS(template);
	var div = document.createElement('div');
	var frag = renderer({
		animals: animals
	});
	div.appendChild(frag);
	div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';
	assert.equal(div.getElementsByTagName('label')
		.length, 2, 'There are 2 labels');
	animals.push('turtle');
	assert.equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	assert.equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');
});
QUnit.test('Each works with no elements', function(assert) {
	var animals = new CanList([
		'sloth',
		'bear'
	]),
		template = '<%==each(animals, function(animal){%>' + '<%=animal %> ' + '<%})%>';
	var renderer = EJS(template);
	var div = document.createElement('div');
	var frag = renderer({
		animals: animals
	});
	div.appendChild(frag);
	animals.push('turtle');
	assert.equal(div.innerHTML, 'sloth bear turtle ', 'turtle added');
});
QUnit.test('Each does not redraw items (normal array)', function(assert) {
	var animals = [
		'sloth',
		'bear',
		'turtle'
	],
		template = '<div>my<b>favorite</b>animals:' + '<%each(animals, function(animal){%>' + '<label>Animal=</label> <span><%=animal %></span>' + '<%})%>' + '!</div>';
	var renderer = EJS(template);
	var div = document.createElement('div');
	var frag = renderer({
		animals: animals
	});
	div.appendChild(frag);
	div.getElementsByTagName('label')[0].myexpando = 'EXPANDO-ED';
	//animals.push("dog")
	assert.equal(div.getElementsByTagName('label')
		.length, 3, 'There are 2 labels');
	assert.equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	assert.equal(div.getElementsByTagName('label')[0].myexpando, 'EXPANDO-ED', 'same expando');
	assert.equal(div.getElementsByTagName('span')[2].innerHTML, 'turtle', 'turtle added');
});
QUnit.test('list works within another branch', function(assert) {
	var animals = new CanList([]),
		template = '<div>Animals:' + '<% if( animals.attr(\'length\') ){ %>~' + '<% animals.each(function(animal){%>' + '<span><%=animal %></span>' + '<%})%>' + '<% } else { %>' + 'No animals' + '<% } %>' + '!</div>';
	var renderer = EJS(template);
	var div = document.createElement('div');
	// $("#qunit-fixture").html(div);
	var frag = renderer({
		animals: animals
	});
	div.appendChild(frag);
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'Animals:No animals!');
	animals.push('sloth');
	assert.equal(div.getElementsByTagName('span')
		.length, 1, 'There is 1 sloth');
	animals.pop();
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'Animals:No animals!');
});
QUnit.test('each works within another branch', function(assert) {
	var animals = new CanList([]),
		template = '<div>Animals:' + '<% if( animals.attr(\'length\') ){ %>~' + '<%==each(animals, function(animal){%>' + '<span><%=animal %></span>' + '<%})%>' + '<% } else { %>' + 'No animals' + '<% } %>' + '!</div>';
	var renderer = EJS(template);
	var div = document.createElement('div');
	var frag = renderer({
		animals: animals
	});
	div.appendChild(frag);
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'Animals:No animals!');
	animals.push('sloth');
	assert.equal(div.getElementsByTagName('span')
		.length, 1, 'There is 1 sloth');
	animals.pop();
	assert.equal(div.getElementsByTagName('div')[0].innerHTML, 'Animals:No animals!');
});

// Issue #242
// This won't be fixed as it would require a full JS parser
/*
 test("Variables declared in shared EJS blocks shouldn't get lost", function() {
 var template = EJS(
 "<%" +
 "var bestTeam = teams[0];" +
 "can.each(teams, function(team) { %>" +
 "<div><%== team.name %></div>" +
 "<% }) %>" +
 "<div class='best'><%== bestTeam.name %>!</div>"),
 data = {
 teams: new CanList([
 { name: "Packers", rank: 1 },
 { name: "Bears", rank: 2 },
 { name: "Vikings", rank: 3 },
 { name: "Lions", rank: 4 },
 ])
 },
 div = document.createElement('div');

 try {
 div.appendChild(template(data));
 } catch (ex) { }
 var children = div.getElementsByTagName('div');
 equal( children.length, 5, "Rendered all teams and the best team");
 equal( children[1].innerHTML, "Bears", "Lost again");
 equal( children[4].innerHTML, "Packers!", "#1 team");
 });
 */
//Issue 267
QUnit.test('Access .length with nested dot notation', function(assert) {
	var template = '<span id="nested"><%= this.attr("list.length") %></span>' + '<span id="unnested"><%= this.list.attr("length") %></span>',
		obj = new CanMap({
			list: [
				0,
				1,
				2,
				3
			]
		}),
		renderer = EJS(template),
		div = document.createElement('div');
	div.appendChild(renderer(obj));
	assert.ok(div.getElementsByTagName('span')[0].innerHTML === '4', 'Nested dot notation.');
	assert.ok(div.getElementsByTagName('span')[1].innerHTML === '4', 'Not-nested dot notation.');
});
QUnit.test('attributes in truthy section', function(assert) {
	var template = EJS('<p <% if(attribute) {%>data-test="<%=attribute%>"<% } %>></p>');
	var data1 = {
		attribute: 'test-value'
	};
	var frag1 = template(data1);
	var div1 = document.createElement('div');
	div1.appendChild(frag1);
	assert.equal(div1.children[0].getAttribute('data-test'), 'test-value', 'hyphenated attribute value');
	var data2 = {
		attribute: 'test value'
	};
	var frag2 = template(data2);
	var div2 = document.createElement('div');
	div2.appendChild(frag2);
	assert.equal(div2.children[0].getAttribute('data-test'), 'test value', 'whitespace in attribute value');
});
QUnit.test('outputting array of attributes', function(assert) {
	var template = EJS('<p <% for(var i = 0; i < attribute.length; i++) { %><%=attribute[i].name%>="<%=attribute[i].value%>"<%}%>></p>');
	var data = {
		attribute: [{
			'name': 'data-test1',
			'value': 'value1'
		}, {
			'name': 'data-test2',
			'value': 'value2'
		}, {
			'name': 'data-test3',
			'value': 'value3'
		}]
	};
	var frag = template(data);
	var div = document.createElement('div');
	div.appendChild(frag);
	assert.equal(div.children[0].getAttribute('data-test1'), 'value1', 'first value');
	assert.equal(div.children[0].getAttribute('data-test2'), 'value2', 'second value');
	assert.equal(div.children[0].getAttribute('data-test3'), 'value3', 'third value');
});
QUnit.test('_bindings removed when element removed', function(assert) {
	var template = EJS('<div id="game"><% if(game.attr("league")) { %><%= game.attr("name") %><% } %></div>'),
		game = new CanMap({
			'name': 'Fantasy Baseball',
			'league': 'Malamonsters'
		});
	var frag = template({
		game: game
	});
	var div = document.getElementById("qunit-fixture");

	div.appendChild(frag);
	domMutate.removeChild.call(div, div.firstChild);
	var done = assert.async();
	setTimeout(function () {
		done();
		assert.equal(game.__bindEvents._lifecycleBindings, 0, 'No bindings left');
	}, 100);
});
// Note:  unsure if this is the same as calling from CanJS 2.3. What is known
//  is that just passing new EJS({...}) into can.view.render doesn't work, but
//  that's not the normal calling pattern anyway.  See the next test for how
//  it's usually done.
QUnit.test("can.view.render() returns string (existing render func)", function(assert) {
	var compiled = can.view.render(
		new EJS({
			text: this.angleBracketsNoThis
		}).template.fn,
		{ animals: this.animals },
		{}
	);
	assert.equal(compiled, '<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>');
});
if (__dirname !== '/') {
	QUnit.test("can.view.render() returns string (path)", function(assert) {
		var compiled = can.view.render(
			__dirname + "/binding.ejs",
			{
				task: { 
					attr(key) {
						return ({completed: true, name: "foo"})[key]; 
					} 
				}
			}
		);
		assert.equal(typeof compiled, "string", "a string is returned (not hooked up)");
		assert.ok(/<div[^>]+data-view-id/.test(compiled), "String is awaiting hookup");
		var div = document.createElement('div');
		var frag = legacyHelpers.view.frag(compiled, div);
		div.appendChild(frag);
		assert.equal(div.innerHTML, '<div class="complete">\n\tfoo\n</div>\n');
	});
}

QUnit.test("can.view() creates and hooks up fragment correctly (EJS render func)", function(assert) {
	var bindingEJS = EJS('<div class=\'<%= task.attr(\'completed\') ? "complete" : "" %>\'>\n' +
												"\t<%== task.attr('name') %>\n" +
												'</div>\n');
	var compiled = can.view(
		bindingEJS,
		{
			task: { 
				attr(key) {
					return ({completed: true, name: "foo"})[key]; 
				} 
			}
		}
	);
	var div = document.createElement('div');
	div.appendChild(compiled);
	assert.equal(div.innerHTML, '<div class="complete">\n\tfoo\n</div>\n');
});

QUnit.test("can.view.render() can be called from within EJS (renderer)", function(assert) {
	var compiled = new EJS({
			text: '<div class="outer"><%== can.view.render( subEJS, this ) %></div>'
		}).render({
			task: { 
				attr(key) {
					return ({completed: true, name: "foo"})[key]; 
				} 
			}
		},
		{
			subEJS: EJS('<div class="complete"><%= task.attr("name") %></div>')
		}
	);
	var div = document.createElement('div');
	div.appendChild(legacyHelpers.view.frag(compiled));
	assert.equal(div.innerHTML, '<div class="outer"><div class="complete">foo</div></div>');
});
if (__dirname !== '/') {
	QUnit.test("can.view.render() can be called from within EJS (path)", function(assert) {
		var compiled = new EJS({
				text: '<div class="outer"><%== can.view.render( "' + __dirname + '/binding.ejs", this ) %></div>'
			}).render({
				task: { 
					attr(key) {
						return ({completed: true, name: "foo"})[key]; 
					} 
				}
			}
		);
		var div = document.createElement('div');
		div.appendChild(legacyHelpers.view.frag(compiled));
		assert.equal(div.innerHTML, '<div class="outer"><div class="complete">\n\tfoo\n</div>\n</div>');
	});
}

QUnit.test("can.view.render() with a deferred", function(assert) {
	var compiled = can.view.render(
		new EJS({
			text: this.angleBracketsNoThis
		}).template.fn,
		{ animals: new Deferred().resolve(this.animals) },
		{}
	);
	assert.ok(compiled instanceof Deferred, "result is a deferred");
	assert.equal(compiled.state(), "resolved", "deferral is sync (already resolved because the sources are resolved)");
	assert.equal(compiled._resultArgs[0], '<ul><li>sloth</li><li>bear</li><li>monkey</li></ul>');
});
