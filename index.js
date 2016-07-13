
/* --------------------------------- Required Modules --------------------------------- */

const Value = require( 'abstract-value' )( 'Value' );

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