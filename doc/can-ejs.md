@module {function} can-ejs
@parent can-views
@collection can-legacy
@package ../package.json
@group can-ejs/tags 0 tags
@group can-ejs/methods 1 methods

@deprecated {2.1} EJS is incompatible with [can-component] and should
be avoided for new projects. Projects using EJS should consider
switching to [can-stache].

@description EJS provides __live__ ERB-style client-side templates.

@signature `ejs( template )`

Returns `template` compiled to a renderer function.

```js
var ejs = require("can-ejs");
var renderer = ejs("<h1><%= message %></h1>");
var frag = renderer({message: "Hello World"});
frag //-> <h1>Hello World</h1>

document.body.appendChild(frag);
```

@param {String} template The content of the mustache template.

@return {function(Any)} A function that renders the ejs template into
a live documentFragment given data.

@signature `new ejs(options)`

Creates an EmbeddedJS template instance.  This form can be used
to render a string.

```js
var ejs = require("can-ejs");
var ejsInstance = new ejs({
	text: "<h1><%= message %></h1>"
});
var string = ejsInstance.render({message: "Hello World"});
string //-> "<h1>Hello World</h1>"
```

@body

## Basic Example

The following renders a Teacher's name and students into an element.  First,
create a teacher template in a script tag like:

```
<script type='text/ejs' id='teacherEJS'>

  <h2 class='<%= teacher.grade < 'c'? "good" : "bad" %>'>
    <%= teacher.name %>
  </h2>

  <ul>
    <% for(var i =0; i< teacher.students.length; i++){ %>
      <li><%= teacher.students[i].name %></li>
    <% } %>
  </ul>

</script>
```

Notice the magic tags?  Those are things that look like `<% %>` and
`<%= %>`.  Code between `<% %>` is run and the return value of code
between `<%= %>` is inserted into the page.

Next, create a teacher and render the template:

    var teacher = {
      name : "Mr. Smith",
      grade : "a",
      students : [
        {name : "Suzy"},
        {name : "Payal"},
        {name : "Curtis"},
        {name : "Alexis"}
      ]
    };

    var template = ejs.from("teacherEJS");

    document.getElementById('teacher')
      .appendChild( template(teacher) )

This results in HTML like:

    <div id='teachers'>
      <h2 class='good'>
        Mr. Smith
      </h2>

      <ul>
         <li>Suzy</li>
         <li>Payal</li>
         <li>Curtis</li>
         <li>Alexis</li>
      </ul>
    </div>

This is nice, but what if we change properties of the teacher?

## Basic Live Binding Example

EJS sets up live templating binding when a [can-map]'s properties are read
via [can-map::attr attr] within a magic tag.  To make this template
respond to changes in the teacher data, first rewrite the template
to use the attr method to read properties and `list( observeList, cb(item, i) )`
to iterate through a list like:

    <script type='text/ejs' id='teacherEJS'>

      <h2 class='<%= teacher.attr('grade') < 'c'? "good" : "bad" %>'>
        <%= teacher.attr('name') %>
      </h2>

      <ul>
        <% list(teacher.students, function(student){ %>
          <li><%= student.attr('name') %></li>
        <% }) %>
      </ul>

    </script>

__Note:__ The end of this page discusses why using `list` is
helpful, but it does nothing fancy.

Next, turn your teacher into a `new CanMap(object)` and pass
that to the template:

    var teacher = new CanMap({
      name : "Mr. Smith",
      grade : "a",
      students : [
        {name : "Suzy"},
        {name : "Payal"},
        {name : "Curtis"},
        {name : "Alexis"}
      ]
    });

	var template = ejs.from("teacherEJS");

    document.getElementById('teacher')
      .appendChild( template(teacher) );

Finally, update some properties of teacher and slap your
head with disbelief ...

    teacher.attr('name',"Prof. Snape")
    teacher.attr('grade','f+')
    teacher.attr('students').push({
      name : "Harry Potter"
    })

... but don't slap it too hard, you'll need it for building awesome apps.

## Demo

The following demo shows an EJS template being rendered with observable data.
It demonstrates live binding to attributes. The template and all data properties
are editable, so experiment!

