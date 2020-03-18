'use strict';

var System = require('system.js');

module.exports = function () {
    return {
        on: System.noOp,
        emit: System.noOp
    };
};