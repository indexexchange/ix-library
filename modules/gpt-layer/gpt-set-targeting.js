'use strict';

var GptHelper = require('gpt-helper.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

var EventsService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function GptSetTargeting(configs, state) {
    function setTargeting(sessionId, targetingParcels) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                sessionId: {
                    type: 'string',
                    minLength: 1
                },
                targetingParcels: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            targeting: {
                                optional: true,
                                type: 'object'
                            },
                            ref: {
                                type: 'any',
                                optional: true,
                                exec: function (schema, post) {
                                    if (!GptHelper.isGSlot(post) && post) {
                                        this.report('must be a google slot object');
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, {
            sessionId: sessionId,
            targetingParcels: targetingParcels
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var i = 0; i < targetingParcels.length; i++) {
            if (targetingParcels[i].pass) {
                continue;
            }

            if (!targetingParcels[i].targeting || Utilities.isEmpty(targetingParcels[i].targeting)) {
                continue;
            }

            if (targetingParcels[i].targetingType === 'slot') {
                EventsService.emit('hs_slot_kv_pushed', {
                    sessionId: sessionId,
                    statsId: targetingParcels[i].partnerStatsId,
                    htSlotId: targetingParcels[i].htSlot.getId(),
                    requestId: targetingParcels[i].requestId,
                    xSlotNames: [targetingParcels[i].xSlotName]
                });
            }

            //? if (DEBUG) {
            var keysSet = [];
            //? }

            var targeting = targetingParcels[i].targeting;

            var history;

            for (var key in targeting) {
                if (!targeting.hasOwnProperty(key)) {
                    continue;
                }

                if (targetingParcels[i].targetingType === 'page') {
                    history = state.pageDemandHistory;
                    history[key] = history[key] || {};
                    history[key] = true;

                    window.googletag.pubads().setTargeting(key, targeting[key]);

                    //? if (DEBUG) {
                    Scribe.info('Set page level targeting: ' + keysSet);
                    //? }
                } else {
                    var gSlot = targetingParcels[i].ref;
                    var gSlotDivId = gSlot.getSlotElementId();
                    history = state.gSlotDemandHistory;
                    history[gSlotDivId] = history[gSlotDivId] || {};
                    history[gSlotDivId][key] = true;
                    //? if (DEBUG) {
                    keysSet.push(key);
                    //? }

                    gSlot.setTargeting(key, gSlot.getTargeting(key).concat(targeting[key]));

                    //? if (DEBUG) {
                    Scribe.info('Set targeting for google slot ' + gSlotDivId + ': ' + keysSet);
                    //? }
                }
            }
        }
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;

        state.gSlotDemandHistory = state.gSlotDemandHistory || {};
        state.pageDemandHistory = state.pageDemandHistory || {};
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptSetTargeting',
        //? }

        setTargeting: setTargeting
    };
}

module.exports = GptSetTargeting;
