'use strict';

var NormalDistributionTimeoutModule = require('normal-distribution-timeout-module.js');

function AdaptiveTimeoutService() {

    var __timeoutModule;

    function getTimeout(deviceDependentTimeout) {
        return __timeoutModule.getTimeout(deviceDependentTimeout);
    }

    (function __constructor() {
        __timeoutModule = NormalDistributionTimeoutModule();
    })();

    return {

        //? if (DEBUG) {
        __type__: 'AdaptiveTimeoutService',
        //? }

        getTimeout: getTimeout
    };
}

module.exports = AdaptiveTimeoutService;