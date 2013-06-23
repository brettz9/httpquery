/*globals module, require, escape, unescape */

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
        cheerio = require('cheerio'), // https://github.com/MatthewMueller/cheerio
        xpath = require('xpath'), // https://npmjs.org/package/xpath (npm install xpath)
        Dom = require('xmldom').DOMParser, // https://npmjs.org/package/xmldom (npm install xmldom)
        
        // OPTIONS
        // debug = options.debug || false,
        ignoreQuerySupport = options.ignoreQuerySupport === undefined || options.ignoreQuerySupport, // i.e., default is true

        // STATIC VARIABLES USED TO HOLD INSTANCES
        bufferMap = new WeakMap(),
        // = new WeakMap(),
        // STATIC VARIABLES
        supportedRanges = ['xpath1', 'css3'],
        lwsf = '(?:(\\r\\n)?[ \\u0009])*',
        // Todo: overly simplistic as could be commas or semicolons inside
        regexListSeparator = new RegExp(lwsf + ',' + lwsf, '');
        regexParamSeparator = new RegExp(lwsf + ';' + lwsf, '');

    /**
    *
    */
    function preferHeaderCheck (req, regexStr) {
        var reqHeaders = req.headers,
            regex = new RegExp(regexStr, 'i');
        
        // Todo: How does Node encode multiple Prefer requests?
        return reqHeaders.prefer &&
            reqHeaders.prefer.trim().split(regexListSeparator).some(function (expectation) {
                return expectation.match(regex);
            });
    }
    
    /**
    * @private
    * @constant
    */
    function clientSupportCheck (req, queryTypeStr) {
        // was query-client-support
        return preferHeaderCheck(req, '^inform-of-query-support\\s*=\\s*("?)(?:[^\\s\\|]+\\|)*' + queryTypeStr + '(?:\\s*\\|(?:[^\\s|]+)*)*\\1$');
        //    reqHeaders['query-client-support'].trim().split(/\s*,\s+/).indexOf(queryTypeStr) > -1;
    }
    
    /**
    * @param {Object} req The HTTP request
    * @param {"minimal"|"representation"} returnType
    */
    function returnCheck (req, returnType) {
        return preferHeaderCheck(req, '^return\\s*=\\s*("?)' + returnType + '\\1$');
    }
    

    /**
    * For when client requires a given behavior
    * @private
    * @constant
    */
    function expectedSupportCheck (req, queryStr) {
        var reqHeaders = req.headers,
            regex = new RegExp('^query\\s*=\\s*(' + queryStr + ')$', 'i');

        return reqHeaders.expect && reqHeaders.expect.trim().split(regexListSeparator).reduce(function (prev, expectation) {
            var match = expectation.match(regex);
            return prev || (match && match[2]);
        }, null);
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
        isJSON = req.headers.accept === 'application/json'; // was "query-format"
        if (isJSON) {
            res.setHeader('query-content-type', contentType);
            res.setHeader('Content-Type', 'application/json');
        }
        return isJSON;
    }
    
    // Todo: abstract to avoid duplication with preferHeaderCheck
    function queryRequestCheck (req, regexStr) {
        var queryRequest = req.headers['query-request'],
            regex = new RegExp(regexStr, 'i');

        if (!queryRequest) {
            return false;
        }
        
        // Todo: we could allow for other checks, e.g., a property for namespace resolvers
        return queryRequest.trim().split(regexParamSeparator).slice(1).reduce(function (prev, expectation) {
            var match = expectation.match(regex);
            return prev || (match && match[1]);
        }, null);
    }
   
    // We use approach of RFC5987 ({@link http://tools.ietf.org/html/rfc5987})
    function getQueryRequest (req) {
        return queryRequestCheck(req, 'expr\\*' + lwsf + '=' + lwsf + 'UTF-8\'\'(.*)$');
    }
    
    /**
    * Not in use; use for client-side code
    */
    function encodeRFC5987ValueChars (str) {
        return encodeURIComponent(str).
            // Note that although RFC3986 reserves "!", RFC5987 does not, so we do not need to escape it
            replace(/['()]/g, escape). // i.e., %27 %28 %29
            replace(/\*/g, '%2A').
                // The following are not required for percent-encoding per RFC5987, so we'll allow for a little better readability over the wire: |`^
                replace(/%(?:7C|60|5E)/g, unescape);
    }
    function decodeRFC5987ValueChars (str) {
        return unescape(str);
    }

    function getQueryRequestDecoded (req) {
        // percent encodings to be produced as uppercase per http://tools.ietf.org/html/rfc3986#section-2.1 (referenced by http://tools.ietf.org/html/rfc5987#section-3.2.1 )
        return decodeRFC5987ValueChars(getQueryRequest(req));
    }

    function getQueryRequestType (req) {
        var match, queryRequest = req.headers['query-request'];
        if (!queryRequest) {
            return false;
        }
        match = queryRequest.match(/^[^;]*/);
        return match[0].trim();
    }

    function performQuery (req, res) {
        var doc, xpath1Request, queryResult, queryRequestType, $, css3RequestFull, css3Request, queryType, css3Attr,
            fileContents = String(bufferMap.get(res, '')), // String() Necessary?
            clientXPath1Support = clientSupportCheck(req, 'xpath1'),
            clientCSS3Support = clientSupportCheck(req, 'css3'),
            // The following two are not needed as we are supporting both
            // expectedXPath1 = expectedSupportCheck(req, '("?)xpath1\\2'),
            // expectedCSS3 = expectedSupportCheck(req, '("?)css3\\2'),
            expectedOther = expectedSupportCheck(req, '(?!("?)(?:css3|xpath1)\\2$).*?'),
            isJSON = detectAndSetJSONHeaders(req, res),
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

        if (expectedOther) {
            res.statusCode = 417;
            return 'Expectation failed: there is no "' + expectedOther.replace(/(^"|"$)/g, '') + '" value';
        }
        
        queryRequestType = getQueryRequestType(req);
        if ((ignoreQuerySupport || clientXPath1Support) && queryRequestType === 'xpath1' && !returnCheck(req, 'representation')) { // returnCheck() was a check for reqHeaders['query-full-request']; queryRequestType query-request test was query-request-xpath1
            doc = new Dom().parseFromString(fileContents);
            xpath1Request = getQueryRequestDecoded(req).trim(); // || '//b[position() > 1 and position() < 4]'; // || '//b/text()',
            queryResult = xpath.select(xpath1Request, doc);
            queryResult = isJSON ? nodeArrayToSerializedArray(queryResult) : wrapFragment(nodeArrayToSerializedArray(queryResult).join(''));
        }
        else if ((ignoreQuerySupport || clientCSS3Support) && queryRequestType === 'css3' && !returnCheck(req, 'representation')) { // returnCheck() was a check for reqHeaders['query-full-request']; queryRequestType query-request test was query-request-css3
            // Support our own custom :text() and :attr(...) pseudo-classes (todo: do as (two-colon) pseudo-elements instead)
            $ = cheerio.load(fileContents);
            css3RequestFull = getQueryRequestDecoded(req).trim().match(/(.*?)(?:\:(text|attr)\(([^\)]*)\))?$/); // Allow explicit "html" (toString) or "toArray" (or "json")?
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
                default:
                    throw 'Unexpected queryType';
            }
        }
        else {
            queryResult = fileContents;
        }

        res.statusCode = 200;
        return isJSON ? JSON.stringify(queryResult) : queryResult;
    }
    
    /**
    * @private
    */
    function addQueryRangesSupported (res) {
        var acceptRanges, oldAcceptRanges;
        oldAcceptRanges = res.getHeader('Accept-Ranges');
        acceptRanges = supportedRanges.concat(oldAcceptRanges || []).join(', '); // Could send "none" if NOT wishing to support any
        // See http://tools.ietf.org/html/rfc2616#section-10.4.17 for returning error code: 416 Requested Range Not Satisfiable
        // http://tools.ietf.org/html/rfc2616#section-10.4.17 for If-range
        res.setHeader('Accept-Ranges', acceptRanges); // was query-server-support
    }

    function handleRequestAndResponse (req, res) {
        addQueryRangesSupported(res);
        if (
            (ignoreQuerySupport || clientSupportCheck(req, '(css3|xpath1)') || expectedSupportCheck(req, '("?)(?:css3|xpath1)\\2')) &&
            supportedRanges.indexOf(getQueryRequestType(req)) === -1 &&
            !returnCheck(req, 'representation')) { // returnCheck() was a check for reqHeaders['query-full-request']
            res.statusCode = 200;
            return ''; // Don't waste bandwidth if client supports protocol and hasn't asked us to deliver the full document
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
