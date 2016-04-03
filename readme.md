# Magic-Arguments

Transforms "arguments" object to { key: value } object where key is argument name.  
Also can:
- transform "arguments" object to array
- return array of function arguments names

**Basic usage:**

```js
const Arguments = require( 'magic-arguments' );

// Arguments( arguments, argsConfig[, handlersContext, unordered] ) => { key: value }
// Arguments( arguments ).toArray() => Array

var someVar = 0;

var argsConfig = {
        a: { type: String, required: true },
        b: { type: [ Object, Array ], setDefault: generateFunc },
        c: { type: Boolean, default: false },
        d: { type: 'function' }
    };

function test( a, b, c ) {
    var args = Arguments( arguments, argsConfig );
    a = args.a; b = args.b; c = args.c;
    // ...
    return args;
}

function testArray( a, b, c ) {
    var argsArray = Arguments( arguments ).toArray();
    return argsArray;
}

// --- test ---
test( 123 )                     // => Error: 'a' is required
test( '123', true )             // => { a: '123', b: { a: 0 }, c: true }
test( '123', function D() {} )  // => { a: '123', b: { a: 1 }, c: false, d: function D() {} }
test( 123, '456', [] )          // => { a: '456', b: [], c: false }


// --- testArray ---
testArray( 123, '456' ) // => [ 123, '456' ]

// --- helpers ---
function generateFunc() { return { a: someVar++ } }
```


**Advanced usage:**
```js
var context1 = { msg: 'Hello,' },
    context2 = { msg: ' world!' };
    
var argsConfig = {
        str: { type: String, default: '', handlers: [ updateStr, updateStr.bind( context2 ) ] },
    	action: { type: [ Function, String, Array ], default: null }
    };

function test( str, action ) {
    // here we must define context for handlers if they use 'this' and are not binded explicitly
    var args = Arguments( arguments, argsConfig, context1 );
    // ...
    return args;
}

function test2( str, action ) {
    // if we forgot to set context the result could be magical)
    var args = Arguments( arguments, argsConfig );
    // ...
    return args;
}

// --- test ---
test() // => { str: 'Hello, world!', action: null }

// --- test2 ---
test2() // => { str: 'undefined world!', action: null }

// --- handlers ---
function updateStr( value, name, result ) {
	result[ name ] = value + this.msg;
	// same as:
	return value + this.msg;
}
```

**Using magic with unordered arguments:**  
*This could be strange so don't surprize. I don't know why somebody may want this)*
```js
var argsConfig = {
        a: { type: String },
    	b: { type: [ Function, String, Array ] },
    	c: { type: Object },
    	d: { type: [ Boolean, String ] }
    };

function test() {
    // true on end means that order of arguments can be magical)
    var args = Arguments( arguments, argsConfig/*, handlersCtx*/, true );
    // ...
    return args;
}

// --- test ---
test( true, { a: 1 }, '123', function () {} )
// => { a: '123', b: function () {}, c: { a: 1 }, d: true }
```