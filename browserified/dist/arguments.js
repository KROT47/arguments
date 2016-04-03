(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// $ browserify indexForWeb.js -o dist/arguments.js
// $ uglifyjs dist/arguments.js -o dist/arguments.min.js
window.Arguments = require( '../index' );
},{"../index":3}],2:[function(require,module,exports){

/* --------------------------------- Required Modules --------------------------------- */

const Extend = require( 'extend' );

const Instanceof = require( 'instanceof' );


/* --------------------------------- Module Exports --------------------------------- */

module.exports = GetArguments;


/* --------------------------------- Example --------------------------------- */

/*
const config = {
	stream: {
		type: Stream,
		setDefault: () => createStream()
	},
	first: { type: [Function, String, Array] },
	second: { type: Function },
	config: { type: Object }
};

function ( Stream1, Function1, Object1 ) {
	var args = GetArguments( config, arguments, handlersCtx );

	// args == { stream: Stream1, first: Function1, config: Object1 }
}

function ( Object1, Stream1, String1 ) {
	// here we tell that arguments order does not matter
	var args = GetArguments( true, config, arguments, handlersCtx );

	// args == { stream: Stream1, first: String1, config: Object1 }
}
*/


/* --------------------------------- Get Arguments --------------------------------- */

// default template of each config element
const defaultConfigArg = {
		type: null, // (Array|Object)
		required: false,
		// handlers use current argument value to update it and result if needed, e.g.
		// !!! IMPORTANT !!!
		// if handler returns value always add false: return value || false;
		// in example lower: result.a = 123 and result[current arg] = !!value
		// function( value, name, result ){ result.a = 123; return !!value }
		handlers: null,  // (Array)
		default: undefined,
		setDefault: null, // function(){ return default }
	};

/**
 * Returns arguments object due to config
 * @param (Boolean) unordered - tells that arguments can be used in any order
 * @param (Object) config - defines how arguments object should be created
 * @param (Object) args - function arguments
 * @param (Object) handlersCtx - context of all handlers
 * @return (Object)
 */
function GetArguments( config, args, handlersCtx, unordered ) {
	
	// check if args is Arguments object
	args = args.toArray ? args.toArray() : args;

	// setup config
	config = setupConfig( config );

	var goArguments = new GoArguments( config, args, unordered, handlersCtx );

	// launch recursion
	var result = goArguments.go( 0, 0, {} );

	// check result and setup defaults if needed
	if ( !( result = goArguments.checkResult( result ) ) ) {
		throw new Error( 'Something went wrong' );
	}

	return result;
}

function GoArguments( config, args, unordered, handlersCtx ) {
	this.config = config;
	this.args = args;
	this.ordered = !unordered;
	this.getK = this.ordered ? getKOrdered : getKDisordered;
	this.handlersCtx = handlersCtx;
}

GoArguments.prototype = {
	go: function ( i, k, result ) {
		var argName, tempResult = result, tempK = k;

		while ( i < this.args.length ) {
			while ( tempK < this.config.argNames.length ) {
				argName = this.config.argNames[tempK];

				if ( !tempResult[ argName ] ) {
					// if ( instanceOf( this.args[i], this.config[ argName ].type ) ) {
					if ( this.config[ argName ].acceptArgType( this.args[i] ) ) {
						// good one

						tempResult[ argName ] = this.args[i];
						// go next
						if ( tempResult = this.go( i + 1, this.getK( tempK ), tempResult ) ) {
							// all result ready
							return tempResult;
						} else if ( this.ordered ) {
							return this.go( i, this.getK( tempK ), result );
						}
					} else {
						if ( !this.config[ argName ].checkOnLeave() && this.ordered ) {
							return false;
						}
					}
				}
				tempK++;
			}
			if ( this.ordered ) return this.go( i + 1, k, result );
			i++;
		}

		return result
	},

	checkResult: function( result ) {
		if ( !result ) return false;

		var that = this, argName, configArg, i, k, temp, len = this.config.argNames.length;

		// check for required and set at last
		for ( k = 0; k < len; ++k ) {
			argName = this.config.argNames[k];
			configArg = this.config[ argName ];

			// handlers time
			if ( configArg.handlers
				&& configArg.handlers.length
				&& result[ argName ] !== undefined
			) {
				/*// bind current result to update function
				updateResult = updateResult ? updateResult : UpdateResult.bind( result );*/
				// execute each handler
				configArg.handlers.forEach( function ( handler ) {
					temp = [ result[ argName ], argName, result ];

					temp = handler.apply( that.handlersCtx, temp );

					if ( temp !== undefined ) result[ argName ] = temp;
				});
			}

			if ( result[ argName ] === defaultConfigArg.default ) {
				// check if required argument not defined
				if ( configArg.mustBeDefined ) return false;

				// setup default value
				if ( configArg.default !== defaultConfigArg.default ) {

					result[ argName ] = configArg.default;

				} else if ( configArg.setDefault ) {

					result[ argName ] = configArg.setDefault();
				}
			}
		}

		return result
	}
};


/* --------------------------------- Config Argument --------------------------------- */

function ConfigArg( configArg ) { Extend( this, defaultConfigArg, configArg ) }

Object.defineProperties( ConfigArg.prototype, {

	acceptArgType: { value: function( arg ) { 
		return Instanceof( arg, this.type ) } },

	mustBeDefined: {
		get: function() {
			return this.required 
					&& !this.setDefault
					&& this.default === defaultConfigArg.default
		}
	},

	checkOnLeave: { value: function() { return !this.mustBeDefined } }
});


/* --------------------------------- Helpers --------------------------------- */

function setupConfig( config ) {
	// first extend
	config = Extend( {}, config );
	// setup each config argument
	for ( var i in config ) config[i] = new ConfigArg( config[i] );
	// argNames will tell which argument name is currently in use
	config.argNames = Object.keys( config );

	return config;
}

function getKOrdered( k ) { return k + 1 }
function getKDisordered( k ) { return 0 }
},{"extend":5,"instanceof":6}],3:[function(require,module,exports){

/* --------------------------------- Required Modules --------------------------------- */

const Value = require( 'abstract-value' );

const Instanceof = require( 'instanceof' );

const getArguments = require( './get-arguments' );


/* --------------------------------- Module Exports --------------------------------- */

module.exports = Arguments;

module.exports.getNames = GetArgumentsNames;


/* --------------------------------- Example --------------------------------- */

/*const config = {
	stream: {
		type: Stream,
		setDefault: () => createStream(),
		required: true,
		handlers: [
			function ( value, name, result ) {

				result[ name ] = value + 1;
				// equals to:
				return value + 1;
			}
		]
	},
	first: { type: [Function, String, Array], default: null },
	second: { type: Function },
	config: { type: Object }
};

function ( Stream1, Function1, Object1 ) {
	var args = Arguments( arguments, config );

	// args == { stream: Stream1, first: Function1, config: Object1 }
}

function ( Object1, Stream1, String1 ) {
	// here we tell that arguments order does not matter
	var args = Arguments( arguments, config, true )

	// args == { stream: Stream1, first: String1, config: Object1 }
}
*/


/* --------------------------------- Arguments Module --------------------------------- */

/**
 * Brings magic to working with arguments
 * @param (Object) args - function arguments
 * @return (Arguments Object)
 */
function Arguments( args, argsConfig, handlersCtx, unordered ) {

	if ( argsConfig ) return new Arguments( args ).using( argsConfig, handlersCtx, unordered ).get();

	if ( !( this instanceof Arguments ) ) return new Arguments( args );

	this._arguments = args;

}

Object.defineProperties( Arguments.prototype, {
	// Applies config to arguments
	// @param (Object) config - defines how arguments object should be created
	// @param (Boolean) unordered - tells that arguments can be used in any order
	// @return (Object)
	using: {
		value: function ( config, handlersCtx, unordered ) {

			if ( typeof handlersCtx == 'boolean' ) {
				unordered = handlersCtx;
				handlersCtx = null;
			}

			var args = getArguments( config, this, handlersCtx || this, unordered );

			this.setNames( Object.keys( args ) );

			var i, k = 0;
			for ( i in args ) this._arguments[ k++ ] = args[ i ];

			this._argsObj = args;

			return this
		}
	},

	// returns current args object: { argName: argValue }
	// @param (Boolean) unordered - tells that arguments can be used in any order
	// @param (Object) config - defines how arguments object should be created
	// @return (Object)
	get: {
		value: function () {

			if ( this._argsObj ) return this._argsObj;

			this._argsObj = {};

			for ( var i = 0; i < this._arguments.length; ++i ) {
				if ( this.names[ i ] === undefined ) break;

				this._argsObj[ this.names[ i ] ] = this._arguments[ i ];
			}
			
			return this._argsObj
		}
	},

	// returns arguments values as array
	toArray: {
		value: function () {
			if ( !this._argumentsArray ) {
				this._argumentsArray = Array.prototype.slice.call( this._arguments );
			}

			return this._argumentsArray
		}
	},

	// executes function on each argument, returning this Arguments object
	// func: function ( value, index ) {}
	forEach: {
		value: function ( func ) {
			if ( func ) {
				var len = this.length;
				
				for ( var i = 0; i < len; ++i ) func( this._arguments[i], i );
			}
			return this
		}
	},

	// returns current arguments names if defined
	names: {
		get: function () {
			return this._names 
					|| ( this._names = GetArgumentsNames( 
							this._namesFunc || this._arguments.callee
						))
		}
	},

	// returns original arguments names if defined
	origNames: {
		get: function () {
			return this._origNames 
					|| ( this._origNames = GetArgumentsNames( this._arguments.callee ) )
		}
	},

	// defines new arguments names from array, function or string
	// if function then its arguments names will be parsed and used
	// if string then it means that there are only one argument ( else could be error )
	// @param (Array|Function|String) name
	setNames: {
		value: function ( names ) {
			if ( names ) {

				this._reset();

				if ( typeof names == 'function' ) {
					this._namesFunc = names;
					this._names = null;
				} else if ( !Array.isArray( names ) ) {
					this._names = [ names ];
				} else {
					this._names = names;
				}
			}
			return this
		}
	},

	// returns arguments quantity
	length: { get: function () { return this._arguments.length } },

	// replaces arguments values using replacements object: { argName : newArgValue }
	replace: {
		value: function ( replacements ) {
			var args = Arguments( arguments, replaceArgsConfig );

			this._reset();

			return this._replace( args.replacements )
		}
	},


	/* ------------ Private ------------- */
	
	_reset: {
		value: function () {
			this._argsObj = null;
			this._argumentsArray = null;
		}
	},

	_replace: {
		value: function ( replacements ) {
			if ( replacements ) this._arguments = this._getArgumentsObject( replacements );

			return this
		}
	},

	// updates arguments object with replacements
	_getArgumentsObject: {
		value: function ( replacements ) {
			var argsObj = this._arguments;
			
			var replKeys = this._prepareReplacements( replacements );

			// arguments object is already changeable - using fast replace
			if ( argsObj._modified ) {
				for ( var i in replacements ) {
					argsObj[i] = getValue( replacements, i, argsObj );
				}
				return argsObj;
			}

			// arguments object is non configurable yet - using slow replacement
			var newArgsObj = {};

			var props = Object.getOwnPropertyNames( argsObj ).concat( replKeys );

			for ( var i = props.length; i--; ) {
				newArgsObj[props[i]] = getValue( replacements, props[i], argsObj );

				if ( newArgsObj[props[i]] === undefined ) newArgsObj[props[i]] = argsObj[props[i]];
			}

			newArgsObj.length = Math.max.apply( null, Object.keys( argsObj ).concat( replKeys ) ) + 1;
			

			Object.defineProperty( newArgsObj, '_modified', { value: true, enumerable: false });

			return newArgsObj
		}
	},

	_prepareReplacements: {
		value: function ( replacements ) {

			var replKeys = Object.keys( replacements );

			var alphaKeys = replKeys.filter( alphaStringFilter );

			replKeys = replKeys.filter( function ( key ) {
							return alphaKeys.indexOf( key ) < 0
						});

			// check if there is some alpha keys - change them to numeric
			if ( alphaKeys.length ) {
				var names = this.names, index;

				for ( var i = alphaKeys.length; i--; ) {
					index = names.indexOf( alphaKeys[i] );

					replacements[ index ] = replacements[ alphaKeys[i] ];
					delete replacements[ alphaKeys[i] ];

					replKeys.push( index );
				}
			}

			return replKeys
		}
	}
});


/* --------------------------------- Helpers --------------------------------- */

const replaceArgsConfig = {
		replacements: { type: [ Array, Object ], handlers: [ arrayToObject ] }
	};

function arrayToObject( name, value, result ) {

	if ( Instanceof( value, Array ) ) {
		result[name] = {};

		for ( var i = value.length; i--; ) result[name][i] = value[i];
	}
}


/* ------------ Get Arguments Object ------------- */

function alphaStringFilter( str ) { return !( Number( str ) + 1 ) }

function getValue( values, key, origValues ) {
	var value = values[ key ];

	if ( value instanceof Value ) return value.valueOf( origValues[ key ], key );

	return value
}


/* ------------ Get Arguments Names ------------- */

const stripComments = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const argumentNames = /([^\s,]+)/g;

function GetArgumentsNames( func ) {
	var fnStr = func.toString().replace( stripComments, '' );
	var result = fnStr
					.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' ) )
					.match( argumentNames );

	return result === null ? [] : result;
}
},{"./get-arguments":2,"abstract-value":4,"instanceof":6}],4:[function(require,module,exports){

/* --------------------------------- Module Exports --------------------------------- */

module.exports = Value;


/* --------------------------------- Get Value Module  --------------------------------- */

function Value( value, properties ) {

	if ( !( this instanceof Value ) ) return new Value( value, properties );

	this.__value = value;

	if ( properties ) for ( var i in properties ) this[ i ] = properties[ i ];
}

Object.defineProperties( Value.prototype, {

	valueOf: { value: function () { return this.__value } },

	set: { value: function ( newValue ) { this.__value = newValue } }
});
},{}],5:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {/**/}

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[name] = extend(deep, clone, copy);

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						target[name] = copy;
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],6:[function(require,module,exports){


/* --------------------------------- Module Exports --------------------------------- */

module.exports = Instanceof;


/* --------------------------------- Instanceof --------------------------------- */

function Instanceof( obj, types ) {
	if ( Array.isArray( types ) ) {
		for ( var i = types.length; i--; ) if ( _Instanceof( obj, types[i] ) ) return true;
	} else {
		return _Instanceof( obj, types )
	}

	return false;
}


/* --------------------------------- _Instanceof --------------------------------- */

function _Instanceof( obj, type ) {
	
	switch ( typeof type ) {
		case 'number':
			if ( isNaN( type ) ) type = 'nan';
			else throw Error( 'type must be function, string, object or NaN' );
		break;
			
		case 'string':
			type = type.toLowerCase();
		break;
	}

	switch ( type ) {
			
		case 'nan':
			return typeof obj == 'number' && isNaN( obj )
		break;
		
		case Object:
		case 'object':
			return !Array.isArray( obj ) && obj !== null && typeof obj == 'object'
		break;

		case Array:
		case 'array':
			return Array.isArray( obj )
		break;

		case String:
		case 'string':
			return typeof obj == 'string'
		break;

		case Number:
		case 'number':
			return typeof obj == 'number' && !isNaN( obj )
		break;

		case Boolean:
		case 'boolean':
			return typeof obj == 'boolean'
		break;

		case Function:
		case 'function':
			return typeof obj == 'function'
		break;

		case null:
		case 'null':
			return obj === null
		break;
		
		case undefined:
		case 'undefined':
			return obj === undefined
		break;
		
		case Symbol:
		case 'symbol':
			return typeof obj == 'symbol'
		break;
		
		default:
			return obj instanceof type;
	}
}

try { Symbol } catch (e) { Symbol = 555 }
},{}]},{},[1]);
