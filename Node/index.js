// Todo: Make this integratable into a pipeline; ensure can use HTML or XML DOM with content-type accordingly
// Use JSDOM or http://zombie.labnotes.org/ ?

import {readFile} from 'fs/promises';
import {join} from 'path';
import cheerio from 'cheerio';
import xpath from 'xpath';
import xmldom from 'xmldom';
import * as JSONPath from 'jsonpath-plus';

const debug = 1,
  ignoreQuerySupport = true,
  Dom = xmldom.DOMParser, // https://npmjs.org/package/xmldom (npm install xmldom)
  write = (res, code, responseHeaders, fileContents) => {
    res.writeHead(code, responseHeaders);
    res.end(fileContents); //  + '\n'
  },
  exitError = (res, responseHeaders, err) => {
    const errorMessage = debug ? err : 'ERROR';
    write(res, 404, responseHeaders, '<div style="color:red;font-weight:bold">' + errorMessage + '</div>');
  },
  clientSupportCheck = (req, str) => {
    return req.headers['query-client-support'] &&
            req.headers['query-client-support'].trim().split(/\s+/u).includes(str);
  };

/**
 * @param {string} [cwd=process.cwd()]
 * @returns {void}
 */
function getHttpQuery (cwd = process.cwd()) {
  /**
   * @callback MiddlewareCallback
   * @returns {void}
   */

  /**
   * @param {Request} req
   * @param {Response} res
   * @param {MiddlewareCallback} next
   * @returns {void}
   */
  return async function httpquery (req, res, next) {
    let url = req.url.slice(1) || 'index.html'; // Cut off initial slash
    const
      clientXPath1Support = clientSupportCheck(req, 'xpath1'),
      clientCSS3Support = clientSupportCheck(req, 'css3'),
      clientJSONPathSupport = clientSupportCheck(req, 'jsonpath'),
      isXHTML = url.match(/\.xhtml/u),
      isXML = url.match(/\.xml/u),
      isTEI = url.match(/\.tei/u),
      isJSON = url.match(/\.json/u),
      isHTML = !(isXHTML || isXML || isTEI),
      forceJSON = req.headers['query-format'] === 'json',
      resultContentType = (isXHTML
        ? 'application/xhtml+xml'
        : isXML
          ? 'application/xml'
          : isTEI ? 'application/tei+xml' : 'text/html'),
      responseHeaders = {
        'Content-Type': isJSON || forceJSON ? 'application/json' : resultContentType
      };
    url = (url.slice(-1) === '/' ? url + 'index.html' : url).replace(/\?.*$/u, '');
    // url = require('url').parse(url).pathname; // Need to strip off request parameters?
    // console.log('url:'+url);
    if (isJSON || forceJSON) {
      responseHeaders['query-content-type'] = resultContentType;
    }

    if (req.headers['query-client-support'] && !req.headers['query-request-xpath1'] && !req.headers['query-request-css3'] && !req.headers['query-full-request']) {
      responseHeaders['query-server-support'] = 'xpath1 css3';
      write(res, 200, responseHeaders, ''); // Don't waste bandwidth if client supports protocol and hasn't asked us to deliver the full document
      // Todo: we should allow delivery of a default payload (e.g., full doc if not specified as requesting empty for feature detection+immediate execution if supported)
    } else {
      responseHeaders['query-server-support'] = 'xpath1 css3';
    }

    if (!(/\w/u).test(url[0]) || (/\.\./u).test(url)) {
      exitError(res, responseHeaders, 'Disallowed character in file name');
      return;
    }

    let fileContents;
    try {
      fileContents = await readFile(join(cwd, './Node/', url));
    } catch (err) {
      exitError(res, responseHeaders, err);
      return;
    }

    const wrapFragment = (frag) => {
      if (isHTML) { // || queryResult.length <= 1) { // No need to wrap for HTML or single result sets as no well-formedness requirements
        return frag;
      }
      const tag = 'div xmlns="http://www.w3.org/1999/xhtml"';
      return '<' + tag + '>' + frag + '</' + tag.match(/^\w*/u)[0] + '>';
    };

    let queryResult;
    if ((ignoreQuerySupport || clientJSONPathSupport) && req.headers['query-request-jsonpath'] && !req.headers['query-full-request']) {
      queryResult = JSON.stringify(JSONPath.JSONPath({
        json: JSON.parse(fileContents.toString('utf8')),
        path: req.headers['query-request-jsonpath'].trim()
      }));
    } else if ((ignoreQuerySupport || clientXPath1Support) && req.headers['query-request-xpath1'] && !req.headers['query-full-request']) {
      const nodeArrayToSerializedArray = (arr) => {
        return arr.map((node) => {
          return node.toString();
        });
      };
      const doc = new Dom().parseFromString(String(fileContents));
      const xpath1Request = req.headers['query-request-xpath1'] && req.headers['query-request-xpath1'].trim(); // || '//b[position() > 1 and position() < 4]'; // || '//b/text()',
      queryResult = xpath.select(xpath1Request, doc);
      queryResult = forceJSON ? nodeArrayToSerializedArray(queryResult) : wrapFragment(nodeArrayToSerializedArray(queryResult).join(''));
    } else if ((ignoreQuerySupport || clientCSS3Support) && req.headers['query-request-css3'] && !req.headers['query-full-request']) {
      // Support our own custom :text() and :attr(...) pseudo-classes (todo: do as (two-colon) pseudo-elements instead)
      const $ = cheerio.load(String(fileContents));
      // eslint-disable-next-line unicorn/no-unsafe-regex -- Todo
      const css3RequestFull = req.headers['query-request-css3'] && req.headers['query-request-css3'].trim().match(/(.*?)(?::(text|attr)\(([^)]*)\))?$/u); // Allow explicit "html" (toString) or "toArray" (or "json")?
      const css3Request = css3RequestFull[1];
      const type = css3RequestFull[2] || (forceJSON ? 'toArray' : 'toString');
      const css3Attr = css3RequestFull[3];

      const nodeArrayToSerializedArray = (items) => {
        /* return arr.map((node) => {
            return node; //.html();
        }); */
        return [...items.map((i, elem) => {
          return $.html(elem);
        })];
      };

      switch (type) {
      case 'attr': // Only gets one attribute anyways, so no need to handle differently for JSON (except the stringify below)
        queryResult = $(css3Request).attr(css3Attr);
        break;
      case 'toArray':
        queryResult = nodeArrayToSerializedArray($(css3Request)); // $(css3Request).toString(); handles merging
        break;
        // Todo: Change 'text' to return array of text nodes in case of JSON?
      case 'text':
        queryResult = $(css3Request)[type]();
        break;
      case 'toString':
      default:
        queryResult = $(css3Request); // Don't merge with next line as intermediate queryResult may be needed by wrapFragment
        queryResult = wrapFragment(nodeArrayToSerializedArray(queryResult).join('')); // $(css3Request).toString(); handles merging
        break;
      }
    } else {
      queryResult = fileContents.toString('utf8');
    }

    fileContents = forceJSON ? JSON.stringify(queryResult) : queryResult;

    write(res, 200, responseHeaders, fileContents);

    if (next) {
      // eslint-disable-next-line node/callback-return -- Not that type
      next();
    }
  };
}

export default getHttpQuery;
