(function () {

'use strict';

// Dependency: Array.reduce, Array.isArray()

function preg_quote (str) {
  // http://phpjs.org/functions/preg_quote/
  return str.replace(/[.\\+*?\[\^\]$(){}=!<>|:\-]/g, '\\$&');
}

function _processValues (property, object) {
    var pattern, patternRegex, flags = '', match;
    if (!object) {
        throw 'Unexpected empty value provided for _processValues using property: ' + property;
    }
    if (typeof object === 'string') { // a string reference or, if not so-named, a literal
        pattern = this.allowStringProperties && this.mixedParseRules[object] ? _processValues(object, this.mixedParseRules[object]) : preg_quote(object);
    }
    else if (object.exec) { // regular expressions
        pattern = object.source;
        flags = object.ignoreCase ? 'i' : '';
//        this.mixedParseRules[i] = object;
    }
    else if (Array.isArray(object)) { // an array representing a sequence of any of such other values here
//        this.mixedParseRules[i] = object;
        //tempObj = this.mixedParseRules['$sequence' + i] = {};
        // object.forEach(_processArgs, tempObj);
        object.reduce(function (prev, item) {
            return prev + _processValues(item, this.mixedParseRules[item]);
        }, '');
    }
    else { // a compiled object whose arguments can include any of these other values here
//        this.mixedParseRules[i] = object;
alert(property+JSON.stringify(object)); // {"baseObj":{"0":{"0":"attribute","1":"LWSP","2":"=","3":"LWSP","4":"value"},"modifiers":{}}}
    }
    
    if (typeof pattern === 'string') { // To get case-insensitive matching via a flag, will need to use a RegExp object instead
        pattern = pattern.indexOf('^') === -1 ? '^' + pattern : pattern; // Ensure we match from start only
        patternRegex = new RegExp(pattern, flags);
    }
    try {
    match = patternRegex.exec(this.s);
    }catch(e) {alert(JSON.stringify(object)); throw e;}
    
    if (match) {
        this.i += match.length;
        this.s = this.s.slice(match.length);
        this.callbackObj[property](match, this.i);
    }
    else if (this.errorObj) {
        this.errorObj.notMatched(this.s, pattern);
    }
    return pattern;
}


function _mixin (targetObj, sourceObj) {
    var p, srcObjProp;
    for (p in sourceObj) {
        //if (sourceObj.hasOwnProperty(p)) {
            srcObjProp = sourceObj[p];
            if (srcObjProp && typeof srcObjProp === 'object') {
                targetObj[p] = _mixin(targetObj[p] || {}, srcObjProp);
            }
            else {
                targetObj[p] = sourceObj[p];
            }
        //}
    }
//    alert(JSON.stringify(targetObj));
    return targetObj;
}

function Parser () {
    /*
    Object contains:
    a) regular expressions
    b) a string reference or, if not so-named, a literal
    c) a compiled object whose arguments can include any of these other values here in a-d
    d) an array representing a sequence of any of such values here in a-d
    */
    this.mixedParseRules = Array.prototype.slice.call(arguments).reduce(function (targetObj, sourceObj) {
        return _mixin(targetObj, sourceObj);
    }, {});
}
Parser.prototype.parse = function (str, startProperty, callbackObj, errorObj, options) {
    this.callbackObj = callbackObj;
    this.errorObj = errorObj;
    this.originalStr = str;
    this.s = str;
    this.i = 0;
    this.allowStringProperties = options ? options.allowStringProperties : true; // To avoid potential conflicts between property names and string literals (encapsulate within $() instead)
    _processValues.call(this, startProperty, this.mixedParseRules[startProperty]);
};


function _processArgs (item, i) {
    var tempObj;
    if (!item) {
        throw 'Unexpected empty value provided for _processArgs';
    }
    if (typeof item === 'string') { // a string reference or, if not so-named, a literal
        this.baseObj[i] = item;
    }
    else if (typeof item.exec) { // regular expressions
        this.baseObj[i] = item;        
    }
    else if (Array.isArray(item)) { // an array representing a sequence of any of such other values here
        this.baseObj[i] = item;
        //tempObj = this.baseObj['$sequence' + i] = {};
        // item.forEach(_processArgs, tempObj);
    }
    else { // a compiled object whose arguments can include any of these other values here
        this.baseObj[i] = item;
    }
}


function _processModifiers () {

}

/*
Compiler
*/
function $ () {
    return new $.init(Array.prototype.slice.call(arguments));
}
$.init = function (args) {
    this.baseObj = args;
    this.baseObj.modifiers = [];
};
$.init.prototype = {
    compile: function () {
        this.baseObj.forEach(_processArgs, this);
        this.baseObj.modifiers.forEach(_processModifiers, this);
        return this;
    },
    zeroOrMore: function () {
        this.baseObj.modifiers.push('*');
        return this;
    },
    zeroOrOne: function () {
        this.baseObj.modifiers.push('?');
        return this;
    },
    range: function (min, max) {
        this.baseObj.modifiers.push('{' + min + (max ? ',' + max : ',') + '}');
        return this;
    },
    exactly: function (val) {
        this.baseObj.modifiers.push('{' + val + '}');
        return this;
    },
    oneOrMore: function () {
        this.baseObj.modifiers.push('+');
        return this;
    },
    except: function () {
        this.baseObj.modifiers.push('except');
        return this;
    },
    including: function () {
        this.baseObj.modifiers.push('including');
        return this;
    }
};

// EXPORTS
window.$ = $;
window.Parser = Parser;

}());
