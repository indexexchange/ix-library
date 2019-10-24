'use strict';

var Classify = require('classify.js');
var Layer = require('layer.js');
var Constants = require('constants.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

var PartnerConstructors = {
    /* PubKitTemplate<PartnerConstructors> */
};

//? if (FEATURES.PREFETCH) {
var PrefetchModule = require('prefetch.js');
//? }

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

var TimerService;

function PartnersLayer(configs) {

    var __baseClass;

    //? if (FEATURES.PREFETCH) {

    var __prefetchModule;

    //? }

    var __partners;

    var __firstPartyDataPartnerIds = {
        rubicon: ['RubiconHtb', 'RubiconExtHtb']
    };

    function getShuffledPartnerIDs(partners) {
        var order = [];

        for (var partner in partners) {
            if (!partners.hasOwnProperty(partner)) {
                continue;
            }

            var priority = partners[partner].priority;
            if (!Utilities.isInteger(priority)) {
                priority = Constants.DEFAULT_PARTNER_PRIORITY;
            }

            order[priority] = order[priority] || [];
            order[priority].push(partner);
        }

        var flat = [];
        order.forEach(function (toShufle) {
            Utilities.shuffle(toShufle);
            toShufle.forEach(function (partner) {
                flat.push(partner);
            });
        });

        return flat;
    }

    function __partnerCaller(sessionId, partnerId, partnerInstance, inParcels, isPrefetch) {
        if (isPrefetch && partnerInstance.getPrefetchDisabled()) {
            return [];
        }

        var outParcels = inParcels.slice();

        var partnerDefers = [];

        //? if (FEATURES.PREFETCH) {
        if (!isPrefetch) {
            Utilities.appendToArray(partnerDefers, __prefetchModule.fulfilDemand(sessionId, partnerId, partnerInstance, outParcels));

            if (!outParcels.length) {
                return partnerDefers;
            }
        }
        //? }

        var partnerPromises = partnerInstance.retrieve(sessionId, outParcels);

        var wrappedPartnerDefers = partnerPromises.map(function (partnerPromise) {
            var defer = Prms.defer();

            partnerPromise.then(function (receivedParcels) {
                defer.resolve(receivedParcels);
            }).catch(function (ex) {
                //? if (DEBUG) {
                Scribe.error('Partner "' + partnerId + '" was unable to retrieve.');
                Scribe.error(ex.stack);
                //? }

                defer.resolve([]);
            });

            return defer;
        });

        //? if (FEATURES.PREFETCH) {
        if (isPrefetch) {
            var wrappedPartnerPromises = wrappedPartnerDefers.map(function (defer) {
                return defer.promise;
            });

            __prefetchModule.storeDemand(sessionId, partnerId, partnerInstance, outParcels, wrappedPartnerPromises);
        }
        //? }

        Utilities.appendToArray(partnerDefers, wrappedPartnerDefers);

        return partnerDefers;
    }

    function __invokeAllPartners(sessionId, inParcels, isPrefetch) {
        var returnObj = {
            defers: [],
            promises: []
        };

        //? if (DEBUG) {
        Scribe.debug('__invokeAllPartners()');
        //? }

        var allPartnerIds = getShuffledPartnerIDs(__partners);

        //? if (DEBUG) {
        Scribe.debug('allPartnerIds ', JSON.stringify(allPartnerIds));
        //? }

        for (var p = 0; p < allPartnerIds.length; p++) {
            var partnerId = allPartnerIds[p];

            //? if (DEBUG) {
            if (!__partners.hasOwnProperty(partnerId)) {
                Scribe.error('partnerId not found in __partners', partnerId);

                continue;
            }
            //? }

            var partner = __partners[partnerId];

            if (partner.enabled) {
                try {
                    //? if (DEBUG) {
                    Scribe.debug('Invoking Partner "' + partnerId + '"');
                    //? }
                    var partnerDefers = __partnerCaller(sessionId, partnerId, partner.instance, inParcels, isPrefetch);
                    for (var i = 0; i < partnerDefers.length; i++) {
                        returnObj.defers.push(partnerDefers[i]);
                        returnObj.promises.push(partnerDefers[i].promise);
                    }
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Partner "' + partnerId + '" was unable to retrieve.');
                    Scribe.error(ex.stack);
                    //? }
                }
            }
        }

        return returnObj;
    }

    //? if (DEBUG) {
    function enablePartner(partnerId) {
        if (!__partners.hasOwnProperty(partnerId)) {
            Scribe.info('Partner module "' + partnerId + '" does not exist.');

            return;
        }

        if (__partners[partnerId].enabled) {
            Scribe.info('Partner module "' + partnerId + '" already enabled.');

            return;
        }

        if (!__partners[partnerId].instance) {
            try {
                __partners[partnerId].instance = PartnerConstructors[partnerId](__partners[partnerId].configs);

                if (!__partners[partnerId].instance) {
                    __partners[partnerId].enabled = false;
                    //? if (DEBUG) {
                    Scribe.warn('Failed to enable partner ' + partnerId);
                    //? }

                    return;
                }
            } catch (ex) {
                Scribe.error('Partner module "' + partnerId + '" failed to load.');
                Scribe.error(ex.stack);

                return;
            }
        }

        __partners[partnerId].enabled = true;
    }
    //? }

    //? if (DEBUG) {
    function disablePartner(partnerId) {
        if (!__partners.hasOwnProperty(partnerId)) {
            Scribe.info('Partner module "' + partnerId + '" does not exist.');

            return;
        }

        if (!__partners[partnerId].enabled) {
            Scribe.info('Partner module "' + partnerId + '" already disabled.');

            return;
        }

        __partners[partnerId].enabled = false;
    }
    //? }

    function setFirstPartyData(data) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                rubicon: {
                    type: 'object',
                    strict: true,
                    properties: {
                        keywords: {
                            optional: true,
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        },
                        inventory: {
                            optional: true,
                            properties: {
                                '*': {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                }
                            }
                        },
                        visitor: {
                            optional: true,
                            properties: {
                                '*': {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, data);
        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var fpdPartnerId in data) {
            if (!data.hasOwnProperty(fpdPartnerId)) {
                continue;
            }

            if (!__firstPartyDataPartnerIds.hasOwnProperty(fpdPartnerId)) {
                //? if (DEBUG) {
                Scribe.warn('Partner property name ' + fpdPartnerId + ' not recognized in first-party data object');
                //? }

                continue;
            }

            var partnerIds = __firstPartyDataPartnerIds[fpdPartnerId];

            for (var i = 0; i < partnerIds.length; i++) {
                var partnerId = partnerIds[i];
                if (!__partners.hasOwnProperty(partnerId)) {
                    continue;
                }

                __partners[partnerId].instance.setFirstPartyData(data[fpdPartnerId]);
            }
        }
    }

    function __executor(sessionId, inParcels) {

        var returnObj = __invokeAllPartners(sessionId, inParcels);

        TimerService.addTimerCallback(sessionId, function () {
            for (var i = 0; i < returnObj.defers.length; i++) {
                returnObj.defers[i].resolve([]);
            }
        });

        return Prms.all(returnObj.promises).then(function (parcelsArrays) {
            TimerService.clearTimer(sessionId);

            return parcelsArrays ? Utilities.mergeArrays.apply(null, parcelsArrays) : [];
        });
    }

    (function __constructor() {
        TimerService = SpaceCamp.services.TimerService;

        __baseClass = Layer();

        //? if (DEBUG) {
        var ConfigValidators = require('config-validators.js');

        var results = ConfigValidators.PartnersLayer(configs, Object.keys(PartnerConstructors));

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __partners = configs.partners;

        var partnersDirectInterface = {};

        var allPartnerIds = getShuffledPartnerIDs(__partners);
        //? if (DEBUG) {
        Scribe.debug('Shuffled partner IDs "' + JSON.stringify(allPartnerIds) + '"');
        //? }

        for (var i = 0; i < allPartnerIds.length; i++) {
            var partnerId = allPartnerIds[i];

            //? if (DEBUG) {
            Scribe.debug('Loading Partner "' + partnerId + '"');
            //? }

            //? if (DEBUG) {
            if (!__partners.hasOwnProperty(partnerId)) {
                Scribe.error('partnerId not found in __partners', partnerId);

                continue;
            }
            //? }

            var partner = __partners[partnerId];
            //? if (DEBUG) {
            Scribe.debug('Partner config object: "' + JSON.stringify(partner) + '"');
            //? }

            if (partner.enabled) {
                partner.configs.bidTransformerTypes = {};
                try {
                    if (configs.hasOwnProperty('bidTransformerTypes')) {
                        partner.configs.bidTransformerTypes
                            = Utilities.deepCopy(configs.bidTransformerTypes);
                    }

                    partner.instance = PartnerConstructors[partnerId](partner.configs, partnerId);

                    if (!partner.instance) {
                        partner.enabled = false;

                        continue;
                    }

                    if (partner.instance.getDirectInterface()) {
                        partnersDirectInterface = Utilities.mergeObjects(partnersDirectInterface, partner.instance.getDirectInterface());
                    }
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Partner module "' + partnerId + '" failed to load.');
                    Scribe.error(ex);
                    //? }

                    partner.enabled = false;
                }
            }
        }

        var directInterface = {
            //? if (DEBUG) {
            enablePartner: enablePartner,
            disablePartner: disablePartner,
            //? }
            Partners: partnersDirectInterface,
            setFirstPartyData: setFirstPartyData
        };

        //? if (FEATURES.PREFETCH) {

        __prefetchModule = PrefetchModule(
            configs, {
                __invokeAllPartners: __invokeAllPartners
            }
        );

        directInterface.prefetchOnLoad = __prefetchModule.prefetchOnLoad;
        //? }

        __baseClass._setDirectInterface('PartnersLayer', directInterface);

        __baseClass._setExecutor(__executor);
    })();

    return Classify.derive(__baseClass, {

        //? if (DEBUG) {
        __type__: 'PartnersLayer',
        //? }

        //? if (TEST) {
        __partners: __partners,
        //? }

        //? if (TEST) {
        __partnerCaller: __partnerCaller,
        //? }

        //? if (TEST) {
        enablePartner: enablePartner,
        disablePartner: disablePartner
        //? }
    });
}

module.exports = PartnersLayer;
