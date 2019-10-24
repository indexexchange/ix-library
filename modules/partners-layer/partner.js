'use strict';

var BidTransformer = require('bid-transformer.js');
var CommandQueue = require('command-queue.js');
var Constants = require('constants.js');
var Network = require('network.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

var EventsService;
var RenderService;
var KeyValueService;

//? if (DEBUG) {
var Scribe = require('scribe.js');
var ConfigValidators = require('config-validators.js');
var Inspector = require('schema-inspector.js');
//? }

function Partner(profile, configs, requiredResources, fns) {

    var __profile;

    var __ready;

    var __rateLimit;
    var __rateLimitMap;

    var __directInterface;

    var __retriever;
    var __generateRequestObj;
    var __parseResponse;

    var __bidTransformerDefaultConfigs;

    var optData = {
        keyValues: {}
    };

    var BID_TRANSFORMER_TYPES = {
        PRICE: 'price',
        TARGETING: 'targeting',
        VIDEO: 'video'
    };

    var _configs;

    var _cmd;

    var _adResponseStore;

    var _bidTransformers;

    var adResponseCallback;
    var adResponseCallbacks;

    function __generateAdResponseCallback(callbackId) {
        return function (adResponse) {
            _adResponseStore[callbackId] = adResponse;
            delete adResponseCallbacks[callbackId];
        };
    }

    function _emitStatsEvent(sessionId, statsEventName, slotCollectionObject) {
        for (var htSlotId in slotCollectionObject) {
            if (!slotCollectionObject.hasOwnProperty(htSlotId)) {
                continue;
            }

            for (var requestId in slotCollectionObject[htSlotId]) {
                if (!slotCollectionObject[htSlotId].hasOwnProperty(requestId)) {
                    continue;
                }

                if (!slotCollectionObject[htSlotId][requestId].length) {
                    continue;
                }

                EventsService.emit(statsEventName, {
                    sessionId: sessionId,
                    statsId: __profile.statsId,
                    htSlotId: htSlotId,
                    requestId: requestId,
                    xSlotNames: slotCollectionObject[htSlotId][requestId]
                });
            }
        }
    }

    function _generateBidTransformerConfig(type, defaults) {
        var typeConfigOverride = {};

        if (type === BID_TRANSFORMER_TYPES.PRICE) {
            typeConfigOverride = {
                outputCentsDivisor: 1,
                outputPrecision: 0,
                roundingType: 'NONE'
            };
        } else if (type === BID_TRANSFORMER_TYPES.TARGETING) {

            typeConfigOverride = configs.bidTransformer;
        } else {

            typeConfigOverride = configs.bidTransformerTypes[type];
        }

        return Utilities.mergeObjects(

            __bidTransformerDefaultConfigs[type],

            {
                bidUnitInCents: __profile.bidUnitInCents
            },

            defaults || {},

            typeConfigOverride || {}
        );
    }

    function _generateReturnParcels(inParcels) {
        var returnParcelSets = [];
        if (__profile.architecture === Partner.Architectures.FSRA) {
            returnParcelSets.push([]);
        }

        var xSlotUsedCount = {};

        for (var i = 0; i < inParcels.length; i++) {
            var htSlotName = inParcels[i].htSlot.getName();

            if (!_configs.mapping.hasOwnProperty(htSlotName)) {
                continue;
            }

            var requestId = '_' + System.generateUniqueId();

            for (var j = 0; j < _configs.mapping[htSlotName].length; j++) {
                var returnParcel = {};

                var xSlotName = _configs.mapping[htSlotName][j];

                returnParcel.partnerId = __profile.partnerId;
                returnParcel.partnerStatsId = __profile.statsId;
                returnParcel.htSlot = inParcels[i].htSlot;
                returnParcel.ref = inParcels[i].ref;
                returnParcel.xSlotRef = _configs.xSlots[xSlotName];
                returnParcel.xSlotName = xSlotName;
                returnParcel.requestId = requestId;
                if (inParcels[i].firstPartyData) {
                    returnParcel.firstPartyData = inParcels[i].firstPartyData;
                }

                //? if (FEATURES.IDENTITY) {
                if (inParcels[i].identityData) {
                    returnParcel.identityData = inParcels[i].identityData;
                }
                //? }

                if (__profile.architecture === Partner.Architectures.MRA) {
                    returnParcelSets.push([returnParcel]);
                } else {
                    if (__profile.architecture === Partner.Architectures.FSRA) {
                        returnParcelSets[0].push(returnParcel);
                    } else {
                        if (!xSlotUsedCount.hasOwnProperty(xSlotName)) {
                            xSlotUsedCount[xSlotName] = 0;
                        }

                        if (returnParcelSets.length < xSlotUsedCount[xSlotName] + 1) {
                            returnParcelSets.push([]);
                        }

                        returnParcelSets[xSlotUsedCount[xSlotName]].push(returnParcel);
                        xSlotUsedCount[xSlotName]++;
                    }
                }
            }
        }

        return returnParcelSets;
    }

    function _sendDemandRequest(sessionId, returnParcels) {
        if (returnParcels.length === 0) {
            return Prms.resolve([]);
        }

        optData.keyValues = KeyValueService.getDefaultKeyValueData();

        if (KeyValueService.hasKeyValueAccess(__profile.partnerId)) {
            optData.keyValues = KeyValueService.getKeyValueData();
        }
        var request = __generateRequestObj(returnParcels, optData);

        if (Utilities.isEmpty(request)) {
            //? if (DEBUG) {
            Scribe.info('Request object is empty. Aborting sending bid request.');
            //? }

            return Prms.resolve([]);
        }

        if (__profile.callbackType === Partner.CallbackTypes.CALLBACK_NAME) {
            adResponseCallbacks[request.callbackId] = __generateAdResponseCallback(request.callbackId);
        }
        var xSlotNames = {};

        if (__profile.enabledAnalytics.requestTime) {
            for (var i = 0; i < returnParcels.length; i++) {
                var parcel = returnParcels[i];
                var htSlotId = parcel.htSlot.getId();
                var requestId = parcel.requestId;

                if (!xSlotNames.hasOwnProperty(htSlotId)) {
                    xSlotNames[htSlotId] = {};
                }

                if (!xSlotNames[htSlotId].hasOwnProperty(requestId)) {
                    xSlotNames[htSlotId][requestId] = [];
                }

                xSlotNames[htSlotId][requestId].push(parcel.xSlotName);
            }

            _emitStatsEvent(sessionId, 'hs_slot_request', xSlotNames);
        }

        return new Prms(function (resolve) {
            EventsService.emit('partner_request_sent', {
                partner: __profile.partnerId,
                //? if (DEBUG) {
                parcels: returnParcels,
                request: request
                //? }
            });

            var startTime;

            var defaultNetworkParams = {
                url: request.url,
                data: request.data,
                method: 'GET',
                timeout: _configs.timeout,
                withCredentials: true,
                jsonp: true,
                sessionId: sessionId,
                globalTimeout: true,
                continueAfterTimeout: true,

                //? if (DEBUG) {
                initiatorId: __profile.partnerId,
                //? }

                onSuccess: function (responseText, endtime, timedOut) {
                    var responseObj;
                    var requestStatus = 'success';

                    try {
                        if (__profile.callbackType === Partner.CallbackTypes.NONE) {
                            responseObj = JSON.parse(responseText);
                        } else {
                            if (responseText) {
                                eval.call(null, responseText);
                            }
                            responseObj = _adResponseStore[request.callbackId];
                            delete _adResponseStore[request.callbackId];
                        }

                        if (!timedOut || __profile.parseAfterTimeout) {
                            __parseResponse(sessionId, responseObj, returnParcels, xSlotNames, startTime, endtime, timedOut);
                        }
                    } catch (ex) {
                        EventsService.emit('internal_error', __profile.partnerId + ' error parsing demand: ' + ex, ex.stack);

                        requestStatus = 'error';

                        if (__profile.enabledAnalytics.requestTime && !timedOut) {
                            _emitStatsEvent(sessionId, 'hs_slot_error', xSlotNames);
                        }
                    }

                    EventsService.emit('partner_request_complete', {
                        sessionId: sessionId,
                        partner: __profile.partnerId,
                        status: requestStatus,
                        //? if (DEBUG) {
                        parcels: returnParcels,
                        request: request
                        //? }
                    });
                    resolve(returnParcels);
                },

                onTimeout: function () {
                    EventsService.emit('partner_request_complete', {
                        sessionId: sessionId,
                        partner: __profile.partnerId,
                        status: 'timeout',
                        //? if (DEBUG) {
                        parcels: returnParcels,
                        request: request
                        //? }
                    });

                    if (__profile.enabledAnalytics.requestTime) {
                        _emitStatsEvent(sessionId, 'hs_slot_timeout', xSlotNames);
                    }

                    resolve(returnParcels);
                },

                onFailure: function () {
                    EventsService.emit('partner_request_complete', {
                        sessionId: sessionId,
                        partner: __profile.partnerId,
                        status: 'error',
                        //? if (DEBUG) {
                        parcels: returnParcels,
                        request: request
                        //? }
                    });

                    if (__profile.enabledAnalytics.requestTime) {
                        _emitStatsEvent(sessionId, 'hs_slot_error', xSlotNames);
                    }

                    resolve(returnParcels);
                }
            };

            var networkParams;

            if (request.networkParamOverrides) {
                networkParams = Utilities.mergeObjects(defaultNetworkParams, request.networkParamOverrides);
            } else {
                networkParams = defaultNetworkParams;
            }

            if (__profile.callbackType === Partner.CallbackTypes.NONE || __profile.requestType === Partner.RequestTypes.AJAX) {
                networkParams.jsonp = false;
            }

            if (__profile.requestType === Partner.RequestTypes.JSONP) {
                startTime = Network.jsonp(networkParams);
            } else {
                startTime = Network.ajax(networkParams);
            }
        });
    }

    function _pushToCommandQueue(fn) {
        _cmd.push(fn);
    }

    function isReady() {
        return __ready;
    }

    function _setDirectInterface(directInterface) {
        __directInterface = {};
        __directInterface[__profile.namespace] = directInterface;
    }

    function _addToDirectInterface(key, value) {
        __directInterface[__profile.namespace][key] = value;
    }

    function getPartnerId() {
        return __profile.partnerId;
    }

    function getDirectInterface() {
        return __directInterface;
    }

    function getPrefetchDisabled() {
        return __profile.features.prefetchDisabled && __profile.features.prefetchDisabled.enabled;
    }

    function retrieve(sessionId, inParcels) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    minLength: 1
                },
                inParcels: {
                    type: 'array',
                    items: {
                        type: 'object'
                    }
                }
            }
        }, {
            sessionId: sessionId,
            inParcels: inParcels
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        inParcels = inParcels.slice();

        if (_configs.rateLimiting.enabled) {
            var now = System.now();

            if (__profile.targetingType === 'page') {
                if (now <= __rateLimit) {
                    return [];
                } else {
                    __rateLimit = now + _configs.rateLimiting.value;
                }
            } else {
                for (var i = inParcels.length - 1; i >= 0; i--) {
                    var htSlotId = inParcels[i].htSlot.getName();

                    if (__rateLimitMap.hasOwnProperty(htSlotId) && now <= __rateLimitMap[htSlotId]) {
                        inParcels.splice(i, 1);
                    } else {
                        __rateLimitMap[htSlotId] = now + _configs.rateLimiting.value;
                    }
                }
            }
        }

        if (!inParcels.length) {
            return [];
        }

        if (__retriever) {
            return __retriever(sessionId, inParcels);
        }

        var returnParcelSets = _generateReturnParcels(inParcels);

        var demandRequestPromises = [];
        for (var j = 0; j < returnParcelSets.length; j++) {
            demandRequestPromises.push(_sendDemandRequest(sessionId, returnParcelSets[j]));
        }

        return demandRequestPromises;
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        RenderService = SpaceCamp.services.RenderService;
        KeyValueService = SpaceCamp.services.KeyValueService;

        //? if (DEBUG) {
        var results = ConfigValidators.PartnerProfile(profile, requiredResources, fns);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }

        var validCallbackType = false;
        for (var cbType in Partner.CallbackTypes) {
            if (!Partner.CallbackTypes.hasOwnProperty(cbType)) {
                continue;
            }

            if (Partner.CallbackTypes[cbType] === profile.callbackType) {
                validCallbackType = true;

                break;
            }
        }

        if (!validCallbackType) {
            throw Whoopsie('INVALID_CONFIG', '`profile.callbackType` must be one of the predefined values in `Partner.CallbackTypes`');
        }

        var validArchitecture = false;
        for (var aType in Partner.Architectures) {
            if (!Partner.Architectures.hasOwnProperty(aType)) {
                continue;
            }

            if (Partner.Architectures[aType] === profile.architecture) {
                validArchitecture = true;

                break;
            }
        }

        if (!validArchitecture) {
            throw Whoopsie('INVALID_CONFIG', '`profile.architecture` must be one of the predefined values in `Partner.Architectures`');
        }
        //? }

        __bidTransformerDefaultConfigs = {
            targeting: {

                bidUnitInCents: 1,
                outputCentsDivisor: 1,
                outputPrecision: 0,
                roundingType: 'FLOOR',
                floor: 0,
                buckets: [
                    {
                        max: 2000,
                        step: 5
                    },
                    {
                        max: 5000,
                        step: 100
                    }
                ]
            },
            price: {

                bidUnitInCents: 1
            },
            video: {

                bidUnitInCents: 1,
                outputCentsDivisor: 1,
                outputPrecision: 0,
                roundingType: 'FLOOR',
                floor: 0,
                buckets: [
                    {
                        max: 300,
                        step: 1
                    },
                    {
                        max: 2000,
                        step: 5
                    },
                    {
                        max: 7000,
                        step: 100
                    }
                ]
            }
        };

        __profile = profile;

        __rateLimit = 0;
        __rateLimitMap = {};

        _cmd = [];

        adResponseCallbacks = {};
        _adResponseStore = {};

        _configs = {
            timeout: 0,
            lineItemType: profile.lineItemType,
            targetingKeys: profile.targetingKeys,
            rateLimiting: profile.features.rateLimiting
        };

        if (configs.hasOwnProperty('timeout') && configs.timeout > 0) {
            _configs.timeout = configs.timeout;

            EventsService.emit('hs_define_partner_timeout', {
                timeout: _configs.timeout,
                statsId: __profile.statsId
            });
        }

        if (configs.hasOwnProperty('targetingKeyOverride')) {
            for (var targetingKey in configs.targetingKeyOverride) {
                if (!configs.targetingKeyOverride.hasOwnProperty(targetingKey)) {
                    continue;
                }

                if (_configs.targetingKeys.hasOwnProperty(targetingKey)) {
                    _configs.targetingKeys[targetingKey] = configs.targetingKeyOverride[targetingKey];
                }
            }
        }

        if (configs.hasOwnProperty('rateLimiting')) {
            if (configs.rateLimiting.hasOwnProperty('enabled')) {
                _configs.rateLimiting.enabled = configs.rateLimiting.enabled;
            }

            if (configs.rateLimiting.value) {
                _configs.rateLimiting.value = configs.rateLimiting.value;
            }
        }

        if (configs.hasOwnProperty('lineItemType')) {
            _configs.lineItemType = Constants.LineItemTypes[configs.lineItemType];
        }

        _configs.xSlots = configs.xSlots;
        _configs.mapping = configs.mapping;

        __ready = false;

        if (requiredResources) {
            if (!Utilities.isArray(requiredResources)) {
                requiredResources = [requiredResources];
            }

            var resourcePromises = [];

            requiredResources.map(function (url) {
                var deferred = Prms.defer();
                resourcePromises.push(deferred.promise);

                Network.jsonp({
                    url: url,
                    onSuccess: function () {
                        deferred.resolve();
                    }
                });
            });

            Prms.all(resourcePromises).then(function () {
                __ready = true;
                EventsService.emit('partner_instantiated', {
                    partner: __profile.partnerId
                });
                _cmd = CommandQueue(_cmd);
            });
        } else {
            EventsService.emit('partner_instantiated', {
                partner: __profile.partnerId
            });
            __ready = true;
        }

        //? if(FEATURES.GPT_LINE_ITEMS) {
        RenderService.registerPartner(__profile.partnerId, _configs.lineItemType, _configs.targetingKeys.id);
        //? }

        _bidTransformers = {};

        if (profile.hasOwnProperty('bidUnitInCents')) {
            //? if(FEATURES.GPT_LINE_ITEMS) {
            _bidTransformers.targeting = BidTransformer(_generateBidTransformerConfig(BID_TRANSFORMER_TYPES.TARGETING));
            //? }
            //? if(FEATURES.RETURN_PRICE) {
            _bidTransformers.price = BidTransformer(_generateBidTransformerConfig(BID_TRANSFORMER_TYPES.PRICE));
            //? }
            //? if(FEATURES.VIDEO) {
            _bidTransformers.video = BidTransformer(_generateBidTransformerConfig(BID_TRANSFORMER_TYPES.VIDEO));
            //? }
        }

        if (fns.retriever) {
            __retriever = fns.retriever;
        } else {
            __parseResponse = fns.parseResponse;
            __generateRequestObj = fns.generateRequestObj;

            adResponseCallback = fns.adResponseCallback;
        }

        __directInterface = {};
        if (!__directInterface.hasOwnProperty(__profile.namespace)) {
            __directInterface[__profile.namespace] = {};
        }

        if (__profile.callbackType === Partner.CallbackTypes.ID) {
            __directInterface[__profile.namespace].adResponseCallback = adResponseCallback;
        } else {
            __directInterface[__profile.namespace].adResponseCallbacks = adResponseCallbacks;
        }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'Partner',
        //? }

        _configs: _configs,
        _adResponseStore: _adResponseStore,
        _bidTransformers: _bidTransformers,

        _setDirectInterface: _setDirectInterface,
        _addToDirectInterface: _addToDirectInterface,

        _generateReturnParcels: _generateReturnParcels,
        _emitStatsEvent: _emitStatsEvent,
        _pushToCommandQueue: _pushToCommandQueue,

        _generateBidTransformerConfig: _generateBidTransformerConfig,

        getPartnerId: getPartnerId,
        getDirectInterface: getDirectInterface,
        getPrefetchDisabled: getPrefetchDisabled,

        isReady: isReady,
        retrieve: retrieve
    };
}

Partner.Architectures = {
    MRA: 0,
    SRA: 1,
    FSRA: 2
};

Partner.CallbackTypes = {
    ID: 0,
    CALLBACK_NAME: 1,
    NONE: 2
};

Partner.RequestTypes = {
    ANY: 0,
    AJAX: 1,
    JSONP: 2
};

module.exports = Partner;
