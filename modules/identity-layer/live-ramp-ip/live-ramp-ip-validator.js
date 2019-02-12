'use strict';

var Inspector = require('../../../libs/external/schema-inspector.js');

var partnerValidator = function (configs) {
    var result = Inspector.validate({
        type: 'object',
        strict: true,
        properties: { }
    }, configs);

    if (!result.valid) {
        return result.format();
    }

    return null;
};

module.exports = partnerValidator;
