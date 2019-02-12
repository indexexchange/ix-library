'use strict';

var Prms = require('prms.js');

function ComplianceServiceStub() {
    function getGdprConsent() {
        return {
            applies: true,
            consentString: ''
        };
    }

    function isPrivacyEnabled() {
        return false;
    }

    function delay(func) {
        return func;
    }

    function wait() {
        return Prms.resolve();
    }

    (function __constructor() {

    })();

    return {

        //? if (DEBUG) {
        __type__: 'ComplianceService',
        //? }

        gdpr: {

            getConsent: getGdprConsent,
            setApplies: function () {}
        },

        isPrivacyEnabled: isPrivacyEnabled,
        delay: delay,
        wait: wait
    };
}

module.exports = ComplianceServiceStub;
