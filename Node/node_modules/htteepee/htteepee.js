/*globals module, require*/

var stack = require('stack'),
    http = require('http'),
    _hs = http.createServer;

http.createServer = function createServer () {
    'use strict';
    return _hs.call(http,
        stack.apply(stack, Array.prototype.slice.call(arguments))
    );
};

http.createMiddlewareServer = function (mws) {
    'use strict';
    mws = Array.prototype.slice.call(arguments);
    return function () {
        return _hs.call(http,
            stack.apply(stack, mws.concat(Array.prototype.slice.call(arguments)))
        );
    };
};

module.exports = http;
