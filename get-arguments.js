
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
			if ( configArg.handlers && configArg.handlers.length ) {
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