// Todo: More middleware passing options besides jsonData; ensure can use
//         HTML or XML DOM with content-type accordingly
// Use JSDOM?

import {readFile} from 'fs/promises';
import {join} from 'path';
import * as cheerio from 'cheerio';
import xpath from 'xpath';
// import xmldom from 'xmldom';
import jsonata from 'jsonata';
import {JSDOM} from 'jsdom';

const {window: win} = new JSDOM();

const ignoreQuerySupport = true;

const write = (res, code, responseHeaders, fileContents) => {
  res.writeHead(code, responseHeaders);
  res.end(fileContents); // + '\n'
};

const clientSupportCheck = (req, str) => {
  return req.headers['query-client-support'] &&
    req.headers['query-client-support'].trim().split(
      /\s+/u
    ).includes(str);
};

const handleJsonata = async ({
  req, res, responseHeaders, fileContents, exitError, finish, next
}) => {
  const jsonataExpression = jsonata(
    req.headers['query-jsonata'].trim()
  );
  const bindings = req.headers['query-bindings']?.trim();
  try {
    const result = await jsonataExpression.evaluate(
      'jsonData' in req
        ? req.jsonData
        : JSON.parse(fileContents.toString('utf8')),
      bindings
        ? JSON.parse(bindings)
        : {}
    );
    const queryResult = JSON.stringify(result);
    finish(queryResult);
  } catch (error) {
    exitError(res, responseHeaders, error.message, next);
  }
};

const handleXpath1 = ({
  req, wrapFragment, fileContents, forceJSON
}) => {
  const nodeArrayToSerializedArray = (arr) => {
    return arr.map((node) => {
      if (node.nodeType === 2) {
        return ` ${node.name}="${node.value}"`;
      }
      return new win.XMLSerializer().serializeToString(
        node
      );
    });
  };
  const doc = new win.DOMParser().parseFromString(
    String(fileContents), 'text/xml'
  );
  const xpath1Request = req.headers['query-xpath1'] &&
    req.headers['query-xpath1'].trim();
    // || '//b[position() > 1 and position() < 4]'; // || '//b/text()',

  let queryResult;
  queryResult = xpath.select(xpath1Request, doc);
  queryResult = forceJSON
    ? nodeArrayToSerializedArray(queryResult)
    : wrapFragment(nodeArrayToSerializedArray(queryResult).join(''));

  return queryResult;
};

const handleCSS3 = ({req, fileContents, forceJSON, wrapFragment}) => {
  // Support our own custom :text() and :attr(...) pseudo-classes (todo: do
  //  as (two-colon) pseudo-elements instead)
  const $ = cheerio.load(String(fileContents));
  const [
    ,
    css3Request,
    type = forceJSON ? 'toArray' : 'toString',
    css3Attr
  ] = (req.headers['query-css3'] && req.headers['query-css3'].trim().match(
    /(.*?)(?::(text|attr)\(([^)]*)\))?$/u
  )) || []; // Allow explicit "html" (toString) or "toArray" (or "json")?

  const nodeArrayToSerializedArray = (items) => {
    return [...items].map((elem) => {
      return $.html(elem);
    });
  };

  let queryResult;
  switch (type) {
  case 'attr':
    // Only gets one attribute anyways, so no need to handle differently for
    //   JSON (except the stringify below)
    queryResult = $(css3Request).attr(css3Attr);
    break;
  case 'toArray':
    // $(css3Request).toString(); handles merging
    queryResult = nodeArrayToSerializedArray($(css3Request));
    break;
    // Todo: Change 'text' to return array of text nodes in case of JSON?
  case 'text':
    queryResult = $(css3Request)[type]();
    break;
  case 'toString':
  default:
    // Don't merge with next line as intermediate queryResult may be needed
    //  by `wrapFragment`
    queryResult = $(css3Request);
    // $(css3Request).toString(); handles merging
    queryResult = wrapFragment(
      nodeArrayToSerializedArray(queryResult).join('')
    );
    break;
  }

  return queryResult;
};

/**
 * @param {PlainObject} [cfg]
 * @returns {void}
 */
