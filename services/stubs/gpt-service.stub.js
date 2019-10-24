'use strict';

var System = require('system.js');

module.exports = function () {
    return {
        //? if (FEATURES.GPT_IDENTITY_TARGETING) {
        setIdentityTargeting: System.noOp
        //? }
    };
};