@iframe can/view/ejs/doc/demo.html 1020

## Magic Tags

EJS uses 5 types of tags:



__`<%= CODE %>`__ - Runs JS Code and writes the _escaped_ result into the result of the template.

The following results in the user seeing "my favorite element is &lt;blink>BLINK&lt;blink>" and not
<blink>BLINK</blink>.

     <div>my favorite element is <%= '<blink>BLINK</blink>' %>.</div>

__`<%== CODE %>`__  - Runs JS Code and writes the _unescaped_ result into the result of the template.

The following results in "my favorite element is <B>B</B>.". Using `<%==` is useful
for sub-templates.

         <div>my favorite element is <%== '<B>B</B>' %>.</div>

__`<%% CODE %>`__ - Writes <% CODE %> to the result of the template.  This is very useful for generators.

         <%%= 'hello world' %>

__`<%# CODE %>`__  - Used for comments.  This does nothing.

         <%# 'hello world' %>

## Live Binding

EJS allows live binding by wrapping magic tag content within a function. When `attr()` is called
to update an observable object, these functions are executed to return the new value.

    // Suppose an observable "foo":

    var foo = new CanMap({
      bar: 'baz'
    });

    // Suppose also, the above observable is passed to our view:

    <%= foo.attr('bar') %>

    // EJS locates the magic tag and turns the above into:

    function() { return foo.attr('bar'); }

    // As "foo" is updated using attr(), this function is called again to
    // render the view with the new value.

This means that each function tag has a closure will reference variables in it's
parent functions. This can cause problems if you don't understand closures in
JavaScript. For example, the following binding does not work:

    <% for(var i =0; i < items.attr('length'); i++){ %>
      <li><%= items[i].attr('name') %></li>
    <% } %>

This is because it gets turned into:


    <% for(var i =0; i < items.attr('length'); i++){ %>
      LIVEBIND( function() { return items[i].attr('name') )
    <% } %>

When the wrapping function is called again, `i` will
not be the index of the item, but instead be items.length.

The [can-list.prototype.each can-list::each] method on all observable lists should be used to iterate through it:

    <% items.each(function(item){ %>
      <li><%= item.attr('name') %></li>
    <% }) %>

## Advanced Live Binding

Once you get the hang of how EJS works, it makes live-binding of complex
calculations possible.  The following extends a [can.Model.List] to suppot a `completed` method that
returns the total number of completed items in the list.  It can be used in a template like:

    <h2><%= todos.complete() %> Complete Todos </h2>

And implemented like:

    Todo.List = List.extend({
      completed: function() {
        var count = 0;

        this.attr('length');
        this.each(function(i, todo) {
          if(this.attr('completed')) {
            count++;
          }
        });

        return count;
      }
    });

`completed` listens on changes to the list (via `this.attr('length')`) and
each item's `'completed'` property.  EJS keeps track of which observe/attribute pairs are called
by `.complete()`.  If they change, EJS will automatically unbind.


## Element Callbacks

If a function is returned by the `<%= %>` or `<%== %>` magic tags within an element’s tag like:

    <div <%= function( element ) { element.style.display = 'none' } %> >
      Hello
    </div>

The function is called back with the HTMLElement as the first argument. This is useful to initialize functionality on an element within the view. This is so common that EJS supports ES5 arrow functions that get passed the NodeList wrapped element. Using jQuery, this lets you write the above callback as:

    <div <%= (el) -> el.hide() %> >
      Hello
    </div>

This technique is commonly used to add data, especially model instances, to an element like:

    <% todos.each( function( todo ) { %>
      <li <%= (el) -> el.data( 'todo', todo ) %>>
        <%= todo.attr( 'name' ) %>
      </li>
    <% } ) %>

jQuery’s `el.data( NAME, data )` adds data to an element. If your library does not support this, can provides it as `can.data( NodeList, NAME, data )`. Rewrite the above example as:

    <% todos.each( function( todo ) { %>
      <li <%= (el) -> can.data( el, 'todo', todo ) %>>
        <%= todo.attr( 'name' ) %>
      </li>
    <% } ) %>
