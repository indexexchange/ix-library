'use strict';

var GptHelper = require('gpt-helper.js');
var Prms = require('prms.js');
var Constants = require('constants.js');
var SpaceCamp = require('space-camp.js');
var Whoopsie = require('whoopsie.js');
var Utilities = require('utilities.js');
var GptMapSlots = require('gpt-map-slots.js');
var GptClearTargeting = require('gpt-clear-targeting.js');
var GptSetTargeting = require('gpt-set-targeting.js');

var TimerService;
var EventsService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function GptDisplay(configs, state, executeNext) {
    var __mapSlots;
    var __clearTargeting;
    var __setTargeting;
    var __gptDisplay;
    var __gptDisplayQueue;

    function __callGptDisplay(divOrSlot) {
        if (__gptDisplay) {
            return __gptDisplay(divOrSlot);
        }

        return window.googletag.display(divOrSlot);
    }

    function __processGptDisplay(session) {
        if (state.requestArchitecture === Constants.RequestArchitectures.SRA) {
            while (__gptDisplayQueue.length) {
                if (!__gptDisplayQueue[0].done) {
                    return;
                }
                var head = __gptDisplayQueue.shift();
                if (head.outParcels && !Utilities.isEmpty(head.outParcels)) {
                    __clearTargeting(head.outParcels);
                }

                if (head.parcels && !Utilities.isEmpty(head.parcels)) {
                    __setTargeting(head.sessionId, head.parcels);
                }
                __callGptDisplay(head.divOrSlot);
            }
        } else {
            if (session.outParcels && !Utilities.isEmpty(session.outParcels)) {
                __clearTargeting(session.outParcels);
            }

            if (session.parcels && !Utilities.isEmpty(session.parcels)) {
                __setTargeting(session.sessionId, session.parcels);
            }
            __callGptDisplay(session.divOrSlot);
        }
    }

    function display(divOrSlot) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                divOrSlot: {
                    type: 'any'
                }
            }
        }, {
            divOrSlot: divOrSlot
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }
        var session = {
            done: false,
            divOrSlot: divOrSlot,
            outParcels: null,
            parcels: null,
            sessionId: ''
        };

        if (state.requestArchitecture === Constants.RequestArchitectures.SRA) {
            __gptDisplayQueue.push(session);
        }

        var divId = null;
        if (GptHelper.isGSlot(divOrSlot)) {
            divId = divOrSlot.getSlotElementId();
        } else {
            divId = divOrSlot;
        }

        var gSlot = GptHelper.getGSlotByDivId(divId);

        if (!gSlot) {
            session.done = true;
            __processGptDisplay(session);

            return Prms.resolve();
        }

        var gSlots = [];
        if (state.requestArchitecture === Constants.RequestArchitectures.SRA) {
            gSlots = GptHelper.getGSlots();
        } else {
            gSlots = gSlot ? [gSlot] : [];
        }

        for (var i = gSlots.length - 1; i >= 0; i--) {
            if (state.gSlotDisplayHistory.hasOwnProperty(gSlots[i].getSlotElementId())) {
                gSlots.splice(i, 1);
            }
        }

        if (!gSlots.length) {
            session.done = true;
            __processGptDisplay(session);

            return Prms.resolve();
        }

        var gSlotDemandObjects = [];
        for (var j = 0; j < gSlots.length; j++) {
            gSlotDemandObjects.push({
                slot: gSlots[j]
            });
            state.gSlotDisplayHistory[gSlots[j].getSlotElementId()] = true;
        }

        if (state.initialLoadState === Constants.InitialLoadStates.DISABLED) {
            session.done = true;
            __processGptDisplay(session);

            return Prms.resolve();
        }

        var outParcels = __mapSlots(gSlotDemandObjects);
        session.outParcels = outParcels;
        if (!outParcels.length) {
            EventsService.emit('warning', 'No valid Header Tag slots found in call to display.');
            session.done = true;
            __processGptDisplay(session);

            return Prms.resolve();
        }

        var sessionId = TimerService.createTimer(state.globalTimeout, true);
        TimerService.addTimerCallback(sessionId, function () {
            EventsService.emit('global_timeout_reached', {
                sessionId: sessionId
            });
        });

        session.sessionId = sessionId;

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

            session.parcels = receivedParcels;
            session.done = true;
            __processGptDisplay(session);

            EventsService.emit('hs_session_end', {
                sessionId: sessionId
            });
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
            if (configs.override && configs.override.display) {
                __gptDisplay = SpaceCamp.LastLineGoogletag.display;
            }
        };
        SpaceCamp.initQueue.push(overrideGoogletag);

        __mapSlots = GptMapSlots(configs, state).mapHtSlots;
        __clearTargeting = GptClearTargeting(configs, state).clearTargeting;
        __setTargeting = GptSetTargeting(configs, state).setTargeting;
        __gptDisplayQueue = [];
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptDisplay',
        //? }

        display: display
    };
}

module.exports = GptDisplay;
