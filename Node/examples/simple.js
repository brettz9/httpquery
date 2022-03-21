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
 * import httpquery from 'httpquery');
 * const http = httpquery('static');
*/

import httpquery from '../httpquery.js';

const http = httpquery('static');

http.createServer().listen(1337, '127.0.0.1');

// eslint-disable-next-line no-console -- CLI
console.log('Static server running at http://127.0.0.1:1337/');
