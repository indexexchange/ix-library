'use strict';

var Classify = require('classify.js');
var Layer = require('layer.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');

var IdentityPartnerConstructors = {
    /* PubKitTemplate<IdentityPartnerConstructors> */
};

//? if (DEBUG) {
var Scribe = require('scribe.js');
var Whoopsie = require('whoopsie.js');
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

    var __identityTimeout;

    var __retrievalDefer;

    var __identityTimerId;

    function __partnerCaller(partnerId, partnerInstance) {
        __partnerStatuses[partnerId] = __EnumStatuses.IN_PROGRESS;

        return new Prms(function (resolve) {
            partnerInstance
                .retrieve()
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
                    partnerPromises.push(__partnerCaller(partnerId, partner.instance));
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Partner "' + partnerId + '" was unable to retrieve.');
                    Scribe.error(ex.stack);
                    //? }
                }
            }
        }

        Prms.all(partnerPromises).then(function () {
            invocationDefer.resolve();
        });

        return invocationDefer;
    }

    function __getAllPartnerResults() {
        var identityData = {};

        for (var partnerId in __identityPartners) {
            if (!__identityPartners.hasOwnProperty(partnerId)) {
                continue;
            }

            var partner = __identityPartners[partnerId];

            if (partner.enabled) {
                var partnerIdentityData = partner.instance.getResults();

                if (partnerIdentityData) {
                    identityData[partnerId] = {
                        data: partnerIdentityData
                    };
                }
            }
        }

        return identityData;
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

    function retrieve() {
        if (__status !== __EnumStatuses.NOT_STARTED) {
            return;
        }

        __retrievalDefer = __invokeAllPartners();

        __status = __EnumStatuses.IN_PROGRESS;

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
    }

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

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        __baseClass = Layer();

        //? if (DEBUG) {
        var ConfigValidators = require('config-validators.js');

        var results = ConfigValidators.IdentityLayer(configs, Object.keys(IdentityPartnerConstructors));

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __identityTimeout = configs.timeout;
        __status = __EnumStatuses.NOT_STARTED;
        __partnerStatuses = {};
        __identityPartners = configs.partners;

        EventsService.emit('hs_define_identity_timeout', {
            timeout: __identityTimeout
        });

        var allPartnerIds = Object.keys(__identityPartners);

        for (var i = allPartnerIds.length - 1; i >= 0; i--) {
            var partnerId = Utilities.randomSplice(allPartnerIds);
            var partner = __identityPartners[partnerId];

            if (partner.enabled) {
                try {
                    partner.instance = IdentityPartnerConstructors[partnerId](partner.configs);

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

        __baseClass._setDirectInterface('IdentityLayer', {
            retrieve: retrieve,
            getResult: getResult
        });

        __baseClass._setExecutor(__executor);
    })();

    return Classify.derive(__baseClass, {

        //? if (DEBUG) {
        __type__: 'IdentityLayer',
        //? }

        //? if (TEST) {
        __EnumStatuses: __EnumStatuses,
        //? }

        retrieve: retrieve,
        getResult: getResult,

        //? if (TEST) {
        __executor: __executor,
        __sendStatsTimeouts: __sendStatsTimeouts,
        __getAllPartnerResults: __getAllPartnerResults,
        __invokeAllPartners: __invokeAllPartners,
        __partnerCaller: __partnerCaller
        //? }
    });
}

module.exports = IdentityLayer;
