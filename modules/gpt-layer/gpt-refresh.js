'use strict';

var GptHelper = require('gpt-helper.js');
var SpaceCamp = require('space-camp.js');
var Whoopsie = require('whoopsie.js');
var GptMapSlots = require('gpt-map-slots.js');
var GptClearTargeting = require('gpt-clear-targeting.js');
var GptSetTargeting = require('gpt-set-targeting.js');
var Constants = require('constants.js');
var Prms = require('prms.js');

var TimerService;
var EventsService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function GptRefresh(configs, state, executeNext) {
    var __mapSlots;
    var __clearTargeting;
    var __setTargeting;
    var __gptRefresh;

    function __callGptRefresh(gSlots, options) {
        if (__gptRefresh) {
            return __gptRefresh(gSlots, options);
        }

        return window.googletag.pubads().refresh(gSlots, options);
    }

    function refresh(gSlots, options) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                gSlots: {
                    type: 'array',
                    optional: true
                },
                options: {
                    type: 'object',
                    optional: true
                }
            }
        }, {
            gSlots: gSlots,
            options: options
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!gSlots) {
            gSlots = GptHelper.getGSlots();
        }

        var unfilteredGSlots = gSlots.slice();

        for (var i = gSlots.length - 1; i >= 0; i--) {
            if (!GptHelper.isGSlot(gSlots[i])) {
                gSlots.splice(i, 1);
            }
        }

        if (state.requestArchitecture === Constants.RequestArchitectures.MRA) {
            for (var j = gSlots.length - 1; j >= 0; j--) {
                if (!state.gSlotDisplayHistory.hasOwnProperty(gSlots[j].getSlotElementId())) {
                    gSlots.splice(j, 1);
                }
            }
        }

        if (!gSlots.length) {
            __callGptRefresh(unfilteredGSlots, options);

            return Prms.resolve();
        }

        var gSlotDemandObjects = [];
        for (var k = 0; k < gSlots.length; k++) {
            gSlotDemandObjects.push({
                slot: gSlots[k]
            });
            state.gSlotDisplayHistory[gSlots[k].getSlotElementId()] = true;
        }

        var outParcels = __mapSlots(gSlotDemandObjects);
        if (!outParcels.length) {
            EventsService.emit('warning', 'No valid Header Tag slots found in call to refresh.');
            __callGptRefresh(unfilteredGSlots, options);

            return Prms.resolve();
        }

        var sessionId = TimerService.createTimer(state.globalTimeout, true);
        TimerService.addTimerCallback(sessionId, function () {
            EventsService.emit('global_timeout_reached', {
                sessionId: sessionId
            });
        });

        EventsService.emit('hs_session_start', {
            sessionId: sessionId
        });

        //? if (DEBUG) {
        Scribe.info('Requesting demand for ' + outParcels.length + ' parcels');
        //? }

        return executeNext(sessionId, outParcels).then(function (receivedParcels) {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        targeting: {
                            optional: true,
                            type: 'object'
                        },
                        width: {
                            optional: true,
                            type: 'number',
                            gt: 0
                        },
                        height: {
                            optional: true,
                            type: 'number',
                            gt: 0
                        },
                        price: {
                            optional: true,
                            type: 'number'
                        },
                        adm: {
                            optional: true,
                            type: 'string'
                        },
                        pass: {
                            optional: true,
                            type: 'boolean'
                        },
                        htSlot: {
                            optional: true,
                            type: 'object'
                        }
                    }
                }
            }, receivedParcels);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            //? if (DEBUG) {
            Scribe.info('Received ' + receivedParcels.length + ' parcels');
            //? }

            __clearTargeting(outParcels);
            __setTargeting(sessionId, receivedParcels);

            EventsService.emit('hs_session_end', {
                sessionId: sessionId
            });

            __callGptRefresh(unfilteredGSlots, options);
        });
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        if (!state.hasOwnProperty('gSlotDisplayHistory')) {
            state.gSlotDisplayHistory = {};
        }

        if (!state.hasOwnProperty('requestArchitecture')) {
            state.requestArchitecture = Constants.RequestArchitectures.MRA;
        }

        if (!state.hasOwnProperty('initialLoadState')) {
            state.initialLoadState = Constants.InitialLoadStates.ENABLED;
        }

        var overrideGoogletag = function () {
            if (configs.override && configs.override.refresh) {
                __gptRefresh = SpaceCamp.LastLineGoogletag.refresh;
            }
        };
        SpaceCamp.initQueue.push(overrideGoogletag);

        __mapSlots = GptMapSlots(configs, state).mapHtSlots;
        __clearTargeting = GptClearTargeting(configs, state).clearTargeting;
        __setTargeting = GptSetTargeting(configs, state).setTargeting;
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptRefresh',
        //? }

        refresh: refresh
    };
}

module.exports = GptRefresh;
