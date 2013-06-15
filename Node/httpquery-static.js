/*globals module, require*/

var http = require('htteepee');
http.createServer = http.createMiddlewareServer(require('./httpquery-middleware')('Hello ')); // Todo: We might cause this staticFiles to require invocation, e.g., to pass some config
module.exports = http;
