'use strict';

var Utilities = require('utilities.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Whoopsie = require('whoopsie.js');
//? }

function Size() {
    var __specialSizeStrings = {
        native: true,
        fullwidth: true
    };

    function isSpecialSize(size) {
        return __specialSizeStrings[size];
    }

    function isSize(size) {
        if (Utilities.isArray(size, 'number') && size.length === 2) {
            return true;
        }

        return false;
    }

    function isSizes(sizes) {
        if (isSize(sizes)) {
            return true;
        }

        if (!Utilities.isArray(sizes, 'array')) {
            return false;
        }

        for (var i = 0; i < sizes.length; i++) {
            if (!isSize(sizes[i])) {
                return false;
            }
        }

        return true;
    }

    function arrayToString(arr, separator, multiplier) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                arr: {
                    type: ['array', 'string']
                },
                separator: {
                    optional: true,
                    type: 'string'
                },
                multiplier: {
                    optional: true,
                    type: 'string'
                }
            }
        }, {
            arr: arr,
            separator: separator,
            multiplier: multiplier
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        separator = separator || ',';
        multiplier = multiplier || 'x';

        var str = '';

        if (Utilities.isArray(arr, 'array')) {
            for (var i = 0; i < arr.length; i++) {
                str += isSpecialSize(arr[i]) ? arr[i] : arr[i][0] + multiplier + arr[i][1] + separator;
            }
        } else if (isSpecialSize(arr)) {
            str += arr + separator;
        } else {
            str += arr[0] + multiplier + arr[1] + separator;
        }

        return str.slice(0, -1);
    }

    function stringToArray(str, separator, multiplier) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                str: {
                    type: 'string'
                },
                separator: {
                    optional: true,
                    type: 'string'
                },
                multiplier: {
                    optional: true,
                    type: 'string'
                }
            }
        }, {
            str: str,
            separator: separator,
            multiplier: multiplier
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        separator = separator || ',';
        multiplier = multiplier || 'x';

        var arr = [];

        var sizes = str.split(separator);
        for (var i = 0; i < sizes.length; i++) {
            if (isSpecialSize(sizes[i])) {
                arr.push(sizes[i]);
            } else {
                var size = sizes[i].split(multiplier);
                arr.push([Number(size[0]), Number(size[1])]);
            }
        }

        return arr;
    }

    return {

        //? if (DEBUG) {
        __type__: 'Size',
        //? }

        arrayToString: arrayToString,
        stringToArray: stringToArray,
        isSpecialSize: isSpecialSize,
        isSize: isSize,
        isSizes: isSizes
    };
}

module.exports = Size();
