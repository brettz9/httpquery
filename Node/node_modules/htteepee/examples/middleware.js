/*globals module*/
module.exports = function (prefix) {
    'use strict';
    return function (req, res, next) {
        var _end = res.end;
        res.end = function (data) {
            _end.call(res, prefix + data);
        };
        next();
    };
};