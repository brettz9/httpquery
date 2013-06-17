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

//var http = require('http');
var http = require('../httpquery')('dynamic');

http.createServer(function (req, res) {

    /*
    // req.httpQuery.debug = 1;
    req.httpQuery.setStaticURL(req.url);
    req.httpQuery.detectHeaders();
    req.httpQuery.readFile();
    */

    res.end('<div><b>Hello</b> <i>World</i>!</div>');
 
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');


}());
