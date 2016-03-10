# can-ejs

[![Build Status](https://travis-ci.org/canjs/can-ejs.png?branch=master)](https://travis-ci.org/canjs/can-ejs)

**DO NOT USE - NOT PRODUCTION READY**

Legacy Embedded JavaScript (EJS) view layer for CanJS. While this code has been heavily tested and is considered stable, it is no longer supported. CanJS now ships with Stache which is much more feature rich and much faster - you should use it instead!

## Usage

### ES6 use

With StealJS, you can import this module directly in a template that is autorendered:

```js
import plugin from 'can-ejs';
```

### CommonJS use

Use `require` to load `can-ejs` and everything else
needed to create a template that uses `can-ejs`:

```js
var plugin = require("can-ejs");
```

## AMD use

Configure the `can` and `jquery` paths and the `can-ejs` package:

```html
<script src="require.js"></script>
<script>
	require.config({
	    paths: {
	        "jquery": "node_modules/jquery/dist/jquery",
	        "can": "node_modules/canjs/dist/amd/can"
	    },
	    packages: [{
		    	name: 'can-ejs',
		    	location: 'node_modules/can-ejs/dist/amd',
		    	main: 'lib/can-ejs'
	    }]
	});
	require(["main-amd"], function(){});
</script>
```

### Standalone use

Load the `global` version of the plugin:

```html
<script src='./node_modules/can-ejs/dist/global/can-ejs.js'></script>
```

## Contributing

### Making a Build

To make a build of the distributables into `dist/` in the cloned repository run

```
npm install
node build
```

### Running the tests

Tests can run in the browser by opening a webserver and visiting the `test.html` page.
Automated tests that run the tests from the command line in Firefox can be run with

```
npm test
```
