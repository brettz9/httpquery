/**
 * This code is for simply exposing the HTTP Query protocol access to
 * static files. For use with a dynamic script, you should be able to simply
 * change statements in your code such as the following.
 *
 * @example
 * import http from 'http';
 *
 * ...to this:
 *
 * import httpquery from 'httpquery';
 * const http = httpquery('dynamic');
*/

// import http from 'http';

import httpquery from '../httpquery.js';

const http = httpquery('dynamic');

http.createServer(function (req, res) {
  /*
    // req.httpQuery.debug = 1;
    req.httpQuery.setStaticURL(req.url);
    req.httpQuery.detectHeaders();
    req.httpQuery.readFile();
    */

  res.end('<div><b>Hello</b> <i>World</i>!</div>');
}).listen(1337, '127.0.0.1');

// eslint-disable-next-line no-console -- CLI
console.log('Server running at http://127.0.0.1:1337/');
