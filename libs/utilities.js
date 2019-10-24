'use strict';

var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function Utilities() {

    var __typeRegex = /\s([a-zA-Z]+)/;

    var __defaultMatcher = function (a, b) {
        return a === b;
    };

    function getType(entity) {
        if (entity === undefined) {
            return 'undefined';
        }

        return {}.toString.call(entity).match(__typeRegex)[1].toLowerCase();
    }

    function isString(entity) {
        return getType(entity) === 'string';
    }

    function isNumber(entity) {
        return getType(entity) === 'number' && !isNaN(entity);
    }

    function isNumeric(entity) {
        if (getType(entity) === 'number') {
            return true;
        }

        if (getType(entity) === 'string' && !isNaN(Number(entity))) {
            return true;
        }

        return false;
    }

    function isInteger(entity) {
        return isNumber(entity) && (entity % 1 === 0);
    }

    function isFunction(entity) {
        return getType(entity) === 'function';
    }

    function isBoolean(entity) {
        return getType(entity) === 'boolean';
    }

    function isObject(entity) {
        return getType(entity) === 'object';
    }

    function isRegex(entity) {
        return getType(entity) === 'regexp';
    }

    function arrayDelete(arr, value) {
        var index = arr.indexOf(value);
        if (index > -1) {
            arr.splice(index, 1);
        }
    }

    function isArray(entity, type, className) {
        if (getType(entity) !== 'array') {
            return false;
        } else {
            if (typeof type !== 'undefined') {
                if (!isString(type)) {
                    throw Whoopsie('INVALID_TYPE', '`type` must be a string');
                }

                if (type === 'class') {
                    if (!isString(className)) {
                        throw Whoopsie('INVALID_TYPE', '`className` must be a string');
                    }

                    for (var i = 0; i < entity.length; i++) {
                        if (typeof entity[i] !== 'object' || entity[i].__type__ !== className) {
                            return false;
                        }
                    }
                } else {
                    for (var j = 0; j < entity.length; j++) {
                        if (getType(entity[j]) !== type) {
                            return false;
                        }
                    }
                }
            }
        }

        return true;
    }

    function randomSplice(arr) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'array'
        }, arr);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        return arr.length ? arr.splice(Math.floor(Math.random() * arr.length), 1)[0] : null;
    }

    function shuffle(a) {
        var swap;
        var temp;
        var i;
        for (i = a.length - 1; i > 0; i--) {
            swap = Math.floor(Math.random() * (i + 1));
            temp = a[i];
            a[i] = a[swap];
            a[swap] = temp;
        }

        return a;
    }

    function deepCopy(entity) {
        //? if (DEBUG) {
        if (typeof entity === 'undefined') {
            throw Whoopsie('MISSING_ARGUMENT', '`entity` is required');
        }

        if (!isObject(entity) && !isArray(entity)) {
            throw Whoopsie('INVALID_TYPE', '`entity` must be an object or array');
        }
        //? }

        return JSON.parse(JSON.stringify(entity));
    }

    function mergeObjects() {
        var args = Array.prototype.slice.call(arguments);
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'array',
            items: {
                type: 'object'
            }
        }, args);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var mergedObject = {};

        for (var i = 0; i < args.length; i++) {
            for (var property in args[i]) {
                if (!args[i].hasOwnProperty(property)) {
                    continue;
                }

                mergedObject[property] = args[i][property];
            }
        }

        return mergedObject;
    }

    function mergeArrays() {
        var args = Array.prototype.slice.call(arguments);

        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'array',
            items: {
                type: 'array'
            }
        }, args);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var mergedArray = [];

        for (var i = 0; i < args.length; i++) {
            for (var j = 0; j < args[i].length; j++) {
                mergedArray.push(args[i][j]);
            }
        }

        return mergedArray;
    }

    function isEmpty(entity) {

        if (isString(entity)) {

            if (entity !== '') {
                return false;
            }
        } else if (isObject(entity)) {

            for (var key in entity) {
                if (!entity.hasOwnProperty(key)) {
                    continue;
                }

                return false;
            }
        } else if (isArray(entity)) {

            if (entity.length) {
                return false;
            }
        } else {
            throw Whoopsie('INVALID_TYPE', '`entity` must be either a string, object, or an array');
        }

        return true;
    }

    function isArraySubset(arr1, arr2, matcher) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                arr1: {
                    type: 'array'
                },
                arr2: {
                    type: 'array'
                },
                matcher: {
                    optional: true,
                    type: 'function'
                }
            }
        }, {
            arr1: arr1,
            arr2: arr2,
            matcher: matcher
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        if (typeof matcher === 'undefined') {
            matcher = __defaultMatcher;
        }

        for (var i = 0; i < arr1.length; i++) {
            var matched = false;

            for (var j = 0; j < arr2.length; j++) {
                matched = matcher(arr1[i], arr2[j]);

                if (matched) {
                    break;
                }
            }

            if (!matched) {
                return false;
            }
        }

        return true;
    }

    function tryCatchWrapper(fn, args, errorMessage, context) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                fn: {
                    type: 'function'
                },
                args: {
                    type: ['array', 'null'],
                    optional: true
                },
                errorMessage: {
                    type: 'string',
                    optional: true
                },
                context: {
                    type: 'any',
                    optional: true
                }
            }
        }, {
            fn: fn,
            args: args,
            errorMessage: errorMessage,
            context: context
        });
        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        args = args || [];
        context = context || null;
        errorMessage = errorMessage || 'Error occurred while calling function.';

        return function () {
            try {
                fn.apply(context, args);
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error(errorMessage);
                Scribe.error(ex.stack);
                //? }
            }
        };
    }

    function repeatString(inString, count) {
        var str = '' + inString;
        count = +count;
        if (count != count) {
            count = 0;
        }
        if (count < 0) {
            throw new RangeError('repeat count must be non-negative');
        }
        if (count == Infinity) {
            throw new RangeError('repeat count must be less than infinity');
        }
        count = Math.floor(count);
        if (str.length == 0 || count == 0) {
            return '';
        }

        if (str.length * count >= 1 << 28) {
            throw new RangeError('repeat count must not overflow maximum string size');
        }
        var rpt = '';
        for (var i = 0; i < count; i++) {
            rpt += str;
        }
        return rpt;
    }

    function padStart(inString, targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString || ' ');
        if (inString.length > targetLength) {
            return String(inString);
        } else {
            targetLength = targetLength - inString.length;
            if (targetLength > padString.length) {
                padString += repeatString(padString, targetLength / padString.length);
            }
            return padString.slice(0, targetLength) + String(inString);
        }
    }

    function padEnd(inString, targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString || ' ');
        if (inString.length > targetLength) {
            return String(inString);
        } else {
            targetLength = targetLength - inString.length;
            if (targetLength > padString.length) {
                padString += repeatString(padString, targetLength / padString.length);
            }
            return String(inString) + padString.slice(0, targetLength);
        }
    }

    function evalVariable(variableString, scope) {
        scope = scope || null;

        try {
            return eval.call(scope, variableString);
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error evaluating variable ' + variableString + ': ' + ex);
            //? }
        }

        return null;
    }

    function evalFunction(functionString, args, scope) {
        scope = scope || null;

        try {
            return eval.call(scope, functionString + '(' + args.join() + ')');
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error evaluating function ' + functionString + ': ' + ex);
            //? }
        }

        return null;
    }

    function appendToArray() {
        var args = Array.prototype.slice.call(arguments);

        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'array',
            minLength: 2,
            items: {
                type: 'array'
            }
        }, args);

        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var mainArr = args[0];

        for (var i = 1; i < args.length; i++) {
            Array.prototype.push.apply(mainArr, args[i]);
        }

        return mainArr;
    }

    function appendToObject() {
        var args = Array.prototype.slice.call(arguments);

        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'array',
            minLength: 2,
            items: {
                type: 'object'
            }
        }, args);

        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var mainObj = args[0];

        for (var i = 1; i < args.length; i++) {
            var obj = args[i];

            for (var key in obj) {
                if (!obj.hasOwnProperty(key)) {
                    continue;
                }

                mainObj[key] = obj[key];
            }
        }

        return mainObj;
    }

    return {

        //? if (DEBUG) {
        __type__: 'Utilities',
        //? }

        randomSplice: randomSplice,
        shuffle: shuffle,
        deepCopy: deepCopy,
        mergeObjects: mergeObjects,
        mergeArrays: mergeArrays,
        isArray: isArray,
        isEmpty: isEmpty,
        isInteger: isInteger,
        isString: isString,
        isNumeric: isNumeric,
        isRegex: isRegex,
        isNumber: isNumber,
        isBoolean: isBoolean,
        isFunction: isFunction,
        isObject: isObject,
        isArraySubset: isArraySubset,
        getType: getType,
        tryCatchWrapper: tryCatchWrapper,
        arrayDelete: arrayDelete,
        repeatString: repeatString,
        padStart: padStart,
        padEnd: padEnd,
        evalVariable: evalVariable,
        evalFunction: evalFunction,
        appendToArray: appendToArray,
        appendToObject: appendToObject
    };
}

module.exports = Utilities();
