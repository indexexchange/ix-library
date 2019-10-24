'use strict';

var Browser = require('browser.js');
var CommandQueue = require('command-queue.js');
var Loader = require('loader.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var GptHelper = require('gpt-helper.js');

var ComplianceService;
var EventsService;

//? if (FEATURES.MULTIPLE_CONFIGS) {
var JsonPatch = require('jsonpatch-reduced.js');
//? }

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function PreGptShell() {

    var __configs;

    var __directInterface;

    var __fallbackShellInterface;

    var __pubads;

    var __validEvents = {
        error: 1,
        warning: 2,
        global_timeout_reached: 3,
        partner_instantiated: 4,
        partner_request_sent: 5,
        partner_request_complete: 6
    };

    function __callGptDisplay(divOrSlot) {
        if (SpaceCamp.LastLineGoogletag.display) {
            return SpaceCamp.LastLineGoogletag.display(divOrSlot);
        }

        return window.googletag.display(divOrSlot);
    }

    function __callGptRefresh(gSlots, options) {
        if (SpaceCamp.LastLineGoogletag.refresh) {
            return SpaceCamp.LastLineGoogletag.refresh(gSlots, options);
        }

        return window.googletag.pubads().refresh(gSlots, options);
    }

    function __callGptDestroySlots(gSlots) {
        if (SpaceCamp.LastLineGoogletag.destroySlots) {
            return SpaceCamp.LastLineGoogletag.destroySlots(gSlots);
        }

        return window.googletag.destroySlots(gSlots);
    }

    function __callGptEnableSingleRequest() {
        if (SpaceCamp.LastLineGoogletag.enableSingleRequest) {
            return SpaceCamp.LastLineGoogletag.enableSingleRequest();
        }

        return window.googletag.pubads().enableSingleRequest();
    }

    function __callGptDisableInitialLoad() {
        if (SpaceCamp.LastLineGoogletag.disableInitialLoad) {
            return SpaceCamp.LastLineGoogletag.disableInitialLoad();
        }

        return window.googletag.pubads().disableInitialLoad();
    }

    function display(divOrSlot) {
        try {
            if (!Utilities.isString(divOrSlot) && !GptHelper.isGSlot(divOrSlot)) {
                EventsService.emit('error', 'divOrSlot must be a string or valid gslot object');

                return __callGptDisplay(divOrSlot);
            }
            __directInterface.Layers.GptLayer.display(divOrSlot).catch(function (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occurred while displaying slot');
                Scribe.error(ex.stack);
                //? }

                EventsService.emit('error', ex);

                return __callGptDisplay(divOrSlot);
            });
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while displaying slot');
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);

            return __callGptDisplay(divOrSlot);
        }
    }

    function refresh(gSlots, options) {
        try {
            if (gSlots && !Utilities.isArray(gSlots)) {
                EventsService.emit('error', 'gSlots must be an array of g-slots.');

                return __callGptRefresh(gSlots, options);
            }

            __directInterface.Layers.GptLayer.refresh(gSlots, options).catch(function (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occurred while refreshing slot');
                Scribe.error(ex.stack);
                //? }

                EventsService.emit('error', ex);

                return __callGptRefresh(gSlots, options);
            });
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while refreshing slot');
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);

            return __callGptRefresh(gSlots, options);
        }
    }

    function destroySlots(gSlots, callback) {
        var isDestroyed = false;

        if (!callback && Utilities.isFunction(gSlots)) {
            callback = gSlots;
            gSlots = undefined;
        }

        try {
            if (gSlots && !Utilities.isArray(gSlots)) {
                EventsService.emit('error', 'gSlots must be an array of g-slots.');

                isDestroyed = __callGptDestroySlots(gSlots);
            } else {
                isDestroyed = __directInterface.Layers.GptLayer.destroySlots(gSlots);
            }

            if (Utilities.isFunction(callback)) {
                callback(isDestroyed);

                return isDestroyed;
            }
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while destroying slots');
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);

            isDestroyed = isDestroyed || __callGptDestroySlots(gSlots);

            if (Utilities.isFunction(callback)) {

                try {
                    callback(isDestroyed);

                    return isDestroyed;
                } catch (e) {
                    //? if (DEBUG) {
                    Scribe.error('Error occurred while in destroySlots callback');
                    Scribe.error(e.stack);
                    //? }

                    EventsService.emit('error', e);
                }
            }
        }

        return isDestroyed;
    }

    function enableSingleRequest() {
        try {
            return __directInterface.Layers.GptLayer.enableSingleRequest();
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred calling enableSingleRequest');
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);

            return __callGptEnableSingleRequest();
        }
    }

    function disableInitialLoad() {
        try {
            return __directInterface.Layers.GptLayer.disableInitialLoad();
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred calling disableInitialLoad');
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);

            return __callGptDisableInitialLoad();
        }
    }

    function pubads() {
        return __pubads;
    }

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
            //? if (DEBUG) {
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);
        }
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
        var identityInfo = {};
        //? if (FEATURES.IDENTITY) {

        //? if (DEBUG) {
        if (__directInterface.Layers.hasOwnProperty('IdentityLayer')) {
        //? }
            identityInfo = __directInterface.Layers.IdentityLayer.getIdentityResults();
        //? if (DEBUG) {
        }
        //? }
        //? }

        return identityInfo;
    }

    (function __constructor() {
        SpaceCamp.LastLineGoogletag = {};

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

            window.googletag = window.googletag || {};
            window.googletag.cmd = window.googletag.cmd || [];

            __directInterface = Loader(__configs).getDirectInterface();

            ComplianceService = SpaceCamp.services.ComplianceService;
            EventsService = SpaceCamp.services.EventsService;

            var override = __configs.Layers[0].configs.override;
            if (override) {

                var makeLastLine = function () {

                    if (override.display) {
                        SpaceCamp.LastLineGoogletag.display = window.googletag.display;
                        window.googletag.display = ComplianceService.delay(display);
                    }

                    if (override.refresh) {
                        SpaceCamp.LastLineGoogletag.refresh = window.googletag.pubads().refresh.bind(window.googletag.pubads());
                        window.googletag.pubads().refresh = ComplianceService.delay(refresh);
                    }

                    if (override.destroySlots) {
                        SpaceCamp.LastLineGoogletag.destroySlots = window.googletag.destroySlots;
                        window.googletag.destroySlots = ComplianceService.delay(destroySlots);
                    }

                    if (override.enableSingleRequest) {
                        SpaceCamp.LastLineGoogletag.enableSingleRequest = window.googletag.pubads().enableSingleRequest.bind(window.googletag.pubads());
                        window.googletag.pubads().enableSingleRequest = enableSingleRequest;
                    }

                    if (override.disableInitialLoad) {
                        SpaceCamp.LastLineGoogletag.disableInitialLoad = window.googletag.pubads().disableInitialLoad.bind(window.googletag.pubads());
                        window.googletag.pubads().disableInitialLoad = disableInitialLoad;
                    }
                };

                SpaceCamp.initQueue.unshift(makeLastLine);

                var runInitQueue = function () {
                    SpaceCamp.initQueue = CommandQueue(SpaceCamp.initQueue);
                };

                if (Utilities.isArray(window.googletag.cmd)) {
                    window.googletag.cmd.unshift(runInitQueue);
                } else {

                    window.googletag.cmd.push(runInitQueue);
                }
            }

            __pubads = {
                refresh: ComplianceService.delay(refresh),
                enableSingleRequest: enableSingleRequest,
                disableInitialLoad: disableInitialLoad
            };

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
            Scribe.error('Error occurred trying to load modules. Defaulting to GPT.');
            Scribe.error(ex);
            Scribe.error(ex.stack);
            //? }

            __fallbackShellInterface = {
                display: __callGptDisplay,
                destroySlots: __callGptDestroySlots,
                pubads: function () {
                    return {
                        refresh: __callGptRefresh,
                        enableSingleRequest: __callGptEnableSingleRequest,
                        disableInitialLoad: __callGptDisableInitialLoad
                    };
                },
                setFirstPartyData: function () {},
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
    shellInterface.__type__ = 'PreGptShell';
    //? }

    shellInterface.display = ComplianceService.delay(display);
    shellInterface.refresh = ComplianceService.delay(refresh);
    shellInterface.destroySlots = ComplianceService.delay(destroySlots);
    shellInterface.enableSingleRequest = enableSingleRequest;
    shellInterface.disableInitialLoad = disableInitialLoad;
    shellInterface.pubads = pubads;
    shellInterface.setFirstPartyData = setFirstPartyData;
    shellInterface.subscribeEvent = subscribeEvent;
    shellInterface.unsubscribeEvent = unsubscribeEvent;
    shellInterface.apiReady = true;
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

window[SpaceCamp.NAMESPACE] = PreGptShell();
window[SpaceCamp.NAMESPACE].cmd = CommandQueue(cmd);

//? } else {

module.exports = PreGptShell;

//? }
