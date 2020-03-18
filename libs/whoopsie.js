'use strict';

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function Whoopsie(type, message) {
    //? if (DEBUG) {
    var results = Inspector.validate({
        type: 'object',
        strict: 'true',
        properties: {
            type: {
                type: 'string',
                exec: function (schema, post) {
                    if (!Whoopsie.ErrorTokens.hasOwnProperty(post)) {
                        this.report('must be one of the predefined tokens in `Whoopsie.ErrorTokens`');
                    }
                }
            },
            message: {
                type: 'string',
                minLength: 1
            }
        }
    }, {
        type: type,
        message: message
    });

    if (!results.valid) {
        throw Whoopsie('INVALID_ARGUMENT', results.format());
    }
    //? }

    return new Error(type + ': ' + message);
}

Whoopsie.ErrorTokens = {
    MISSING_ARGUMENT: 1,
    INVALID_TYPE: 2,
    INVALID_VALUE: 3,
    MISSING_PROPERTY: 4,
    NUMBER_OUT_OF_RANGE: 5,
    EMPTY_ENTITY: 6,
    INTERNAL_ERROR: 7,
    DUPLICATE_ENTITY: 8,
    INVALID_ARGUMENT: 9,
    INVALID_CONFIG: 10
};

module.exports = Whoopsie;