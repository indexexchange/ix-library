'use strict';

var Browser = require('browser.js');
var CommandQueue = require('command-queue.js');
var Loader = require('loader.js');
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

    function retrieveDemand(htSlotDemandObjs, callback) {
        var receivedInfo = {
            sessionId: ''
        };

        try {
            if (!Utilities.isFunction(callback)) {
                EventsService.emit('error', 'callback must be a function');

                return '';
            }

            if (!Utilities.isArray(htSlotDemandObjs, 'object')) {
                EventsService.emit('error', 'htSlotDemandObjs must be an array of objects');

                return;
            }

            for (var i = 0; i < htSlotDemandObjs.length; i++) {
                var htSlot = htSlotDemandObjs[i];

                if (!htSlot.hasOwnProperty('htSlotName')) {
                    EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: members must contain the htSlotName property');

                    return;
                }

                if (!Utilities.isString(htSlot.htSlotName)) {
                    EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: htSlotName must be a string');

                    return;
                }

                if (htSlot.hasOwnProperty('firstPartyData')) {
                    if (!Utilities.isObject(htSlot.firstPartyData)) {
                        EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: `data` must be an object');

                        return;
                    }

                    if (htSlot.firstPartyData.hasOwnProperty('rubicon')) {
                        var rubiFpd = htSlot.firstPartyData.rubicon;

                        if (!Utilities.isObject(rubiFpd)) {
                            EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid rubicon first-party data');

                            return;
                        }

                        for (var prop in rubiFpd) {
                            if (!rubiFpd.hasOwnProperty(prop)) {
                                continue;
                            }

                            if (['keywords', 'inventory', 'visitor', 'position'].indexOf(prop) === -1) {
                                EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: unrecognized property of `firstPartyData.rubicon`');

                                return;
                            }
                        }

                        if (rubiFpd.hasOwnProperty('keywords') && !Utilities.isArray(rubiFpd.keywords, 'string')) {
                            EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.keywords` must be an array of strings');

                            return;
                        }

                        if (!rubiFpd.hasOwnProperty('inventory')) {
                            if (!Utilities.isObject(rubiFpd.inventory)) {
                                EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.inventory` must be an object');

                                return;
                            }

                            for (var invKey in rubiFpd.inventory) {
                                if (!rubiFpd.inventory.hasOwnProperty(invKey)) {
                                    continue;
                                }

                                if (!Utilities.isArray(rubiFpd.inventory[invKey], 'string')) {
                                    EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: property ' + invKey + ' of `firstPartyData.rubicon.inventory` must be an array of strings');

                                    return;
                                }
                            }
                        }

                        if (rubiFpd.hasOwnProperty('visitor')) {
                            if (!Utilities.isObject(rubiFpd.visitor)) {
                                EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.visitor` must be an object');

                                return;
                            }

                            for (var visKey in rubiFpd.visitor) {
                                if (!rubiFpd.visitor.hasOwnProperty(visKey)) {
                                    continue;
                                }

                                if (!Utilities.isArray(rubiFpd.visitor[visKey], 'string')) {
                                    EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: property ' + visKey + ' of `firstPartyData.rubicon.visitor` must be an array of strings');

                                    return;
                                }
                            }
                        }

                        if (rubiFpd.hasOwnProperty('position') && !Utilities.isString(rubiFpd.position)) {
                            EventsService.emit('error', 'htSlotDemandObjs[' + i + ']: invalid first-party data: `firstPartyData.rubicon.position` must be a string');

                            return;
                        }
                    }
                }
            }

            receivedInfo = __directInterface.Layers.DirectBiddingLayer.retrieveDemand(htSlotDemandObjs);

            receivedInfo.promise
                //? if (FEATURES.IDENTITY) {
                .then(function (receivedDemand) {
                    return __directInterface.Layers.IdentityLayer.getResult()
                        .then(function (identityResult) {
                            //? if (RTI_SUPPRESS_LIST) {
                            for (var partner in __RTISupressList) {
                                if (!__RTISupressList.hasOwnProperty(partner)) {
                                    continue;
                                }
                                delete identityResult[__RTISupressList[partner]];
                            }
                            //? }
                            receivedDemand.identity = identityResult;

                            return receivedDemand;
                        });
                })
                //? }
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
    shellInterface.subscribeEvent = subscribeEvent;
    shellInterface.unsubscribeEvent = unsubscribeEvent;

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