function getHttpQuery (cfg = {}) {
  const cwd = cfg.cwd ?? process.cwd();
  const path = cfg.path ?? '';
  const debug = cfg.debug ?? false;
  const {directory, passthroughErrors} = cfg;

  const exitError = (res, responseHeaders, err, next) => {
    if (passthroughErrors) {
      if (next) {
        next(err);
        return;
      }
      return;
    }
    const errorMessage = debug ? err : 'ERROR';
    write(
      res, 404, responseHeaders,
      `<div style="color:red;font-weight:bold">${errorMessage}</div>`
    );
  };

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
    const clientXPath1Support = clientSupportCheck(req, 'xpath1');
    const clientCSS3Support = clientSupportCheck(req, 'css3');
    const clientJSONPathSupport = clientSupportCheck(req, 'jsonpath');
    const isXHTML = url.match(/\.xhtml(\?.*)$/u);
    const isXML = url.match(/\.xml$/u);
    const isTEI = url.match(/\.tei$/u);
    const isJSON = url.match(/\.json$/u);
    const isJS = url.match(/\.js$/u);
    const isCSS = url.match(/\.css$/u);
    const isHTML = !(isXHTML || isXML || isTEI);
    const forceJSON = req.headers['query-format'] === 'json';

    const resultContentType = isXHTML
      ? 'application/xhtml+xml'
      : isXML
        ? 'application/xml'
        : isTEI
          ? 'application/tei+xml'
          : isJS
            ? 'text/javascript'
            : isCSS
              ? 'text/css'
              : 'text/html';

    const responseHeaders = {
      'Content-Type': isJSON || forceJSON
        ? 'application/json'
        : resultContentType
    };

    url = url.replace(/(\/|\/\?.*)$/u, '/index.html').replace(/\?.*$/u, '') ||
      'index.html';

    // Need to strip off request parameters?
    // url = require('url').parse(url).pathname;
    // console.log('url:'+url);

    if (forceJSON) {
      responseHeaders['query-content-type'] = resultContentType;
    }

    if (
      req.headers['query-client-support'] && !req.headers['query-xpath1'] &&
      !req.headers['query-css3'] && !req.headers['query-full-request']
    ) {
      responseHeaders['query-server-support'] = 'xpath1, css3, jsonata';
      // Don't waste bandwidth if client supports protocol and hasn't asked
      //   us to deliver the full document
      write(res, 200, responseHeaders, '');
      // Todo: we should allow delivery of a default payload (e.g., full
      //  doc if not specified as requesting empty for feature detection +
      //  immediate execution if supported)
    } else {
      responseHeaders['query-server-support'] = 'xpath1, css3, jsonata';
    }

    if (!(/\w/u).test(url[0]) || (/\.\./u).test(url)) {
      exitError(
        res,
        responseHeaders,
        'Disallowed or missing character in file name',
        next
      );
      return;
    }

    let fileContents;

    if (!('jsonData' in req)) {
      try {
        const directoryFile = join(path, url);
        if (directory && !directoryFile.startsWith(directory)) {
          if (next) {
            next();
            return;
          }
          return;
        }
        fileContents = await readFile(join(cwd, directoryFile));
      } catch (err) {
        exitError(res, responseHeaders, err.message, next);
        return;
      }
    }

    const wrapFragment = (frag) => {
      if (isHTML) {
        // No need to wrap for HTML or single result sets as no
        //   well-formedness requirements
        // || queryResult.length <= 1) {
        return frag;
      }
      const tag = 'div xmlns="http://www.w3.org/1999/xhtml"';
      return `<${tag}>${frag}</${
        tag.match(/^\w*/u)[0]
      }>`;
    };

    const finish = (queryResult) => {
      fileContents = forceJSON ? JSON.stringify(queryResult) : queryResult;

      write(res, 200, responseHeaders, fileContents);

      if (next) {
        // eslint-disable-next-line n/callback-return -- Not that type
        next();
      }
    };

    let queryResult;
    if (
      (ignoreQuerySupport || clientJSONPathSupport) &&
        req.headers['query-jsonata'] && !req.headers['query-full-request']
    ) {
      await handleJsonata({
        req, res, responseHeaders, fileContents, exitError, finish, next
      });
      return;
    }

    if (
      // XPATH 1
      (ignoreQuerySupport || clientXPath1Support) &&
        req.headers['query-xpath1'] && !req.headers['query-full-request']
    ) {
      queryResult = handleXpath1({
        req, wrapFragment, fileContents, forceJSON
      });
    } else if (
      // CSS3
      (ignoreQuerySupport || clientCSS3Support) &&
        req.headers['query-css3'] && !req.headers['query-full-request']
    ) {
      queryResult = handleCSS3({
        req, fileContents, forceJSON, wrapFragment
      });
    } else {
      // Text
      queryResult = fileContents.toString('utf8');
    }

    finish(queryResult);
  };
}

export default getHttpQuery;
