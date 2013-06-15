/*globals require*/

/**
This code is for simply exposing the HTTP Query protocol access to
static files. For use with a dynamic script, you should be able to simply
change statements in your code such as this:

var http = require('http');

...to this:

var http = require('./httpquery'); // Todo: Make into regular module here
*/

(function () {
'use strict';

var http = require('../httpquery').staticFiles;

http.createServer().listen(1337, '127.0.0.1');
console.log('Static server running at http://127.0.0.1:1337/');


}());
