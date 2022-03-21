(function () {
'use strict';

// Dependency: Array.reduce, Array.isArray()

/**
 *
 * @param str
 */
function preg_quote (str) {
  // http://phpjs.org/functions/preg_quote/
  return str.replace(/[.\\+*?[^\]$(){}=!<>|:\-]/g, '\\$&');
}

/**
 *
 * @param obj
 */
function isRegExp (obj) {
  return obj && typeof obj.exec === 'function';
}

/**
 *
 * @param property
 * @param object
 * @param isAggregate
 * @param isAlias
 */
function _processValues (property, object, isAggregate, isAlias) {
  let isAnArray, iTmp, sTmp, errorHandled, pattern, patternRegex, flags = '', match, that = this,
    useStringProperty = !object && this.allowStringProperties, hasAlias = false;
  isAggregate = !(isAggregate === false);
  isAlias = isAlias || false;

  if (useStringProperty) {
    object = property;
  } else if (!object) {
    throw 'Unexpected empty value provided for _processValues using property: ' + property;
  }
  isAnArray = Array.isArray(object);
  if (typeof object === 'string') { // a string reference or, if not so-named, a literal
    if (this.allowStringProperties && this.mixedParseRules[object]) {
      hasAlias = true;
      // Note: match is not really the object, but we give a means of indicating the string
      if (this.loggingCb) { // There is a "match", and not an error, so only need to call logging and callback
        this.loggingCb(property, object, this.i, isAggregate, useStringProperty, hasAlias, isAlias);
      }
      if (this.callbackObj && this.callbackObj[property]) {
        this.callbackObj[property](object, this.i, isAggregate, useStringProperty, hasAlias, isAlias);
      }
      return _processValues.call(this, object, this.mixedParseRules[object], isAggregate, hasAlias);
    }
    pattern = preg_quote(object);
  } else if (isRegExp(object)) { // regular expressions
    pattern = object.source;
    flags = object.ignoreCase ? 'i' : '';
    //        this.mixedParseRules[i] = object;
  } else if (isAnArray) { // an array representing a sequence of any of such other values here
    //        this.mixedParseRules[i] = object;
    // tempObj = this.mixedParseRules['$sequence' + i] = {};
    // object.forEach(_processArgs, tempObj);
    iTmp = this.i;
    sTmp = this.s;
    pattern = object.reduce(function (prev, item, i) {
      let next = _processValues.call(that, item, that.mixedParseRules[item], false);
      if (i > 0) {
        next = next.replace(/\^/, '');
      }
      return prev + next;
    }, '');
    // Todo: Reset back if not matched (and handling errors, thus allowing the code to reach the end of the array here)?
    // If so, would need 2 more temporary variables here before setting this.i and this.s (for use after errorHandled)
    this.i = iTmp;
    this.s = sTmp;
  }
  /*    else if (object.compile) { // Transparently pass on arguments, as immaterial whether created by $() convenience or manually created
        return _processValues.call(this, property, object.compile(), isAggregate, isAlias);
    } */
  else if (object.source) {
    pattern = object.source;
    flags = object.flags;
  } else { // a compiled object whose arguments can include any of these other values here (including OR'd conditions)
    //        this.mixedParseRules[i] = object;

    // return _processValues.call(this, property, object.baseObj[0]);
    // Todo: fix
    // Todo: add hasAggregateParents too?
    alert(property + JSON.stringify(object));

    pattern = object.or.reduce(function (prev, item) {

    });
    flags = object.modifiers.join(''); // Todo: handle except, including
    /*
e.g.,
parameter{"or":[
    ["attribute","LWSP","=","LWSP","value"],
    {"or":["abc"],"modifiers":[]},
    {"source":"abc","flags":"i"}
],"modifiers":[]}
*/
  }
  if (typeof pattern === 'string') { // To get case-insensitive matching via a flag, will need to use a RegExp object instead
    pattern = !pattern.includes('^') ? '^' + pattern : pattern; // Ensure we match from start only
    patternRegex = new RegExp(pattern, flags);
  }
  try {
    match = patternRegex.exec(this.s);
  } catch (e) {
    alert(object);
    throw e;
  }

  if (match) {
    this.i += match[0].length;
    this.s = this.s.slice(match[0].length);
    if (this.loggingCb) {
      this.loggingCb(property, match[0], this.i, isAggregate, useStringProperty, hasAlias, isAlias);
    }
    if (this.callbackObj && this.callbackObj[property]) {
      this.callbackObj[property](match[0], this.i, isAggregate, useStringProperty, hasAlias, isAlias);
    }
    // Only runs if not matched
    else if (this.unmatchedCb) {
      this.unmatchedCb(property, match[0], this.i, isAggregate, useStringProperty);
    }
  } else {
    if (this.errorObj) {
      errorHandled = this.errorObj.notMatched(this.s, pattern, isAggregate, useStringProperty);
    }
    if (!errorHandled) {
      throw 'Error not handled for property ' + property + // ' and object ' + object +
            ' with mismatch of pattern ' + pattern + ' (isAlias: ' + isAlias + ', hasAlias: false, isAggregate: ' + isAggregate + ', useStringProperty: ' + useStringProperty + ') at index ' + this.i + ' and string: ' + this.s;
    }
  }
  return pattern;
}

/**
* @param {PlainObject} targetObj Object onto which to copy properties
* @param {PlainObject} sourceObj Object from which to copy properties
* @param {boolean} [deep] Defaults to true
*/
function _mixin (targetObj, sourceObj, deep) {
  let p, srcObjProp;
  deep = !(deep === false);
  for (p in sourceObj) {
    if (deep || sourceObj.hasOwnProperty(p)) {
      srcObjProp = sourceObj[p];
      if (srcObjProp && typeof srcObjProp === 'object') {
        if (isRegExp(srcObjProp)) {
          targetObj[p] = new RegExp(srcObjProp.source,
            (srcObjProp.global ? 'g' : '') +
                        (srcObjProp.ignoreCase ? 'i' : '') +
                        (srcObjProp.multiline ? 'm' : '') +
                        (srcObjProp.sticky ? 'y' : '') // non-standard
          );
          // We avoid copying deprecated properties
          targetObj[p].lastIndex = srcObjProp.lastIndex; // Settable and works
        } else {
          targetObj[p] = _mixin(targetObj[p] || (Array.isArray(srcObjProp) ? [] : {}), srcObjProp);
        }
      } else {
        targetObj[p] = sourceObj[p];
      }
    }
  }
  return targetObj;
}

/**
 *
 * @param obj
 */
function a (obj) {
  alert(JSON.stringify(obj));
}

/**
 *
 */
function Parser () {
  /*
    Object contains:
    a) regular expressions
    b) a string reference or, if not so-named, a literal
    c) a compiled object whose arguments can include any of these other values here in a-d
    d) an array representing a sequence of any of such values here in a-d
    */
  // alert(Array.prototype.slice.call(arguments)[0].LWSP);
  this.mixedParseRules = Array.prototype.slice.call(arguments).reduce(function (targetObj, sourceObj) {
    return _mixin(targetObj, sourceObj);
  }, {});
}
Parser.prototype.parse = function (str, startProperty, callbackObj, errorObj, unmatchedCb, loggingCb, options) {
  this.callbackObj = callbackObj;
  this.errorObj = errorObj;
  this.unmatchedCb = unmatchedCb;
  this.loggingCb = loggingCb;
  this.originalStr = str;
  this.s = str;
  this.i = 0;
  this.startProperty = startProperty;
  this.allowStringProperties = options ? options.allowStringProperties : true; // To avoid potential conflicts between property names and string literals (encapsulate within $() instead)
  _processValues.call(this, startProperty, this.mixedParseRules[startProperty]);
};

/**
 *
 * @param item
 * @param i
 */
function _processArgs (item, i) {
  let tempObj;
  if (!item) {
    throw 'Unexpected empty value provided for _processArgs';
  }
  if (typeof item === 'string') { // a string reference or, if not so-named, a literal
    this.baseObj[i] = item;
  } else if (isRegExp(item)) { // regular expressions
    this.baseObj[i] = item;
  } else if (Array.isArray(item)) { // an array representing a sequence of any of such other values here
    this.baseObj[i] = item;
    // tempObj = this.baseObj['$sequence' + i] = {};
    // item.forEach(_processArgs, tempObj);
  } else { // a compiled object whose arguments can include any of these other values here
    this.baseObj[i] = item;
  }
}

/**
 *
 */
function _processModifiers () {

}

/*
Compiler
*/
/**
 *
 */
function $ () {
  return new $.init(Array.prototype.slice.call(arguments));
}
$.init = function (args) {
  this.or = args.map(function (arg) {
    let obj;
    if (isRegExp(arg)) { // Handle regular expressions so JSON.stringify can serialize them properly
      obj = {};
      obj.source = arg.source;
      obj.flags = arg.ignoreCase ? 'i' : '';
      return obj;
    }
    return arg;
  });
  this.modifiers = [];
};
$.init.prototype = {
  compile () { // Not needed? (Nor is toJSON())
    // this.baseObj.or.forEach(_processArgs, this);
    // this.baseObj.modifiers.forEach(_processModifiers, this);
    return this;
  },
  zeroOrMore () {
    this.modifiers.push('*');
    return this;
  },
  zeroOrOne () {
    this.modifiers.push('?');
    return this;
  },
  range (min, max) {
    this.modifiers.push('{' + min + (max ? ',' + max : ',') + '}');
    return this;
  },
  exactly (val) {
    this.modifiers.push('{' + val + '}');
    return this;
  },
  oneOrMore () {
    this.modifiers.push('+');
    return this;
  },
  except () {
    this.modifiers.push('except');
    return this;
  },
  including () {
    this.modifiers.push('including');
    return this;
  }
};

// EXPORTS
window.$ = $;
window.Parser = Parser;
}());
