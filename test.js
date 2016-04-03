// use mocha
// > mocha

var Arguments = require('./');
var Assert = require('assert');

describe('#func', function () {
	var config1 = {
			a: { type: Array },
			b: { type: Object, required: true },
			c: { type: Function }
		};


	// ordered
	function orderedTest( config ) {
		return function ( a, b, c ) {
			return Arguments( arguments, config );
		}
	}

	// disordered
	function unorderedTest( config ) {
		return function ( a, b, c ) {
			return Arguments( arguments, config, true );
		}
	}
	

	it('should create a function with regular arguments', function () {

		var test = [ [1,2,3], {second: 2}, function(){} ];

		var args = orderedTest( config1 ).apply( null, test );

		Assert.equal( args.a, test[0] );
		Assert.equal( args.b, test[1] );
		Assert.equal( args.c, test[2] );
	});


	it('should throw an error when a required argument is not passed a value', function () {
		Assert.throws(function () {

			var test = [ [1,2,3], function(){} ];

			var args = orderedTest( config1 ).apply( null, test );
		});
	});

	it('should define correct arguments when order does not matter', function () {
		var test = [ {second: 2}, function(){}, [1,2,3] ];

		var args = unorderedTest( config1 ).apply( null, test );

		Assert.equal( args.a, test[2] );
		Assert.equal( args.b, test[0] );
		Assert.equal( args.c, test[1] );

		// Assert(orderedTest( config1 )('5').a === 5);
	});

	var defaultValue = [5,6,7];

	var config2 = {
			a: { type: Array, setDefault: function() { return defaultValue } },
			b: { type: Object, required: true, default: null },
			c: { type: Function, default: null }
		};

	it('should create a function with `default` arguments', function () {
		var test = [ function(){}, [1,2,3] ];

		var args = unorderedTest( config2 ).apply( null, test );

		Assert.equal( args.a, test[1] );
		Assert.equal( args.b, config2.b.default );
		Assert.equal( args.c, test[0] );
	});

	it('should create a function with `default` arguments (part 2)', function () {
		var test = [];

		var args = unorderedTest( config2 ).apply( null, test );

		Assert.equal( args.a, defaultValue );
		Assert.equal( args.b, config2.b.default );
		Assert.equal( args.c, config2.c.default );
	});

	
});