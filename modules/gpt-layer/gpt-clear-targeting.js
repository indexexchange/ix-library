'use strict';

var GptHelper = require('gpt-helper.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function GptClearTargeting(configs, state) {

    function clearTargeting(targetingParcels) {
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
        }, targetingParcels);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var history;

        history = state.pageDemandHistory;

        for (var pageKey in history) {
            if (!history.hasOwnProperty(pageKey)) {
                continue;
            }

            window.googletag.pubads().clearTargeting(pageKey);

            delete history[pageKey];
        }

        history = state.gSlotDemandHistory;

        for (var i = 0; i < targetingParcels.length; i++) {
            if (targetingParcels[i].ref) {
                var gSlot = targetingParcels[i].ref;
                var gSlotDivId = gSlot.getSlotElementId();

                if (history.hasOwnProperty(gSlotDivId)) {
                    for (var slotKey in history[gSlotDivId]) {
                        if (!history[gSlotDivId].hasOwnProperty(slotKey)) {
                            continue;
                        }
                        gSlot.clearTargeting(slotKey);
                    }

                    //? if (DEBUG) {
                    Scribe.info('Cleared targeting for google slot ' + gSlotDivId);
                    //? }

                    delete history[gSlotDivId];
                }
            }
        }
    }

    (function __constructor() {
        state.gSlotDemandHistory = state.gSlotDemandHistory || {};
        state.pageDemandHistory = state.pageDemandHistory || {};
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptClearTargeting',
        //? }

        clearTargeting: clearTargeting
    };
}

module.exports = GptClearTargeting;