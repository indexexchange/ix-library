'use strict';

var GptHelper = require('gpt-helper.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Whoopsie = require('whoopsie.js');
var GptMapSlots = require('gpt-map-slots.js');
var GptClearTargeting = require('gpt-clear-targeting.js');
var GptSetTargeting = require('gpt-set-targeting.js');

var TimerService;
var EventsService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function GptRetrieveAndSetTargeting(configs, state, executeNext) {
    var __gptMapSlots;
    var __gptClearTargeting;
    var __gptSetTargeting;

    function retrieveAndSetTargeting(gSlotDemandObjs) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'array',
            items: {
                type: 'object',
                strict: true,
                properties: {
                    slot: {
                        type: 'any',
                        exec: function (schema, post) {
                            if (!GptHelper.isGSlot(post)) {
                                this.report('must be a google slot object');
                            }
                        }
                    },
                    firstPartyData: {
                        type: 'object',
                        optional: true
                    }
                }
            }
        }, gSlotDemandObjs);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var outParcels = __gptMapSlots.mapHtSlots(gSlotDemandObjs);

        if (outParcels.length === 0) {
            EventsService.emit('warning', 'no valid header tag slots found in call to retrieveDemand');

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
        Scribe.info('Requesting demand for ' + outParcels.length + ' outparcels');
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

            __gptClearTargeting.clearTargeting(outParcels);

            __gptSetTargeting.setTargeting(sessionId, receivedParcels);

            EventsService.emit('hs_session_end', {
                sessionId: sessionId
            });
        });
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        __gptMapSlots = GptMapSlots(configs, state);
        __gptClearTargeting = GptClearTargeting(configs, state);
        __gptSetTargeting = GptSetTargeting(configs, state);
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptRetrieveAndSetTargeting',
        //? }

        retrieveAndSetTargeting: retrieveAndSetTargeting
    };
}

module.exports = GptRetrieveAndSetTargeting;
