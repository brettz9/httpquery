htteepee
=======

A teepee you can use to cover your Node HTTP servers!

Allows you to easily add middleware layers to your Node.js server.

    npm install htteepee

Uses [stack](https://github.com/creationix/stack/) but allowing for a very minor simplification in API usage.

Just change:

```javascript
    var http = require('http');
```

...to this:

```javascript
    var http = require('htteepee');
```

...and add your middleware functions to the beginning of createServer calls (without need for an extra require and wrapping):


```javascript
http.createServer(require('./middleware')('Hello'), function (req, res) {

    res.end('World!');

}).listen(1337, '127.0.0.1');
```

Or, if you want to minimize interference with source files even more, you can require your own file containing the baked in middleware:

```javascript
var http = require('./baked-in-middleware');

http.createServer(function (req, res) {

    res.end('World!');

}).listen(1337, '127.0.0.1');
```

...and use the `createMiddlewareServer` method inside the required middleware file:

```javascript
var http = require('htteepee');
http.createServer = http.createMiddlewareServer(require('./middleware')('Hello '));
module.exports = http;
```
