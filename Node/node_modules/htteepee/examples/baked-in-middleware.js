/*globals module, require*/

var http = require('../htteepee');
http.createServer = http.createMiddlewareServer(require('./middleware')('Hello '));
module.exports = http;
