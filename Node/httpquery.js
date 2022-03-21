import http from 'htteepee';

// exports.staticFiles = require('./httpquery-static');
// exports.dynamicFiles = require('./httpquery-dynamic');

const optionMap = {
  // 'url': './urlToStaticFile-middleware',
  setContentTypeFromURL: '',
  writeFileContentsFromURL: '', // https://github.com/creationix/creationix/blob/master/static.js
  setContentTypeFromFileContents: '', // in end()
  httpquery: ''
};

/**
 *
 * @param {...any} args
 */
function httpquery (...args) {
  // sequence of option objects or strings: 'moduleName', {option: moduleName2, config1:xxx, config2:yyy}
  const mws = args.map(function (arg) {
    return typeof arg === 'string'
      ? require('./' + {
      }[arr.concat(arg).pop()])
      : require('httpquery-middleware')('Hello '); // Todo: We might cause this staticFiles to require invocation, e.g., to pass some config
  });
  return http.createMiddlewareServer(mws);
}

export default httpquery;
