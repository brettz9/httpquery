/*globals require*/
// Todo: Make this integratable into a pipeline; ensure can use HTML or XML DOM with content-type accordingly
// Use JSDOM or http://zombie.labnotes.org/ ?
(function () {

'use strict';
var debug = 1,
    http = require('http'),
    fs = require('fs'),
    cheerio = require('cheerio'), // https://github.com/MatthewMueller/cheerio
    xpath = require('xpath'), // https://npmjs.org/package/xpath (npm install xpath)
    Dom = require('xmldom').DOMParser, // https://npmjs.org/package/xmldom (npm install xmldom)
    write = function (res, code, responseHeaders, fileContents) {
        res.writeHead(code, responseHeaders);
        res.end(fileContents); //  + '\n'
    },
    exitError = function (res, responseHeaders, err) {
        var errorMessage = debug ? err : 'ERROR';
        write(res, 404, responseHeaders, '<div style="color:red;font-weight:bold">' + errorMessage + '</div>');
    },
    clientSupportCheck = function (req, str) {
        return req.headers['query-client-support'] &&
            req.headers['query-client-support'].trim().split(/\s+/).indexOf(str) > -1;
    };    
    
http.createServer(function (req, res) {
    var url = req.url.slice(1) || 'index.html', // Cut off initial slash
        clientXPath1Support = clientSupportCheck(req, 'xpath1'),
        clientCSS3Support = clientSupportCheck(req, 'css3'),
        isXHTML = url.match(/\.xhtml/),
        isXML = url.match(/\.xml/),
        isTEI = url.match(/\.tei/),
        isHTML = !(isXHTML || isXML || isTEI), // Use this later if responding to XML vs. HTML differently
        isJSON = req.headers['query-format'] === 'json',
        resultContentType = (isXHTML ? 'application/xhtml+xml' :
                                    isXML ? 'application/xml' :
                                        isTEI ? 'application/tei+xml' : 'text/html'),
        responseHeaders = {
            'Content-Type': isJSON ? 'application/json' : resultContentType
        };
    url = (url.slice(-1) === '/' ? url + 'index.html' : url).replace(/\?.*$/, '');
    // url = require('url').parse(url).pathname; // Need to strip off request parameters?
//console.log('url:'+url);
    if (isJSON) {
        responseHeaders['query-content-type'] = resultContentType;
    }
    
    if (req.headers['query-client-support'] && !req.headers['query-xpath1-request'] && !req.headers['query-css3-request'] && !req.headers['query-full-request']) {
        responseHeaders['query-server-support'] = 'xpath1 css3';
        write(res, 200, responseHeaders, ''); // Don't waste bandwidth if client supports protocol and hasn't asked us to deliver the full document
        // Todo: we should allow delivery of a default payload (e.g., full doc if not specified as requesting empty for feature detection+immediate execution if supported)
    }
    else {
        responseHeaders['query-server-support'] = 'xpath1 css3';
    }
    
    if (!url[0].match(/\w/) || url.match(/\.\./)) {
        return exitError(res, responseHeaders, 'Disallowed character in file name');
    }
    
    fs.readFile(url, function (err, fileContents) {
        if (err) {
            return exitError(res, responseHeaders, err);
        }
        var doc, xpath1Request, queryResult, $, css3RequestFull, css3Request, type, css3Attr,
            nodeArrayToHTMLArray = function (arr) {
                return arr.map(function (node) {
                    return node.toString();
                });
            };
        if (clientXPath1Support && req.headers['query-xpath1-request'] && !req.headers['query-full-request']) {
            doc = new Dom().parseFromString(String(fileContents));
            xpath1Request = req.headers['query-xpath1-request'] && req.headers['query-xpath1-request'].trim(); // || '//b[position() > 1 and position() < 4]'; // || '//b/text()',
            queryResult = xpath.select(xpath1Request, doc);
            queryResult = isJSON ? nodeArrayToHTMLArray(queryResult) : nodeArrayToHTMLArray(queryResult).join('');
        }
        else if (clientCSS3Support && req.headers['query-css3-request'] && !req.headers['query-full-request']) {
            // Support our own custom :text() and :attr(...) pseudo-classes (todo: do as (two-colon) pseudo-elements instead)
            $ = cheerio.load(String(fileContents));
            css3RequestFull = req.headers['query-css3-request'] && req.headers['query-css3-request'].trim().match(/(.*?)(?:\:(text|attr)\(([^\)]*)\))?$/); // Allow explicit "html" (toString) or "toArray" (or "json")?
            css3Request = css3RequestFull[1];
            type = css3RequestFull[2] || (isJSON ? 'toArray' : 'toString');
            css3Attr = css3RequestFull[3];

            nodeArrayToHTMLArray = function (items) {
                /*return arr.map(function (node) {
                    return node; //.html();
                });*/
                return items.map(function (i, elem) {
                     return $(this).toString();
                });
            };
            
            switch (type) {
                case 'attr': // Only gets one attribute anyways, so no need to handle differently for JSON (except the stringify below)
                    queryResult = $(css3Request).attr(css3Attr);
                    break;
                case 'toArray':
                    queryResult = nodeArrayToHTMLArray($(css3Request)); // $(css3Request).toString(); handles merging
                    break;
                // Todo: Change 'text' to return array of text nodes in case of JSON?
                case 'text': case 'toString':
                    queryResult = $(css3Request)[type]();
                    break;
            }
        }

        fileContents = isJSON ? JSON.stringify(queryResult) : queryResult;
        
        write(res, 200, responseHeaders, fileContents);
    });
 
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');

}());