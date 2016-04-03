// $ browserify indexForWeb.js -o dist/arguments.js
// $ uglifyjs dist/arguments.js -o dist/arguments.min.js
window.Arguments = require( '../index' );