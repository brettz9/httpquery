/*globals require*/

(function () {

'use strict';

var http = require('./baked-in-middleware');

http.createServer(function (req, res) {

    res.end('World!');

}).listen(1337, '127.0.0.1');

console.log('Server running at http://127.0.0.1:1337/');

//console.log(http.STATUS_CODES); // Can still use otherwise as regular "http" API

}());
