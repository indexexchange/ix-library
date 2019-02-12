'use strict';

var Constants = require('constants.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function System() {
    var __sharedDateObj;

    var UidCharacterSets = {
        ALPHANUM: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        ALPHA: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        ALPHA_UPPER: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        ALPHA_LOWER: 'abcdefghijklmnopqrstuvwxyz',
        HEX: '0123456789abcdef',
        NUM: '0123456789'
    };

    function documentWrite(doc, data) {
        doc.open('text/html', 'replace');
        doc.write(data);
        doc.close();
    }

    function generateUniqueId(len, charSet) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                len: {
                    optional: true,
                    type: ['integer', null],
                    gte: 1
                },
                charSet: {
                    optional: true,
                    type: 'string'
                }
            }
        }, {
            len: len,
            charSet: charSet
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }

        if (typeof charSet !== 'undefined') {
            if (!UidCharacterSets.hasOwnProperty(charSet)) {
                throw Whoopsie('INVALID_VALUE', '`charSet` must be one of predefined values in UidCharacterSets');
            }
        }
        //? }

        len = len || Constants.DEFAULT_UID_LENGTH;
        charSet = charSet || Constants.DEFAULT_UID_CHARSET;

        var uid = '';
        for (var i = 0; i < len; i++) {
            uid += UidCharacterSets[charSet].charAt(Math.floor(Math.random() * UidCharacterSets[charSet].length));
        }

        return uid;
    }

    function generateUuid() {
        return generateUniqueId(8, 'HEX')
                 + '-' + generateUniqueId(4, 'HEX')
                 + '-4' + generateUniqueId(3, 'HEX')
                 + '-' + '89ab'.charAt(Math.floor(Math.random() * 4)) + generateUniqueId(3, 'HEX')
                 + '-' + generateUniqueId(8, 'HEX');
    }

    function now() {
        return (new Date()).getTime();
    }

    function getTimezoneOffset() {
        return __sharedDateObj.getTimezoneOffset();
    }

    function noOp() {}

    (function __constructor() {
        __sharedDateObj = new Date();
    })();

    return {

        //? if (DEBUG) {
        __type__: 'System',
        //? }

        UidCharacterSets: UidCharacterSets,

        generateUniqueId: generateUniqueId,
        generateUuid: generateUuid,
        now: now,
        getTimezoneOffset: getTimezoneOffset,
        documentWrite: documentWrite,
        noOp: noOp
    };
}

module.exports = System();
