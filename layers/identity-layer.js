'use strict';

var Classify = require('classify.js');
var Layer = require('layer.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var IdentityPartnerFactory = require('identity-partner-factory');

var IdentityPartnerConstructors = {
    /* PubKitTemplate<IdentityPartnerConstructors> */
};

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Scribe = require('scribe.js');
var Whoopsie = require('whoopsie.js');

var IdentityPartnerValidators = {
    /* PubKitTemplate<IdentityPartnerValidators> */
};
//? }

var EventsService;
var TimerService;

function IdentityLayer(configs) {
    var __baseClass;

    var __identityPartners;

    var __status;

    var __partnerStatuses;

    var __EnumStatuses = {
        NOT_STARTED: 0,
        IN_PROGRESS: 1,
        COMPLETE: 2
    };

    //? if (PRODUCT !== 'IdentityLibrary') {

    var __identityTimeout;

    var __identityTimerId;
    //? }

    //? if (PRODUCT === 'IdentityLibrary') {

    var __getIdentityInfoCalled = false;
    //? }

    var __retrievalDefer;

    function __partnerCaller(partnerId, partner) {
        __partnerStatuses[partnerId] = __EnumStatuses.IN_PROGRESS;

        return new Prms(function (resolve) {
            partner.instance
                .retrieve()
                //? if (FEATURES.GPT_IDENTITY_TARGETING) {
                .then(function () {
                    if (partner.enableSetTargeting && Utilities.isFunction(partner.instance.getTargets)) {
                        SpaceCamp.services.GptService.setIdentityTargeting(partner.instance.getTargets());
                    }
                })
                //? }
                .then(function () {
                    __partnerStatuses[partnerId] = __EnumStatuses.COMPLETE;
                    resolve();
                })
                .catch(function (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Identity partner "' + partnerId + '" was unable to retrieve.');
                    Scribe.error(ex.stack);
                    //? }
                    __partnerStatuses[partnerId] = __EnumStatuses.COMPLETE;
                    resolve();
                });
        });
    }

    function __invokeAllPartners() {
        var partnerPromises = [];
        var invocationDefer = Prms.defer();

        var allPartnerIds = Object.keys(__identityPartners);

        while (allPartnerIds.length) {
            var partnerId = Utilities.randomSplice(allPartnerIds);
            var partner = __identityPartners[partnerId];

            if (partner.enabled) {
                try {
                    partnerPromises.push(__partnerCaller(partnerId, partner));
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Partner "' + partnerId + '" was unable to retrieve.');
                    Scribe.error(ex.stack);
                    //? }
                }
            }
        }

        Prms.all(partnerPromises).then(function () {
            //? if (PRODUCT === 'IdentityLibrary') {
            EventsService.emit('rti_partner_request_complete', {
                requestsCompleted: partnerPromises.length
            });
            //? }
            invocationDefer.resolve();
        });

        return invocationDefer;
    }

    function __sendStatsTimeouts() {
        for (var partnerId in __partnerStatuses) {
            if (!__partnerStatuses.hasOwnProperty(partnerId)) {
                continue;
            }

            if (__partnerStatuses[partnerId] !== __EnumStatuses.COMPLETE) {
                EventsService.emit('hs_identity_timeout', {
                    statsId: __identityPartners[partnerId].instance.getStatsId()
                });
            }
        }
    }

    function __getAllPartnerResults() {
        var identityData = {};

        //? if (PRODUCT === 'IdentityLibrary') {
        if (!__getIdentityInfoCalled) {
            __getIdentityInfoCalled = true;
            __sendStatsTimeouts();
        }
        //? }

        for (var partnerId in __identityPartners) {
            if (!__identityPartners.hasOwnProperty(partnerId)) {
                continue;
            }

            var partner = __identityPartners[partnerId];

            if (partner.enabled) {
                var partnerIdentityData = partner.instance.getResults();

                //? if (PRODUCT !== 'IdentityLibrary') {
                if (partnerIdentityData) {
                    identityData[partnerId] = {
                        data: partnerIdentityData
                    };
                }
                //? } else {

                if (__partnerStatuses[partnerId] === __EnumStatuses.COMPLETE) {
                    if (partnerIdentityData) {
                        identityData[partnerId] = {
                            data: partnerIdentityData
                        };
                    } else {
                        identityData[partnerId] = {
                            data: {}
                        };
                    }
                    identityData[partnerId].responsePending = false;
                } else {
                    identityData[partnerId] = {
                        data: {},
                        responsePending: true
                    };
                }
                //? }
            }
        }

        return identityData;
    }

    function retrieve() {

        if (__status !== __EnumStatuses.NOT_STARTED) {
            return;
        }

        __retrievalDefer = __invokeAllPartners();

        __status = __EnumStatuses.IN_PROGRESS;

        //? if (PRODUCT !== 'IdentityLibrary') {

        __retrievalDefer.promise.then(function () {
            __sendStatsTimeouts();
            __status = __EnumStatuses.COMPLETE;
        });

        if (__identityTimeout === 0) {
            __retrievalDefer.resolve();
        } else if (!__identityTimerId) {

            __identityTimerId = TimerService.createTimer(__identityTimeout, false, function () {
                __retrievalDefer.resolve();
            });
        }
        //? }
    }

    //? if (PRODUCT !== 'IdentityLibrary') {

    function getResult() {

        if (__status === __EnumStatuses.NOT_STARTED) {
            return Prms.resolve(null);
        }

        if (__status !== __EnumStatuses.COMPLETE && __identityTimerId) {
            TimerService.startTimer(__identityTimerId);
        }

        return __retrievalDefer.promise.then(function () {
            return __getAllPartnerResults();
        });
    }

    function __executor(sessionId, inParcels) {
        return getResult().then(function (identityResults) {
            if (identityResults && !Utilities.isEmpty(identityResults)) {
                for (var i = 0; i < inParcels.length; i++) {
                    inParcels[i].identityData = identityResults;
                }
            }

            return __baseClass._executeNext(sessionId, inParcels);
        });
    }
    //? }

    //? if (PRODUCT !== 'IdentityLibrary') {

    function getIdentityResults() {
        var identityData = {};

        for (var partnerId in __identityPartners) {
            if (!__identityPartners.hasOwnProperty(partnerId)) {
                continue;
            }

            var partner = __identityPartners[partnerId];

            if (partner.enabled) {
                var partnerIdentityData = partner.instance.getResults();
                if (__partnerStatuses[partnerId] === __EnumStatuses.COMPLETE) {
                    if (partnerIdentityData) {
                        identityData[partnerId] = {
                            data: partnerIdentityData
                        };
                    } else {
                        identityData[partnerId] = {
                            data: {}
                        };
                    }
                    identityData[partnerId].responsePending = false;
                } else {
                    identityData[partnerId] = {
                        data: {},
                        responsePending: true
                    };
                }
            }
        }

        return identityData;
    }
    //? }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        __baseClass = Layer();

        //? if (DEBUG) {
        var results = ConfigValidators.IdentityLayer(configs, Object.keys(IdentityPartnerConstructors));

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __status = __EnumStatuses.NOT_STARTED;
        __partnerStatuses = {};
        __identityPartners = configs.partners;
        //? if (PRODUCT !== 'IdentityLibrary') {
        __identityTimeout = configs.timeout;

        EventsService.emit('hs_define_identity_timeout', {
            timeout: __identityTimeout
        });
        //? }

        var allPartnerIds = Object.keys(__identityPartners);

        for (var i = allPartnerIds.length - 1; i >= 0; i--) {
            var partnerId = Utilities.randomSplice(allPartnerIds);
            var partner = __identityPartners[partnerId];

            if (partner.enabled) {
                try {
                    var partnerModule = IdentityPartnerConstructors[partnerId];
                    if (Utilities.isObject(partnerModule)) {
                        //? if (DEBUG) {
                        var partnerValidator = IdentityPartnerValidators[partnerId];
                        var partnerResults = ConfigValidators.rtiPartnerBaseConfig(partner.configs) || partnerValidator(partner.configs);

                        if (partnerResults) {
                            throw Whoopsie('INVALID_CONFIG', partnerResults);
                        }
                        //? }

                        partner.instance = IdentityPartnerFactory(partnerModule, partner.configs);
                    } else {
                        partner.instance = partnerModule(partner.configs);
                    }

                    if (!partner.instance) {
                        partner.enabled = false;

                        continue;
                    }
                    __partnerStatuses[partnerId] = __EnumStatuses.NOT_STARTED;
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Identity partner module "' + partnerId + '" failed to load.');
                    Scribe.error(ex);
                    //? }

                    partner.enabled = false;
                }
            }
        }

        //? if (PRODUCT !== 'IdentityLibrary') {
        __baseClass._setDirectInterface('IdentityLayer', {
            retrieve: retrieve,
            getResult: getResult,
            getIdentityResults: getIdentityResults
        });

        __baseClass._setExecutor(__executor);
        //? } else {
        __baseClass._setDirectInterface('IdentityLayer', {
            retrieve: retrieve,
            getAllPartnerResults: __getAllPartnerResults
        });
        //? }
    })();

    return Classify.derive(__baseClass, {

        //? if (DEBUG) {
        __type__: 'IdentityLayer',
        //? }

        //? if (TEST) {
        __EnumStatuses: __EnumStatuses,
        //? }

        retrieve: retrieve,
        //? if (PRODUCT !== 'IdentityLibrary') {
        getResult: getResult,
        //? }

        //? if (TEST) {
        //? if (PRODUCT !== 'IdentityLibrary') {
        __executor: __executor,
        //? }

        __sendStatsTimeouts: __sendStatsTimeouts,
        __getAllPartnerResults: __getAllPartnerResults,
        __invokeAllPartners: __invokeAllPartners,
        __partnerCaller: __partnerCaller
        //? }
    });
}

module.exports = IdentityLayer;
