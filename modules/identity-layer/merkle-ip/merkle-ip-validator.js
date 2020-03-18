'use strict';

var Inspector = require('../../../libs/external/schema-inspector.js');

var partnerValidator = function (configs) {
    var result = Inspector.validate({
        type: 'object',
        properties: {
            pubid: {
                type: 'string',
                minLength: 1
            }
        }
    }, configs);

    if (!result.valid) {
        return result.format();
    }

    return null;
};

module.exports = partnerValidator;