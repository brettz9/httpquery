/*globals module, require */
/*
@todo Handle favicons for default behavior
@todo Make this integratable into a pipeline
@todo ensure can use HTML or XML DOM with content-type accordingly
@todo Use JSDOM or http://zombie.labnotes.org/ (non-Windows?)?
*/

module.exports = function (txt) {
    'use strict';

    var fs = require('fs'),
        cheerio = require('cheerio'), // https://github.com/MatthewMueller/cheerio
        xpath = require('xpath'), // https://npmjs.org/package/xpath (npm install xpath)
        Dom = require('xmldom').DOMParser; // https://npmjs.org/package/xmldom (npm install xmldom)

    /**
    * @private
    * @constant
    */
    /**
    * @private
    * @constant
    */
    function write (res, code, responseHeaders, fileContents) {
        res.writeHead(code, responseHeaders);
        res.end(fileContents); //  + '\n'
    }

    function exitError (res, $h, err) {
        var errorMessage = $h.debug ? err : 'ERROR';
        write(res, 404, $h.responseHeaders, '<div style="color:red;font-weight:bold">' + errorMessage + '</div>');
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


    function performQuery (fileContents, req, res, $h) {
        
        fileContents = String(fileContents); // Necessary?
        var doc, xpath1Request, queryResult, $, css3RequestFull, css3Request, queryType, css3Attr,
            reqHeaders = req.headers,
            nodeArrayToSerializedArray = function (arr) {
                return arr.map(function (node) {
                    return node.toString();
                });
            },
            wrapFragment = function (frag) {
                if ($h.isHTML) { // || queryResult.length <= 1) { // No need to wrap for HTML or single result sets as no well-formedness requirements
                    return frag;
                }
                var tag = 'div xmlns="http://www.w3.org/1999/xhtml"';
                return '<' + tag + '>' + frag + '</' + tag.match(/^\w*/)[0] + '>';
            };

        if (($h.ignoreQuerySupport || $h.clientXPath1Support) && reqHeaders['query-request-xpath1'] && !reqHeaders['query-full-request']) {
            doc = new Dom().parseFromString(fileContents);
            xpath1Request = reqHeaders['query-request-xpath1'] && reqHeaders['query-request-xpath1'].trim(); // || '//b[position() > 1 and position() < 4]'; // || '//b/text()',
            queryResult = xpath.select(xpath1Request, doc);
            queryResult = $h.isJSON ? nodeArrayToSerializedArray(queryResult) : wrapFragment(nodeArrayToSerializedArray(queryResult).join(''));
        }
        else if (($h.ignoreQuerySupport || $h.clientCSS3Support) && reqHeaders['query-request-css3'] && !reqHeaders['query-full-request']) {
            // Support our own custom :text() and :attr(...) pseudo-classes (todo: do as (two-colon) pseudo-elements instead)
            $ = cheerio.load(fileContents);
            css3RequestFull = reqHeaders['query-request-css3'] && reqHeaders['query-request-css3'].trim().match(/(.*?)(?:\:(text|attr)\(([^\)]*)\))?$/); // Allow explicit "html" (toString) or "toArray" (or "json")?
            css3Request = css3RequestFull[1];
            queryType = css3RequestFull[2] || ($h.isJSON ? 'toArray' : 'toString');
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

        fileContents = $h.isJSON ? JSON.stringify(queryResult) : queryResult;
        
        write(res, 200, $h.responseHeaders, fileContents);
    }

    function setURL ($h, url) {
        $h.url = url;
        $h.isXHTML = url.match(/\.xhtml/);
        $h.isXML = url.match(/\.xml/);
        $h.isTEI = url.match(/\.tei/);
        $h.isHTML = !($h.isXHTML || $h.isXML || $h.isTEI);
        $h.resultContentType = ($h.isXHTML ? 'application/xhtml+xml' :
                                                $h.isXML ? 'application/xml' :
                                                    $h.isTEI ? 'application/tei+xml' : 'text/html');
    }

    /**
    * Due to the need for $h.resultContentType, this function must be called
    *  after setURL (or after setting $h.resultContentType)
    */
    function detectHeaders ($h, req) {
        if (!$h.resultContentType) {
            throw 'detectHeaders() must be invoked after the resultContentType is set, as through setURL()';
        }
        $h.isJSON = req.headers['query-format'] === 'json';
        $h.responseHeaders = {
            'Content-Type': $h.isJSON ? 'application/json' : $h.resultContentType
        };
        if ($h.isJSON) {
            $h.responseHeaders['query-content-type'] = $h.resultContentType;
        }
        $h.clientXPath1Support = clientSupportCheck(req, 'xpath1');
        $h.clientCSS3Support = clientSupportCheck(req, 'css3');    
    }

    function readFile (req, res, url, $h) {
        fs.readFile(url, function (err, fileContents) {
            if (err) {
                return exitError(res, $h, err);
            }
            
            performQuery(fileContents, req, res, $h);
            
        });
    }

    function handleRequestAndResponse (req, res, cb) {
        // todo: Do some work here
        var $h,
            newReq = {
                httpQuery: { // Namespace all of our custom methods and data
                   // DEFAULTS
                   ignoreQuerySupport: true,
                   debug: 0,
                   // API
                    setURL: function (url) {
                        setURL(newReq.httpQuery, url);
                    },
                    setStaticURL: function (url) {
                        url = url.slice(1) || 'index.html'; // Cut off initial slash
                        url = (url.slice(-1) === '/' ? url + 'index.html' : url).replace(/\?.*$/, '');
                        // url = require('url').parse(url).pathname; // Need to strip off request parameters?
                        this.setURL(url);
                    },
                    detectHeaders: function () {
                        detectHeaders(newReq.httpQuery, req);
                    },
                    readFile: function (url) { // Todo: Allow a parameter at all?
                        readFile(req, res, (url || $h.url), $h);
                    }
                }
            },
            // todo: Wrap http://nodejs.org/api/http.html#http_class_http_serverresponse (and http://nodejs.org/api/stream.html#stream_writable_stream )
            newRes = {
                end : function () {
                    var reqHeaders = req.headers;
                    if (reqHeaders['query-client-support'] && !reqHeaders['query-request-xpath1'] && !reqHeaders['query-request-css3'] && !reqHeaders['query-full-request']) {
                        $h.responseHeaders['query-server-support'] = 'xpath1 css3';
                        write(res, 200, $h.responseHeaders, ''); // Don't waste bandwidth if client supports protocol and hasn't asked us to deliver the full document
                        // Todo: we should allow delivery of a default payload (e.g., full doc if not specified as requesting empty for feature detection+immediate execution if supported)
                    }
                    else {
                        $h.responseHeaders['query-server-support'] = 'xpath1 css3';
                    }
                    
                    if (!$h.url[0].match(/\w/) || $h.url.match(/\.\./)) {
                        return exitError(res, $h, 'Disallowed character in file name');
                    }
                }
            };
        $h = newReq.httpQuery; // For convenience above
       
     
        cb(newReq, newRes);
    }


    return function (req, res, next) {
        var _end = res.end;
        res.end = function (data) {
            _end.call(res, txt + data);
        };
        next();
    };
};
