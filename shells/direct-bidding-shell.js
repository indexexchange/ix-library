'use strict';

var Browser = require('browser.js');
var CommandQueue = require('command-queue.js');
var HeaderTagSlot = require('header-tag-slot.js');
var Loader = require('loader.js');
var Mvt = require('mvt.js');
var Size = require('size.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');

var ComplianceService;
var EventsService;

//? if (FEATURES.MULTIPLE_CONFIGS) {
var JsonPatch = require('jsonpatch-reduced.js');
//? }

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function DirectBiddingShell() {

    var __configs;

    var __directInterface;

    var __fallbackShellInterface;

    var __validEvents = {
        error: 1,
        warning: 2,
        global_timeout_reached: 3,
        partner_instantiated: 4,
        partner_request_sent: 5,
        partner_request_complete: 6
    };

    var __RTISupressList;

    var __desktopGlobalTimeout;

    var __mobileGlobalTimeout;

    function setFirstPartyData(data) {
        if (!Utilities.isObject(data)) {
            EventsService.emit('error', 'invalid first-party data: `data` must be an object');

            return;
        }

        if (data.hasOwnProperty('rubicon')) {
            if (!Utilities.isObject(data.rubicon)) {
                EventsService.emit('error', 'invalid first-party data.rubicon');

                return;
            }

            for (var prop in data.rubicon) {
                if (!data.rubicon.hasOwnProperty(prop)) {
                    continue;
                }

                if (['keywords', 'inventory', 'visitor'].indexOf(prop) === -1) {
                    EventsService.emit('error', 'invalid first-party data: unrecognized property ' + prop + ' of `data.rubicon`');

                    return;
                }
            }

            if (data.rubicon.hasOwnProperty('keywords') && !Utilities.isArray(data.rubicon.keywords, 'string')) {
                EventsService.emit('error', 'invalid first-party data: `data.rubicon.keywords` must be an array of strings');

                return;
            }

            if (data.rubicon.hasOwnProperty('inventory')) {
                if (!Utilities.isObject(data.rubicon.inventory)) {
                    EventsService.emit('error', 'invalid first-party data: `data.rubicon.inventory` must be an object');

                    return;
                }

                for (var invKey in data.rubicon.inventory) {
                    if (!data.rubicon.inventory.hasOwnProperty(invKey)) {
                        continue;
                    }

                    if (!Utilities.isArray(data.rubicon.inventory[invKey], 'string')) {
                        EventsService.emit('error', 'invalid first-party data: property ' + invKey + ' of `data.rubicon.inventory` must be an array of strings');

                        return;
                    }
                }
            }

            if (data.rubicon.hasOwnProperty('visitor')) {
                if (!Utilities.isObject(data.rubicon.visitor)) {
                    EventsService.emit('error', 'invalid first-party data: `data.rubicon.visitor` must be an object');

                    return;
                }

                for (var visKey in data.rubicon.visitor) {
                    if (!data.rubicon.visitor.hasOwnProperty(visKey)) {
                        continue;
                    }

                    if (!Utilities.isArray(data.rubicon.visitor[visKey], 'string')) {
                        EventsService.emit('error', 'invalid first-party data: property ' + visKey + ' of `data.rubicon.visitor` must be an array of strings');

                        return;
                    }
                }
            }
        }

        try {
            __directInterface.Layers.PartnersLayer.setFirstPartyData(data);
        } catch (ex) {
            EventsService.emit('error', ex);
            //? if (DEBUG) {
            Scribe.error(ex.stack);
            //? }
        }
    }

    function retrieveDemand(htSlotDemandObjs, callback, options) {
        var receivedInfo = {
            sessionId: ''
        };

        var errorMessage = '';

        try {
            if (!Utilities.isFunction(callback)) {
                errorMessage = 'callback must be a function';
                EventsService.emit('error', errorMessage);

                throw new Error(errorMessage);
            }

            if (!Utilities.isArray(htSlotDemandObjs, 'object')) {
                errorMessage = 'htSlotDemandObjs must be an array of objects';
                EventsService.emit('error', errorMessage);

                callback({}, new Error(errorMessage));

                return;
            }

            for (var i = 0; i < htSlotDemandObjs.length; i++) {
                var htSlot = htSlotDemandObjs[i];

                if (!htSlot.hasOwnProperty('htSlotName')) {
                    errorMessage = 'htSlotDemandObjs[' + i + ']: members must contain the htSlotName property';
                    EventsService.emit('error', errorMessage);

                    callback({}, new Error(errorMessage));

                    return;
                }

                if (!Utilities.isString(htSlot.htSlotName)) {
                    errorMessage = 'htSlotDemandObjs[' + i + ']: htSlotName must be a string';
                    EventsService.emit('error', errorMessage);

                    callback({}, new Error(errorMessage));

                    return;
                }

                if (htSlot.hasOwnProperty('firstPartyData')) {
                    if (!Utilities.isObject(htSlot.firstPartyData)) {
                        errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: `data` must be an object';
                        EventsService.emit('error', errorMessage);

                        callback({}, new Error(errorMessage));

                        return;
                    }

                    if (htSlot.firstPartyData.hasOwnProperty('rubicon')) {
                        var rubiFpd = htSlot.firstPartyData.rubicon;

                        if (!Utilities.isObject(rubiFpd)) {
                            errorMessage = 'htSlotDemandObjs[' + i + ']: invalid rubicon first-party data';
                            EventsService.emit('error', errorMessage);

                            callback({}, new Error(errorMessage));

                            return;
                        }

                        for (var prop in rubiFpd) {
                            if (!rubiFpd.hasOwnProperty(prop)) {
                                continue;
                            }

                            if (['keywords', 'inventory', 'visitor', 'position'].indexOf(prop) === -1) {
                                errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: unrecognized property of `firstPartyData.rubicon`';
                                EventsService.emit('error', errorMessage);

                                callback({}, new Error(errorMessage));

                                return;
                            }
                        }

                        if (rubiFpd.hasOwnProperty('keywords') && !Utilities.isArray(rubiFpd.keywords, 'string')) {
                            errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.keywords` must be an array of strings';
                            EventsService.emit('error', errorMessage);

                            callback({}, new Error(errorMessage));

                            return;
                        }

                        if (!rubiFpd.hasOwnProperty('inventory')) {
                            if (!Utilities.isObject(rubiFpd.inventory)) {
                                errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.inventory` must be an object';
                                EventsService.emit('error', errorMessage);

                                callback({}, new Error(errorMessage));

                                return;
                            }

                            for (var invKey in rubiFpd.inventory) {
                                if (!rubiFpd.inventory.hasOwnProperty(invKey)) {
                                    continue;
                                }

                                if (!Utilities.isArray(rubiFpd.inventory[invKey], 'string')) {
                                    errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: property ' + invKey + ' of `firstPartyData.rubicon.inventory` must be an array of strings';
                                    EventsService.emit('error', errorMessage);

                                    callback({}, new Error(errorMessage));

                                    return;
                                }
                            }
                        }

                        if (rubiFpd.hasOwnProperty('visitor')) {
                            if (!Utilities.isObject(rubiFpd.visitor)) {
                                errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.visitor` must be an object';
                                EventsService.emit('error', errorMessage);

                                callback({}, new Error(errorMessage));

                                return;
                            }

                            for (var visKey in rubiFpd.visitor) {
                                if (!rubiFpd.visitor.hasOwnProperty(visKey)) {
                                    continue;
                                }

                                if (!Utilities.isArray(rubiFpd.visitor[visKey], 'string')) {
                                    errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: property ' + visKey + ' of `firstPartyData.rubicon.visitor` must be an array of strings';
                                    EventsService.emit('error', errorMessage);

                                    callback({}, new Error(errorMessage));

                                    return;
                                }
                            }
                        }

                        if (rubiFpd.hasOwnProperty('position') && !Utilities.isString(rubiFpd.position)) {
                            errorMessage = 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.position` must be a string';
                            EventsService.emit('error', errorMessage);

                            callback({}, new Error(errorMessage));

                            return;
                        }
                    }
                }
            }

            if (Utilities.getType(options) !== 'undefined') {
                if (!Utilities.isObject(options)) {
                    errorMessage = 'options must be an object';
                    EventsService.emit('error', errorMessage);

                    callback({}, new Error(errorMessage));

                    return;
                }

                if (options.hasOwnProperty('timeout') && (!Utilities.isInteger(options.timeout) || options.timeout < 0)) {
                    errorMessage = 'options.timeout must be an integer greater than 0';
                    EventsService.emit('error', errorMessage);

                    callback({}, new Error(errorMessage));

                    return;
                }
            }

            receivedInfo = __directInterface.Layers.DirectBiddingLayer.retrieveDemand(htSlotDemandObjs, options);

            receivedInfo.promise
                .then(function (receivedDemand) {
                    callback(receivedDemand);
                })
                .catch(function (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Error occurred while retrieving demand');
                    Scribe.error(ex.stack);
                    //? }
                    EventsService.emit('error', ex);

                    setTimeout(callback.bind(null, {}), 0);
                });
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while retrieving demand');
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);

            setTimeout(callback.bind(null, {}), 0);
        }

        return receivedInfo.sessionId;
    }

    function retrieveVideoDemand(htSlotVideoDemandObjs, callback, options) {
        if (!Utilities.isFunction(callback)) {
            throw new Error('callback must be a function');
        }

        try {
            if (!Utilities.isArray(htSlotVideoDemandObjs, 'object')) {
                callback({}, new Error('htSlotVideoDemandObjs must be an array of objects'));

                return;
            }

            for (var i = 0; i < htSlotVideoDemandObjs.length; i++) {
                var htSlot = htSlotVideoDemandObjs[i];

                if (!htSlot.hasOwnProperty('htSlotName')) {
                    callback({}, new Error('htSlotVideoDemandObjs[' + i + ']: members must contain the htSlotName property'));

                    return;
                }

                if (!Utilities.isString(htSlot.htSlotName)) {
                    callback({}, new Error('htSlotVideoDemandObjs[' + i + ']: htSlotName must be a string'));

                    return;
                }
            }

            if (Utilities.getType(options) !== 'undefined') {
                if (!Utilities.isObject(options)) {
                    callback({}, new Error('options must be an object'));

                    return;
                }

                if (options.hasOwnProperty('timeout') && (!Utilities.isInteger(options.timeout) || options.timeout < 0)) {
                    callback({}, new Error('options.timeout must be an integer greater than 0'));

                    return;
                }
            }

            ComplianceService.delay(function () {
                var receivedInfo = __directInterface.Layers.DirectBiddingLayer.retrieveVideoDemand(htSlotVideoDemandObjs, options);

                receivedInfo.promise
                    .then(function (receivedDemand) {
                        callback(receivedDemand);
                    })
                    .catch(function (ex) {
                        //? if (DEBUG) {
                        Scribe.error('Error occurred while retrieving demand');
                        Scribe.error(ex.stack);
                        //? }
                        EventsService.emit('error', ex);

                        setTimeout(callback.bind(null, {}), 0);
                    });
            })();
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while retrieving demand');
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);

            setTimeout(callback.bind(null, {}), 0);
        }
    }

    function buildGamMvt(htSlotsParams, demandObjs) {
        if (!Utilities.isObject(htSlotsParams)) {
            throw new Error('htSlotsParams must be an object');
        }

        if (!Utilities.isObject(demandObjs)) {
            throw new Error('demandObjs must be an object');
        }

        var mvts = {};
        var specialCaseKeys = ['iu', 'description_url', 'cust_params', 'sz'];

        for (var htSlotName in htSlotsParams) {
            if (!htSlotsParams.hasOwnProperty(htSlotName)) {
                continue;
            }

            var htSlotParams = htSlotsParams[htSlotName];

            if (!Utilities.isObject(htSlotParams)) {
                throw new Error('htSlotsParams.' + htSlotName + ' must be an object');
            }

            if (!htSlotParams.hasOwnProperty('iu') || !Utilities.isString(htSlotParams.iu) || Utilities.isEmpty(htSlotParams.iu)) {
                throw new Error('htSlotsParams.' + htSlotName + '.iu must exist and must be a non empty string');
            }

            if (!htSlotParams.hasOwnProperty('description_url') || !Utilities.isString(htSlotParams.description_url) || Utilities.isEmpty(htSlotParams.description_url)) {
                throw new Error('htSlotsParams.' + htSlotName + '.description_url must exist and must be a non empty string');
            }

            if (htSlotParams.hasOwnProperty('sz') && !Size.isSize(htSlotParams.sz) && !Size.isSizes(htSlotParams.sz)) {
                throw new Error('htSlotsParams.' + htSlotName + '.sz must be in the format [width, height] or [[width, height], [width, height], ...]');
            }

            if (htSlotParams.hasOwnProperty('cust_params')) {
                if (!Utilities.isObject(htSlotParams.cust_params)) {
                    throw new Error('htSlotsParams.' + htSlotName + '.cust_params must be an object');
                }

                var custParams = htSlotParams.cust_params;

                for (var custParamsKey in custParams) {
                    if (!custParams.hasOwnProperty(custParamsKey)) {
                        continue;
                    }

                    if (!Utilities.isArray(custParams[custParamsKey], 'string')) {
                        throw new Error('htSlotsParams.' + htSlotName + '.cust_params.' + custParamsKey + ' must be an array of string');
                    }
                }
            }

            for (var slotParamskey in htSlotParams) {
                if (!htSlotParams.hasOwnProperty(slotParamskey)) {
                    continue;
                }

                if (specialCaseKeys.indexOf(slotParamskey) !== -1) {
                    continue;
                }

                if (!Utilities.isString(htSlotParams[slotParamskey]) && !Utilities.isNumber(htSlotParams[slotParamskey])) {
                    throw new Error('htSlotsParams.' + htSlotName + '.' + slotParamskey + ' must be a string or number');
                }

                if (Utilities.isString(htSlotParams[slotParamskey]) && Utilities.isEmpty(htSlotParams[slotParamskey])) {
                    throw new Error('htSlotsParams.' + htSlotName + '.' + slotParamskey + ' must be a non empty string or number');
                }
            }

            var mvtDemandObjs = [];

            if (demandObjs.hasOwnProperty(htSlotName)) {
                var slotDemandObjs = demandObjs[htSlotName];

                if (!Utilities.isArray(slotDemandObjs, 'object')) {
                    throw new Error('demandObjs.' + htSlotName + ' must be an array of objects');
                }

                for (var j = 0; j < slotDemandObjs.length; j++) {
                    if (!slotDemandObjs[j].hasOwnProperty('size') || !Size.isSize(slotDemandObjs[j].size)) {
                        throw new Error('demandObjs.' + htSlotName + '[' + j + '].size must exist and must be an array of 2 numbers');
                    }

                    if (slotDemandObjs[j].hasOwnProperty('targeting') && !Utilities.isObject(slotDemandObjs[j].targeting)) {
                        throw new Error('demandObjs.' + htSlotName + '[' + j + '].targeting must be an object');
                    }
                }

                try {
                    mvtDemandObjs = Mvt.mediateVideoBids(slotDemandObjs);
                } catch (ex) {

                    //? if (DEBUG) {
                    Scribe.error('Error occurred while mediating demand');
                    Scribe.error(ex.stack);
                    //? }
                }
            } else {

                var htSlotsMap = SpaceCamp.htSlotsMap;

                if (!htSlotsMap.hasOwnProperty(htSlotName) || htSlotsMap[htSlotName].getType() !== HeaderTagSlot.SlotTypes.INSTREAM_VIDEO) {
                    throw new Error('htSlotName ' + htSlotName + ' does not exist');
                }

                mvtDemandObjs = [
                    {
                        size: htSlotsMap[htSlotName].getSizes(Browser.getViewportWidth(), Browser.getViewportHeight())[0]
                    }
                ];
            }

            try {
                mvts[htSlotName] = Mvt.buildDfpMvt(htSlotParams, mvtDemandObjs);
            } catch (ex) {

                //? if (DEBUG) {
                Scribe.error('Error occurred while constructing mvt');
                Scribe.error(ex.stack);
                //? }
            }
        }

        return mvts;
    }

    function getTimeout() {
        var calculatedTimeout = __desktopGlobalTimeout;

        if (SpaceCamp.DeviceTypeChecker.getDeviceType() === 'mobile') {
            calculatedTimeout = __mobileGlobalTimeout;
        }

        //? if (COMPONENTS.SERVICES.ADAPTIVE_TIMEOUT) {

        //? if (DEBUG){
        if (SpaceCamp.services.hasOwnProperty('AdaptiveTimeoutService')) {
            //? }
            try {
                calculatedTimeout = SpaceCamp.services.AdaptiveTimeoutService.getTimeout(calculatedTimeout);
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occurred while calculating adaptive timeout.');
                Scribe.error(ex.stack);
                //? }
            }
            //? if (DEBUG){
        }
        //? }
        //? }

        return calculatedTimeout;
    }

    function subscribeEvent(eventName, once, callback) {
        var subscriptionId = '';

        try {
            if (!Utilities.isBoolean(once)) {
                EventsService.emit('error', '`once` must be a boolean');

                return subscriptionId;
            }

            if (!Utilities.isFunction(callback)) {
                EventsService.emit('error', '`callback` must be a function');

                return subscriptionId;
            }

            if (!Utilities.isString(eventName)) {
                EventsService.emit('error', '`eventName` must be a string');

                return subscriptionId;
            }

            if (!__validEvents.hasOwnProperty(eventName)) {
                EventsService.emit('error', 'Unrecognized event ' + eventName);

                return subscriptionId;
            }

            var wrappingCallback = function () {
                var args = Array.prototype.slice.call(arguments);

                callback(eventName, JSON.stringify(args));
            };

            if (once) {
                subscriptionId = EventsService.once(eventName, wrappingCallback);
            } else {
                subscriptionId = EventsService.on(eventName, wrappingCallback);
            }
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while subscribing to event ' + eventName);
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);
        }

        return subscriptionId;
    }

    function unsubscribeEvent(subscriptionId) {
        try {
            if (!Utilities.isString(subscriptionId)) {
                EventsService.emit('error', '`subscriptionId` must be a string');

                return;
            }

            EventsService.off(subscriptionId);
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while unsubscribing from event ' + subscriptionId);
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);
        }
    }

    function getIdentityInfo() {
        var identityResult = {};
        //? if (FEATURES.IDENTITY) {

        //? if (DEBUG) {
        if (__directInterface.Layers.hasOwnProperty('IdentityLayer')) {
        //? }
            identityResult = __directInterface.Layers.IdentityLayer.getIdentityResults();
            //? if (RTI_SUPPRESS_LIST) {
            for (var partner in __RTISupressList) {
                if (!__RTISupressList.hasOwnProperty(partner)) {
                    continue;
                }
                delete identityResult[__RTISupressList[partner]];
            }
        //? if (DEBUG) {
        }
        //? }

        //? }
        //? }
        return identityResult;
    }

    (function __constructor() {
        try {

            /*?
            write('__configs = ');
            if(__CONFIG_WINDOW_GLOBAL__) {
                write('window.');
                write(__CONFIG_WINDOW_GLOBAL__);
            } else if(__CONFIGS__) {
                write(JSON.stringify(__CONFIGS__, null, 4));
            } else {
                write('{}');
            }
            write(';');
            */

            /*?
            if (RTI_SUPPRESS_LIST) {
                write('__RTISupressList = ');
                write(JSON.stringify(RTI_SUPPRESS_LIST, null, 4));
                write(';');
            }
            */

            //? if (FEATURES.MULTIPLE_CONFIGS) {
            /*?
            if(__CONFIG_PATCHES__) {
                write('var configPatches = ');
                write(JSON.stringify(__CONFIG_PATCHES__, null, 4));
                write(';');
            }
            */

            for (var i = 0; i < configPatches.length; i++) {
                var locationRegex = new RegExp(configPatches[i].regex);

                if (locationRegex.test(Browser.getPageUrl())) {
                    __configs = JsonPatch.applyPatch(__configs, configPatches[i].patch);

                    break;
                }
            }
            //? }

            __desktopGlobalTimeout = __configs.Layers[0].configs.desktopGlobalTimeout;
            __mobileGlobalTimeout = __configs.Layers[0].configs.mobileGlobalTimeout;
            __directInterface = Loader(__configs).getDirectInterface();

            ComplianceService = SpaceCamp.services.ComplianceService;
            EventsService = SpaceCamp.services.EventsService;

            //? if (FEATURES.IDENTITY) {
            try {
                __directInterface.Layers.IdentityLayer.retrieve();
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occured while retrieving identity data.');
                Scribe.error(ex.stack);
                //? }
            }
            //? }

            //? if (FEATURES.PREFETCH) {
            try {
                //? if (FEATURES.IDENTITY) {
                ComplianceService.wait()
                    .then(function () {
                        return __directInterface.Layers.IdentityLayer.getResult();
                    })
                    .then(function (identityData) {
                        __directInterface.Layers.PartnersLayer.prefetchOnLoad(identityData);
                    })
                    .catch(function (ex) {
                        //? if (DEBUG) {
                        Scribe.error('Error occured while getting identity data.');
                        Scribe.error(ex.stack);
                        //? }
                        __directInterface.Layers.PartnersLayer.prefetchOnLoad();
                    });
                //? } else {
                ComplianceService.wait()
                    .then(function () {
                        __directInterface.Layers.PartnersLayer.prefetchOnLoad();
                    })
                    .catch(function (ex) {
                        //? if (DEBUG) {
                        Scribe.error('Error occured while waiting for compliance data');
                        Scribe.error(ex.stack);
                        //? }
                    });
                //? }
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occured while trying to prefetch.');
                Scribe.error(ex.stack);
                //? }
            }
            //? }
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred trying to load modules.');
            Scribe.error(ex);
            Scribe.error(ex.stack);
            //? }

            __fallbackShellInterface = {
                setFirstPartyData: function () {},
                retrieveDemand: function (htSlots, callback) {
                    setTimeout(callback.bind(null, {}), 0);

                    return '';
                },
                retrieveVideoDemand: function (htSlots, callback) {
                    setTimeout(callback.bind(null, {}), 0);

                    return '';
                },
                subscribeEvent: function () {
                    return '';
                },
                unsubscribeEvent: function () {}
            };
        }
    })();

    if (__fallbackShellInterface) {
        return __fallbackShellInterface;
    }

    var shellInterface = {};

    if (window[SpaceCamp.NAMESPACE]) {
        for (var prop in window[SpaceCamp.NAMESPACE]) {
            if (!window[SpaceCamp.NAMESPACE].hasOwnProperty(prop)) {
                continue;
            }

            shellInterface[prop] = window[SpaceCamp.NAMESPACE][prop];
        }
    }

    //? if (DEBUG) {
    shellInterface.__type__ = 'DirectBiddingShell';
    //? }

    //? if (TEST) {
    shellInterface.__RTISupressList = __RTISupressList;
    //? }

    shellInterface.setFirstPartyData = setFirstPartyData;
    shellInterface.retrieveDemand = ComplianceService.delay(retrieveDemand);
    shellInterface.retrieveVideoDemand = retrieveVideoDemand;
    shellInterface.buildGamMvt = buildGamMvt;
    shellInterface.subscribeEvent = subscribeEvent;
    shellInterface.unsubscribeEvent = unsubscribeEvent;
    shellInterface.getTimeout = getTimeout;
    shellInterface.setSiteKeyValueData = SpaceCamp.services.KeyValueService.setSiteKeyValueData;
    shellInterface.setUserKeyValueData = SpaceCamp.services.KeyValueService.setUserKeyValueData;
    shellInterface.getIdentityInfo = getIdentityInfo;

    /* PubKitTemplate<PartnerExports> */

    return shellInterface;
}

//? if (!TEST) {

window[SpaceCamp.NAMESPACE] = window[SpaceCamp.NAMESPACE] || {};
window[SpaceCamp.NAMESPACE].cmd = window[SpaceCamp.NAMESPACE].cmd || [];

var cmd = window[SpaceCamp.NAMESPACE].cmd;

window[SpaceCamp.NAMESPACE] = DirectBiddingShell();
window[SpaceCamp.NAMESPACE].cmd = CommandQueue(cmd);

//? } else {

module.exports = DirectBiddingShell;

//? }
