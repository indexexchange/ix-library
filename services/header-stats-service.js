'use strict';

var Browser = require('browser.js');
var Cache = require('cache.js');
var NormalDistributionTimeoutModule = require('normal-distribution-timeout-module.js');
var Network = require('network.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

var EventsService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var ConfigValidators = require('config-validators.js');
var Scribe = require('scribe.js');
//? }

function HeaderStats(config) {

    if (!Network.isXhrSupported()) {
        //? if (DEBUG) {
        Scribe.warn('Headerstats requires AJAX support. Aborting instantiation.');
        //? }

        return null;
    }

    var SessionStates = {
        IPR: 0,
        DONE: 1,
        SENT: 2
    };

    var __baseUrl;

    var __siteId;

    var __configId;

    var __options;

    var __instanceId;

    var __pageStartTime;

    var __requestStartTimes;

    var __sessionStartTimes;

    var __auctionCycleTimes;

    var __pageEvents;

    var __slotStats;

    var __akamaiDebugInfo;

    var __sessionStates;

    var __globalTimeouts;

    var __sessionTypes;

    //? if (PRODUCT !== 'IdentityLibrary') {

    var __partnerTimeouts;

    var __requestTimedOut;

    var __userUnknownSessions;
    //? }

    //? if (FEATURES.IDENTITY) {

    var __identityEvents;

    //? if (PRODUCT !== 'IdentityLibrary') {

    var __identityTimeout;

    var __identityPartnerTimeoutSent;
    //? }

    var __identityStartTimes;

    var __identityFirstEvent;

    var __identityTimedOut;
    //? }

    function __getShortEventName(eventName) {
        var eventNameMap = {
            auction_cycle: 'ac',
            global_timeout: 'gt',
            bid_requests: 'brq',
            bid_responses: 'brs',
            bid_errors: 'be',
            bid_passes: 'bp',
            bid_timeouts: 'bt',
            dfp_kv_pushed: 'kv',
            top_bid: 'tb',
            prefetch: 'p',
            res_latency: 'rl',
            partner_timeout: 'pt'
        };

        if (!eventNameMap.hasOwnProperty(eventName)) {
            return eventName;
        }

        return eventNameMap[eventName];
    }

    //? if (FEATURES.IDENTITY) {
    function __transformIdentityStats() {
        if (Utilities.isEmpty(__identityEvents)) {
            return [];
        }

        var identitySlotObj = {
            s: 'identity',
            t: __identityFirstEvent,
            xslots: {}
        };

        for (var statsId in __identityEvents) {
            if (!__identityEvents.hasOwnProperty(statsId)) {
                continue;
            }

            if (!identitySlotObj.xslots.hasOwnProperty(statsId)) {
                identitySlotObj.xslots[statsId] = {};
            }

            for (var i = 0; i < __identityEvents[statsId].length; i++) {
                var eventObj = __identityEvents[statsId][i];
                if (eventObj.n === 'bid_requests' || eventObj.n === 'res_latency') {
                    eventObj.v = String(eventObj.v);
                }

                if (!identitySlotObj.xslots[statsId].hasOwnProperty(eventObj.x)) {
                    identitySlotObj.xslots[statsId][eventObj.x] = {};
                }

                var abbreviatedName = __getShortEventName(eventObj.n);

                identitySlotObj.xslots[statsId][eventObj.x][abbreviatedName] = eventObj.v;
            }

            //? if (PRODUCT !== 'IdentityLibrary') {
            if (!__identityPartnerTimeoutSent.hasOwnProperty(statsId) || __identityPartnerTimeoutSent[statsId] === false) {
                identitySlotObj.xslots[statsId].before[__getShortEventName('partner_timeout')] = __identityTimeout;
                __identityPartnerTimeoutSent[statsId] = true;
            }
            //? }
        }

        __identityEvents = {};

        return [identitySlotObj];
    }

    function __recordIdentityEvent(eventName, data) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                eventName: {
                    type: 'string',
                    minLength: 1
                },
                data: {
                    type: 'object',
                    strict: true,
                    properties: {
                        statsId: {
                            type: 'string',
                            minLength: 1
                        }
                    }
                }
            }
        }, {
            eventName: eventName,
            data: data
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (Utilities.isEmpty(__identityEvents)) {
            __identityFirstEvent = System.now();
        }

        var statsId = data.statsId;
        __identityEvents[statsId] = __identityEvents[statsId] || [];

        var identityEvent = {
            b: statsId,
            x: __identityTimedOut ? 'after' : 'before'
        };

        if (eventName === 'hs_identity_request') {
            identityEvent.n = 'bid_requests';
            identityEvent.v = 1;
            __identityStartTimes[statsId] = System.now();
        } else if (eventName === 'hs_identity_cached') {
            identityEvent.n = 'bid_requests';
            identityEvent.v = 0;
        } else if (eventName === 'hs_identity_response') {
            identityEvent.n = 'bid_responses';
            identityEvent.v = 1;
        } else if (eventName === 'hs_identity_error') {
            identityEvent.n = 'bid_errors';
            identityEvent.v = 1;
        } else if (eventName === 'hs_identity_pass') {
            identityEvent.n = 'bid_passes';
            identityEvent.v = 1;
        } else if (eventName === 'hs_identity_timeout') {
            identityEvent.n = 'bid_timeouts';
            identityEvent.v = 1;
        } else if (eventName === 'hs_identity_bid_latency') {
            identityEvent.n = 'res_latency';
            identityEvent.v = System.now() - __identityStartTimes[statsId];
        }

        //? if (DEBUG) {
        if (!identityEvent.n) {
            Scribe.error('Unhandled Identity stats event `' + eventName + '`');
        }
        //? }

        __identityEvents[statsId].push(identityEvent);
    }
    //? }

    //? if (PRODUCT !== 'IdentityLibrary') {

    function __transformDataStats(sessionId, stats) {
        if (!__userUnknownSessions.hasOwnProperty(sessionId) || Utilities.isEmpty(stats)) {
            return [];
        }

        var eventsWhitelist = [
            'bid_requests',
            'bid_responses',
            'bid_errors',
            'bid_passes',
            'bid_timeouts'
        ];

        var dataSlotObj = {
            s: 'data',
            t: System.now(),
            xslots: {
                UNKN: {}
            }
        };

        for (var htSlotId in stats) {
            if (!stats.hasOwnProperty(htSlotId)) {
                continue;
            }

            var htSlotStats = stats[htSlotId];

            for (var statsId in htSlotStats.events) {
                if (!htSlotStats.events.hasOwnProperty(statsId)) {
                    continue;
                }

                for (var eventName in htSlotStats.events[statsId]) {
                    if (!htSlotStats.events[statsId].hasOwnProperty(eventName)) {
                        continue;
                    }

                    if (eventsWhitelist.indexOf(eventName) === -1) {
                        continue;
                    }

                    for (var xSlotName in htSlotStats.events[statsId][eventName]) {
                        if (!htSlotStats.events[statsId][eventName].hasOwnProperty(xSlotName)) {
                            continue;
                        }

                        var xSlotStat = htSlotStats.events[statsId][eventName][xSlotName];
                        var eventValue = xSlotStat.v;
                        var abbreviatedName = __getShortEventName(eventName);

                        if (!dataSlotObj.xslots.UNKN.hasOwnProperty(xSlotName)) {
                            dataSlotObj.xslots.UNKN[xSlotName] = {};
                            dataSlotObj.xslots.UNKN[xSlotName][__getShortEventName('res_latency')] = __globalTimeouts[sessionId];
                        }

                        if (!dataSlotObj.xslots.UNKN[xSlotName].hasOwnProperty(abbreviatedName)) {
                            dataSlotObj.xslots.UNKN[xSlotName][abbreviatedName] = 0;
                        }

                        dataSlotObj.xslots.UNKN[xSlotName][abbreviatedName] += eventValue;
                    }
                }
            }
        }

        return [dataSlotObj];
    }

    function __transformSlotStats(sessionId, stats) {
        var slotStats = [];
        var xSlotName = '';
        var statsId = '';

        for (var htSlotId in stats) {
            if (!stats.hasOwnProperty(htSlotId)) {
                continue;
            }

            var htSlotStats = stats[htSlotId];
            var slotObj = {
                s: htSlotStats.s,
                t: htSlotStats.t,
                xslots: {}
            };

            for (statsId in htSlotStats.events) {
                if (!htSlotStats.events.hasOwnProperty(statsId)) {
                    continue;
                }

                for (var eventName in htSlotStats.events[statsId]) {
                    if (!htSlotStats.events[statsId].hasOwnProperty(eventName)) {
                        continue;
                    }

                    for (xSlotName in htSlotStats.events[statsId][eventName]) {
                        if (!htSlotStats.events[statsId][eventName].hasOwnProperty(xSlotName)) {
                            continue;
                        }

                        var xSlotStat = htSlotStats.events[statsId][eventName][xSlotName];
                        var eventValue = xSlotStat.v;
                        var abbreviatedName = __getShortEventName(eventName);

                        if (xSlotStat.n === 'res_latency') {
                            xSlotStat.v = String(xSlotStat.v);
                        }

                        if (!slotObj.xslots.hasOwnProperty(statsId)) {
                            slotObj.xslots[statsId] = {};
                        }

                        if (!slotObj.xslots[statsId].hasOwnProperty(xSlotName)) {
                            slotObj.xslots[statsId][xSlotName] = {};
                        }

                        slotObj.xslots[statsId][xSlotName][abbreviatedName] = eventValue;
                    }
                }

                for (xSlotName in slotObj.xslots[statsId]) {
                    if (!slotObj.xslots[statsId].hasOwnProperty(xSlotName)) {
                        continue;
                    }

                    if (__partnerTimeouts.hasOwnProperty(statsId)) {
                        slotObj.xslots[statsId][xSlotName][__getShortEventName('partner_timeout')] = __partnerTimeouts[statsId];
                    }
                }
            }

            slotStats.push(slotObj);
        }

        //? if (DEBUG) {
        slotStats.map(function (slotStat) {
            var requestCounts = {};

            for (statsId in slotStat.xslots) {
                if (!slotStat.xslots.hasOwnProperty(statsId)) {
                    continue;
                }

                requestCounts[statsId] = requestCounts[statsId] || {};

                for (var xSlotName in slotStat.xslots[statsId]) {
                    if (!slotStat.xslots[statsId].hasOwnProperty(xSlotName)) {
                        continue;
                    }

                    for (var eventName in slotStat.xslots[statsId][xSlotName]) {
                        if (!slotStat.xslots[statsId][xSlotName].hasOwnProperty(eventName)) {
                            continue;
                        }
                        requestCounts[statsId][eventName] = requestCounts[statsId][eventName] || 0;
                        requestCounts[statsId][eventName]
                            += typeof slotStat.xslots[statsId][xSlotName][eventName] === 'number' ? slotStat.xslots[statsId][xSlotName][eventName] : 1;
                    }
                }
            }

            for (statsId in requestCounts) {
                if (!requestCounts.hasOwnProperty(statsId)) {
                    continue;
                }

                var bidRequests = requestCounts[statsId][__getShortEventName('bid_requests')] || 0;

                var bidResponses = requestCounts[statsId][__getShortEventName('bid_responses')] || 0;
                var bidPasses = requestCounts[statsId][__getShortEventName('bid_passes')] || 0;
                var bidTimeouts = requestCounts[statsId][__getShortEventName('bid_timeouts')] || 0;
                var bidErrors = requestCounts[statsId][__getShortEventName('bid_errors')] || 0;

                var bidIn = bidResponses + bidPasses + bidTimeouts + bidErrors;

                if (bidRequests !== bidIn) {
                    Scribe.error('Request discepancy for "' + statsId + '", ' + bidRequests + ' out vs. ' + bidIn + ' in:');
                    Scribe.error(JSON.stringify(requestCounts[statsId], null, 4));
                }
            }
        });
        //? }

        return slotStats;
    }
    //? }

    function __sendStats(sessionId) {

        if (!__sessionStates.hasOwnProperty(sessionId)) {
            //? if (DEBUG){
            Scribe.error('Cannot send stats for sessionId ' + sessionId + ' because it does not exist.');
            //? }

            return;
        }

        if (__sessionStates[sessionId] === SessionStates.IPR) {
            //? if (DEBUG){
            Scribe.error('Cannot send stats for sessionId ' + sessionId + ' because it is still in progress.');
            //? }

            return;
        }

        if (__sessionStates[sessionId] === SessionStates.SENT) {
            //? if (DEBUG){
            Scribe.error('Cannot send stats for sessionId ' + sessionId + ' because it has already been sent.');
            //? }

            return;
        }

        var bodyObject = {
            p: __sessionTypes[sessionId],
            d: SpaceCamp.DeviceTypeChecker.getDeviceType(),
            c: __configId,
            s: sessionId,
            w: __instanceId,
            t: System.now(),
            pg: {
                t: __pageStartTime,
                e: __pageEvents[sessionId]
            }
        };
        //? if (PRODUCT !== 'IdentityLibrary') {
        bodyObject[__getShortEventName('global_timeout')] = String(__globalTimeouts[sessionId]);
        //? }
        if (__options.auctionCycle) {
            bodyObject.ac = __auctionCycleTimes[sessionId];
        }

        //? if (PRODUCT === 'IdentityLibrary') {
        bodyObject.sl = __transformIdentityStats();
        //? } else if (FEATURES.IDENTITY) {
        bodyObject.sl = Utilities.mergeArrays(
            __transformSlotStats(sessionId, __slotStats[sessionId]),
            __transformDataStats(sessionId, __slotStats[sessionId]),
            __transformIdentityStats()
        );
        //? } else {
        bodyObject.sl = Utilities.mergeArrays(
            __transformSlotStats(sessionId, __slotStats[sessionId]),
            __transformDataStats(sessionId, __slotStats[sessionId])
        );
        //? }

        bodyObject.akamaiDebugInfo = __akamaiDebugInfo[sessionId];

        delete __akamaiDebugInfo[sessionId];
        delete __pageEvents[sessionId];
        delete __slotStats[sessionId];

        //? if (PRODUCT !== 'IdentityLibrary') {
        delete __globalTimeouts[sessionId];
        delete __userUnknownSessions[sessionId];
        delete __sessionTypes[sessionId];
        //? }

        var url = Network.buildUrl(__baseUrl, null, {
            s: __siteId,
            u: Browser.getPageUrl(),
            v: 3
        });

        //? if (DEBUG) {
        Scribe.info('Sending HeaderStats request for session "' + sessionId + '"');
        //? }

        Network.ajax({
            method: 'POST',
            url: url,
            data: bodyObject
        });

        __sessionStates[sessionId] = SessionStates.SENT;
    }
    //? if (PRODUCT !== 'IdentityLibrary') {

    function __recordPartnerEvent(eventName, data) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                eventName: {
                    type: 'string',
                    minLength: 1
                },
                data: {
                    type: 'object',
                    strict: true,
                    properties: {
                        sessionId: {
                            type: 'string',
                            minLength: 1
                        },
                        statsId: {
                            type: 'string',
                            minLength: 1
                        },
                        htSlotId: {
                            type: 'string',
                            minLength: 1
                        },
                        xSlotNames: {
                            type: 'array',
                            items: {
                                type: 'string',
                                minLength: 1
                            }
                        },
                        requestId: {
                            optional: true,
                            type: 'string'
                        }
                    }
                }
            }
        }, {
            eventName: eventName,
            data: data
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var sessionId = data.sessionId;
        var htSlotId = data.htSlotId;
        var statsId = data.statsId;
        var xSlotNames = data.xSlotNames;
        var requestId = data.requestId || '';

        if (!__sessionStates.hasOwnProperty(sessionId)) {
            //? if (DEBUG){
            Scribe.error('Cannot record event ' + eventName + ' for sessionId ' + sessionId + ' because it does not exist.');
            //? }

            return;
        }

        if (__sessionStates[sessionId] === SessionStates.DONE) {
            //? if (DEBUG){
            Scribe.error('Cannot record event ' + eventName + ' for sessionId ' + sessionId + ' because it has already been completed.');
            //? }

            return;
        }

        if (__sessionStates[sessionId] === SessionStates.SENT) {
            //? if (DEBUG){
            Scribe.error('Cannot record event ' + eventName + ' for sessionId ' + sessionId + ' because it has already been sent.');
            //? }

            return;
        }

        if (!__slotStats[sessionId].hasOwnProperty(htSlotId)) {
            __slotStats[sessionId][htSlotId] = {
                s: htSlotId,
                t: System.now(),
                events: {}
            };
        }

        if (!__slotStats[sessionId][htSlotId].events.hasOwnProperty(statsId)) {
            __slotStats[sessionId][htSlotId].events[statsId] = {};
        }

        if (!__slotStats[sessionId][htSlotId].events[statsId].hasOwnProperty(eventName)) {
            __slotStats[sessionId][htSlotId].events[statsId][eventName] = {};
        }

        var currentStatEvent = __slotStats[sessionId][htSlotId].events[statsId][eventName];

        for (var i = 0; i < xSlotNames.length; i++) {
            var xSlotName = xSlotNames[i];
            var requestKey = sessionId + statsId + htSlotId + xSlotName + requestId;

            if (__requestTimedOut[requestKey]) {
                continue;
            }

            if (eventName === 'bid_timeouts') {
                __requestTimedOut[requestKey] = true;
            }

            if (!currentStatEvent.hasOwnProperty(xSlotName)) {
                currentStatEvent[xSlotName] = {
                    n: eventName,
                    v: 0,
                    b: statsId,
                    x: xSlotName
                };
            }
            var xSlotStats = currentStatEvent[xSlotName];

            if (eventName === 'res_latency') {
                var latency = System.now() - __requestStartTimes[requestKey];

                delete __requestStartTimes[requestKey];
                if (!xSlotStats.v || xSlotStats.v > latency) {
                    xSlotStats.v = latency;
                }
            } else if (eventName === 'prefetch') {
                xSlotStats.v = 1;
            } else {
                xSlotStats.v++;
            }

            if (eventName === 'bid_requests') {
                __requestStartTimes[requestKey] = System.now();
            } else if (eventName === 'bid_responses') {
                EventsService.emit('hs_slot_valid_bid_latency', data);
            }
        }
    }
    //? }

    var __eventHandlers = {
        hs_session_start: function (data) {
            //? if (DEBUG){
            var results = Inspector.validate({
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        minLength: 1
                    },
                    //? if (PRODUCT !== 'IdentityLibrary') {
                    timeout: {
                        type: 'number',
                        gt: 0
                    },
                    sessionType: {
                        type: 'string',
                        minLength: 1
                    }
                    //? }
                }
            }, data);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var sessionId = data.sessionId;

            if (!__sessionStates.hasOwnProperty(sessionId)) {
                __sessionStates[sessionId] = SessionStates.IPR;
                __sessionStartTimes[sessionId] = System.now();
                __pageEvents[sessionId] = [];
                __slotStats[sessionId] = {};
                __sessionTypes[sessionId] = HeaderStats.SessionTypes.DISPLAY;

                //? if (PRODUCT !== 'IdentityLibrary') {
                __sessionTypes[sessionId] = data.sessionType;
                __globalTimeouts[sessionId] = data.timeout;
                //? }
            } else {
                //? if (DEBUG){
                if (__sessionStates[sessionId] === SessionStates.IPR) {
                    Scribe.error('Session ' + sessionId + ' already started.');
                } else {
                    Scribe.warn('Session ' + sessionId + ' already finished.');
                }
                //? }
            }

            //? if (PRODUCT !== 'IdentityLibrary') {

            var adaptiveTimeoutData = Cache.getData(NormalDistributionTimeoutModule.STORAGE_KEY_NAME);
            if (adaptiveTimeoutData === null
                || !adaptiveTimeoutData.hasOwnProperty('prt')
                || !Utilities.isArray(adaptiveTimeoutData.prt)
                || adaptiveTimeoutData.prt.length === 0) {
                __userUnknownSessions[sessionId] = true;
            }
            //? }
        },
        hs_session_end: function (data) {
            //? if (DEBUG){
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    sessionId: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }, data);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var sessionId = data.sessionId;

            if (!__sessionStates.hasOwnProperty(sessionId)) {
                //? if (DEBUG) {
                Scribe.error('Session ' + sessionId + ' cannot be ended because it does not exist.');
                //? }

                return;
            }

            if (__sessionStates[sessionId] === SessionStates.DONE) {
                //? if (DEBUG) {
                Scribe.error('Session ' + sessionId + ' has already been ended.');
                //? }

                return;
            }

            __auctionCycleTimes[sessionId] = String(System.now() - __sessionStartTimes[sessionId]);

            delete __sessionStartTimes[sessionId];

            setTimeout(function () {

                __sessionStates[sessionId] = SessionStates.DONE;

                __sendStats(sessionId);
            }, 0);
        },
        hs_akamai_debug: function (data) {
            //? if (DEBUG){
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    sessionId: {
                        type: 'string',
                        minLength: 1
                    },
                    hostname: {
                        type: 'string',
                        minLength: 1
                    },
                    requestHost: {
                        optional: true,
                        type: 'string',
                        minLength: 1
                    },
                    akamaiPresent: {
                        optional: true,
                        type: 'string',
                        exactLength: 1
                    }
                }
            }, data);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var sessionId = data.sessionId;

            __akamaiDebugInfo[sessionId] = {};
            __akamaiDebugInfo[sessionId].hostname = data.hostname;

            if (data.hasOwnProperty('requestHost')) {
                __akamaiDebugInfo[sessionId].requestHost = data.requestHost;
            }

            if (data.hasOwnProperty('akamaiPresent')) {
                __akamaiDebugInfo[sessionId].akamaiPresent = data.akamaiPresent;
            }
        //? if (PRODUCT !== 'IdentityLibrary') {
        },
        hs_slot_request: function (data) {
            __recordPartnerEvent('bid_requests', data);
        },
        hs_slot_bid: function (data) {
            __recordPartnerEvent('bid_responses', data);
        },
        hs_slot_pass: function (data) {
            __recordPartnerEvent('bid_passes', data);
        },
        hs_slot_timeout: function (data) {
            __recordPartnerEvent('bid_timeouts', data);
        },
        hs_slot_error: function (data) {
            __recordPartnerEvent('bid_errors', data);
        },
        hs_slot_highest_bid: function (data) {
            __recordPartnerEvent('top_bid', data);
        },
        hs_slot_valid_bid_latency: function (data) {
            __recordPartnerEvent('res_latency', data);
        },
        hs_slot_kv_pushed: function (data) {
            __recordPartnerEvent('dfp_kv_pushed', data);
        },
        hs_slot_prefetch: function (data) {
            __recordPartnerEvent('prefetch', data);
        },
        hs_define_partner_timeout: function (data) {
            //? if (DEBUG){
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    statsId: {
                        type: 'string',
                        minLength: 1
                    },
                    timeout: {
                        type: 'integer'
                    }
                }
            }, data);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            __partnerTimeouts[data.statsId] = String(data.timeout);
        //? }
        //? if (FEATURES.IDENTITY) {
        },
        hs_identity_request: function (data) {
            __recordIdentityEvent('hs_identity_request', data);
        },
        hs_identity_cached: function (data) {
            __recordIdentityEvent('hs_identity_cached', data);
        },
        hs_identity_response: function (data) {
            __recordIdentityEvent('hs_identity_response', data);
            EventsService.emit('hs_identity_bid_latency', data);
        },
        hs_identity_error: function (data) {
            __recordIdentityEvent('hs_identity_error', data);
            EventsService.emit('hs_identity_bid_latency', data);
        },
        hs_identity_pass: function (data) {
            __recordIdentityEvent('hs_identity_pass', data);
            EventsService.emit('hs_identity_bid_latency', data);
        },
        hs_identity_bid_latency: function (data) {
            if (Utilities.isNumber(__identityStartTimes[data.statsId])) {
                __recordIdentityEvent('hs_identity_bid_latency', data);
            }
        },
        hs_identity_timeout: function (data) {
            __recordIdentityEvent('hs_identity_timeout', data);
            __identityTimedOut = true;
        },
        hs_define_identity_timeout: function (data) {
            //? if (DEBUG){
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    timeout: {
                        type: 'integer',
                        gte: 0
                    }
                }
            }, data);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            //? if (PRODUCT !== 'IdentityLibrary') {
            __identityTimeout = String(data.timeout);
            //? }

        //? }
        }
    };

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;

        //? if (DEBUG){
        var results = ConfigValidators.HeaderStatsService(config);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __pageStartTime = System.now();
        __baseUrl = 'https://as-sec.casalemedia.com/headerstats';

        __siteId = config.siteId;
        __configId = config.configId;
        __options = config.options;

        __instanceId = __siteId + System.now();
        __instanceId = __instanceId + System.generateUniqueId(32 - __instanceId.length);

        SpaceCamp.instanceId = __instanceId;

        __sessionStates = {};
        __pageEvents = {};
        __slotStats = {};
        __akamaiDebugInfo = {};
        __requestStartTimes = {};
        __sessionStartTimes = {};
        __auctionCycleTimes = {};
        __sessionTypes = {};

        //? if (PRODUCT !== 'IdentityLibrary') {
        __globalTimeouts = {};
        __partnerTimeouts = {};
        __requestTimedOut = {};
        __userUnknownSessions = {};
        //? }

        //? if (FEATURES.IDENTITY) {
        __identityEvents = {};
        __identityStartTimes = {};
        __identityTimedOut = false;
        //? if (PRODUCT !== 'IdentityLibrary') {
        __identityPartnerTimeoutSent = {};
        //? }
        //? }

        for (var eventName in __eventHandlers) {
            if (!__eventHandlers.hasOwnProperty(eventName)) {
                continue;
            }
            SpaceCamp.services.EventsService.on(eventName, __eventHandlers[eventName]);
        }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'HeaderStatsService',
        //? }

        //? if (TEST) {
        __pageEvents: __pageEvents,
        __slotStats: __slotStats,
        __requestStartTimes: __requestStartTimes,
        __sessionStates: __sessionStates,
        __identityEvents: __identityEvents,
        __akamaiDebugInfo: __akamaiDebugInfo,
        //? }

        //? if (TEST) {
        __recordIdentityEvent: __recordIdentityEvent,
        __transformIdentityStats: __transformIdentityStats
        //? }

    };
}

HeaderStats.SessionTypes = {
    DISPLAY: 'display',
    VIDEO: 'video'
};

module.exports = HeaderStats;