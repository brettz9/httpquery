/*globals module, require */

/*
In order to allow customization by the user depending on a
specific request or response (rather than just initialization
performed by the constructor), we could let the user:
1. Add properties/methods to the request/response objects
directly and read them from the middleware, but this could
run into namespace problems.
2. Change the middleware approach to allow passing on of
an additional argument (or add to the "next" function?) but
besides possibly running into namespacing problems with
other middleware that supported this, it would be limited to
those which did support it. (?)
3. Extend the htteepee "createServer" method to allow extra
arguments containing functions we could invoke (passing it
them request/responses). This might fit with "https" pattern allowing
an options first argument (though again, namespacing could
become an issue).

For now, we will try to allow setting of defaults, and at most
detect a changing of req.url and headers by the user.
*/

/*
@todo Handle favicons for default behavior
@todo ensure can use HTML or XML DOM with content-type accordingly
@todo Use JSDOM or http://zombie.labnotes.org/ (non-Windows?)?
@todo Any way to avoid need for next() calls from middleware (does it
allow async use or something?)
*/

module.exports = function (options) {
    'use strict';

    var  
        // REQUIRES
        WeakMap = require('es6-collections'),        
        fs = require('fs'),
        path = require('path'),
        cheerio = require('cheerio'), // https://github.com/MatthewMueller/cheerio
        xpath = require('xpath'), // https://npmjs.org/package/xpath (npm install xpath)
        Dom = require('xmldom').DOMParser, // https://npmjs.org/package/xmldom (npm install xmldom)
        
        // OPTIONS
        debug = options.debug || false,
        ignoreQuerySupport = options.ignoreQuerySupport === undefined || options.ignoreQuerySupport, // i.e., default is true

        // STATIC VARIABLES (though used to hold instances)
        bufferMap = new WeakMap();
        // = new WeakMap(),

    /**
    * @private
    * @constant
    */
    function end (res, code, fileContents) {
        res.statusCode = code;
        res.end(fileContents); //  + '\n'
    }

    /**
    * @private
    * @constant
    */
    function clientSupportCheck (req, str) {
        var reqHeaders = req.headers;
        return reqHeaders['query-client-support'] &&
            reqHeaders['query-client-support'].trim().split(/\s+/).indexOf(str) > -1;
    }


    /**
    * Due to the need for a Content-Type header, this function must be called
    *  after setContentTypeByFileExtension (or after setting Content-Type elsewhere); auto-detect option?
    * @private
    * @constant
    * @returns {Boolean} Whether or not the current headers recognize the content to be sent as JSON
    */
    function detectAndSetJSONHeaders (req, res) {
        var isJSON,
            contentType = res.getHeader('Content-Type');
        
        if (!contentType) {
            throw 'detectAndSetJSONHeaders() must be invoked after a Content-Type header is set, as through setContentTypeByFileExtension()';
        }
        isJSON = req.headers['query-format'] === 'json';
        if (isJSON) {
            res.setHeader('query-content-type', contentType);
            res.setHeader('Content-Type', 'application/json');
        }
        return isJSON;
    }

    
    /**
    * @private
    */
    function exitError (res, err) {
        var errorMessage = debug ? err : 'ERROR';
        end(res, 404, '<div style="color:red;font-weight:bold">' + errorMessage + '</div>');
    }

    function performQuery (req, res) {
        var doc, xpath1Request, queryResult, $, css3RequestFull, css3Request, queryType, css3Attr,
            fileContents = String(bufferMap.get(res, '')), // String() Necessary?
            clientXPath1Support = clientSupportCheck(req, 'xpath1'),
            clientCSS3Support = clientSupportCheck(req, 'css3'),
            isJSON = detectAndSetJSONHeaders(req, res),
            reqHeaders = req.headers,
            nodeArrayToSerializedArray = function (arr) {
                return arr.map(function (node) {
                    return node.toString();
                });
            },
            wrapFragment = function (frag) {
                var tag, isHTML = res.getHeader('Content-Type') === 'text/html';
                if (isHTML) { // || queryResult.length <= 1) { // No need to wrap for HTML or single result sets as no well-formedness requirements
                    return frag;
                }
                tag = 'div xmlns="http://www.w3.org/1999/xhtml"';
                return '<' + tag + '>' + frag + '</' + tag.match(/^\w*/)[0] + '>';
            };

        if ((ignoreQuerySupport || clientXPath1Support) && reqHeaders['query-request-xpath1'] && !reqHeaders['query-full-request']) {
            doc = new Dom().parseFromString(fileContents);
            xpath1Request = reqHeaders['query-request-xpath1'] && reqHeaders['query-request-xpath1'].trim(); // || '//b[position() > 1 and position() < 4]'; // || '//b/text()',
            queryResult = xpath.select(xpath1Request, doc);
            queryResult = isJSON ? nodeArrayToSerializedArray(queryResult) : wrapFragment(nodeArrayToSerializedArray(queryResult).join(''));
        }
        else if ((ignoreQuerySupport || clientCSS3Support) && reqHeaders['query-request-css3'] && !reqHeaders['query-full-request']) {
            // Support our own custom :text() and :attr(...) pseudo-classes (todo: do as (two-colon) pseudo-elements instead)
            $ = cheerio.load(fileContents);
            css3RequestFull = reqHeaders['query-request-css3'] && reqHeaders['query-request-css3'].trim().match(/(.*?)(?:\:(text|attr)\(([^\)]*)\))?$/); // Allow explicit "html" (toString) or "toArray" (or "json")?
            css3Request = css3RequestFull[1];
            queryType = css3RequestFull[2] || (isJSON ? 'toArray' : 'toString');
            css3Attr = css3RequestFull[3];

            nodeArrayToSerializedArray = function (items) {
                /*return arr.map(function (node) {
                    return node; //.html();
                });*/
                return items.map(function (i, elem) {
                     return $(this).toString();
                });
            };
            
            switch (queryType) {
                case 'attr': // Only gets one attribute anyways, so no need to handle differently for JSON (except the stringify below)
                    queryResult = $(css3Request).attr(css3Attr);
                    break;
                case 'toArray':
                    queryResult = nodeArrayToSerializedArray($(css3Request)); // $(css3Request).toString(); handles merging
                    break;
                // Todo: Change 'text' to return array of text nodes in case of JSON?
                case 'text':
                    queryResult = $(css3Request)[queryType]();
                    break;
                case 'toString':
                    queryResult = $(css3Request); // Don't merge with next line as intermediate queryResult may be needed by wrapFragment
                    queryResult = wrapFragment(nodeArrayToSerializedArray(queryResult).join('')); // $(css3Request).toString(); handles merging
                    break;
            }
        }
        else {
            queryResult = fileContents;
        }

        return fileContents = isJSON ? JSON.stringify(queryResult) : queryResult;
        
        end(res, 200, fileContents);
    }


    function readFile (req, res, path) {
        fs.readFile(path, function (err, fileContents) {
            if (err) {
                return exitError(res, err);
            }
            
            // performQuery (continue middleware)
        });
    }

    /**
    * @todo Replace this approach with https://gist.github.com/brettz9/5790179 or https://github.com/mscdex/mmmagic (detect from file content)
    */
    function setContentTypeByFileExtension (file, res) {
        $h.url = file;
        var contentType,
            extension = path.extname(file).replace(/^\./, '');

        res.setHeader('Content-Type', {
            xhtml: 'application/xhtml+xml',
            xml: 'application/xml',
            tei: 'application/tei+xml'
        }[extension] || 'text/html');
    }
    
    /**
    * @private
    * @constant
    */
    function addQueryRangeSupports (res) {
        oldAcceptRanges = res.getHeader('Accept-Ranges');
        acceptRanges = ['xpath1', 'css3'].concat(oldAcceptRanges || []).join(', ');
        res.setHeader('Accept-Ranges', acceptRanges); // was query-server-support
    }

    function handleRequestAndResponse (req, res) {
        // todo: Do some work here
        var acceptRanges, oldAcceptRanges,
            reqHeaders = req.headers,
            newReq = {
                // API
                setContentTypeByFileExtension: function (url) {
                    setContentTypeByFileExtension(url, res);
                },
                setStaticURL: function (url) {
        if (!$h.url[0].match(/\w/) || $h.url.match(/\.\./)) {
            return exitError(res, 'Disallowed character in file name');
        }
                    var pth = path.normalize(require('url').parse(url).pathname);
                    pth = (!pth || pth.slice(-1) === '/') ? pth + 'index.html' : pth;
                    this.setContentTypeByFileExtension(pth);
                },
                readFile: function (url) { // Todo: Allow a parameter at all?
                    readFile(req, res, (url || $h.url));
                }
            };

        addQueryRangeSupports(res);
        if (reqHeaders['query-client-support'] && !reqHeaders['query-request-xpath1'] && !reqHeaders['query-request-css3'] && !reqHeaders['query-full-request']) {
            end(res, 200, ''); // Don't waste bandwidth if client supports protocol and hasn't asked us to deliver the full document
            // Todo: we should allow delivery of a default payload (e.g., full doc if not specified as requesting empty for feature detection+immediate execution if supported)
        }
        return performQuery(req, res); // transformedContent
    }

    /**
    * @param {IncomingMessage} req See {@link http://nodejs.org/api/http.html#http_http_incomingmessage}
    * @param {ServerResponse} res See {@link http://nodejs.org/api/http.html#http_class_http_serverresponse} and {@link http://nodejs.org/api/stream.html#stream_class_stream_writable}
    */
    return function (req, res, next) {
        var _end = res.end;
        
        // Todo: Handle encoding argument on this method (use https://github.com/bnoordhuis/node-iconv or https://github.com/bnoordhuis/node-buffertools ?)
        res.write = function (chunk, encoding) {
            bufferMap.set(res, bufferMap.get(res, '') + chunk);
        };
        
        res.end = function (data, encoding) {
            this.write(data, encoding); // We'll leave it to _end() using the result of handleRequestAndResponse() to do the real writing
            _end.call(
                res,
                handleRequestAndResponse(req, res)
                // Todo: no encoding argument here to avoid double-decoding?
            );
        };
        next();
    };
};
