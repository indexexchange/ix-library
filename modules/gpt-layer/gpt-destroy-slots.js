'use strict';

var SpaceCamp = require('space-camp.js');
var GptHelper = require('gpt-helper.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function GptDestroySlots(configs, state) {

    var __gptDestroySlots;

    function __callGptDestroySlots(gSlots) {
        if (__gptDestroySlots) {
            return __gptDestroySlots(gSlots);
        } else {
            return window.googletag.destroySlots(gSlots);
        }
    }

    function destroySlots(gSlots) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'array',
            optional: true,
            properties: {
                items: {
                    type: 'object',
                    optional: true,
                    exec: function (schema, post) {
                        if (!GptHelper.isGSlot(post)) {
                            this.report('must be a google slot object');
                        }
                    }
                }
            }
        }, gSlots);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var removeFromHistorySlots = gSlots ? gSlots : GptHelper.getGSlots();

        for (var i = 0; i < removeFromHistorySlots.length; i++) {
            if (state.gSlotDisplayHistory.hasOwnProperty(removeFromHistorySlots[i].getSlotElementId())) {
                delete state.gSlotDisplayHistory[removeFromHistorySlots[i].getSlotElementId()];
            }
        }

        return __callGptDestroySlots(gSlots);
    }

    (function __constructor() {
        if (!state.hasOwnProperty('gSlotDisplayHistory')) {
            state.gSlotDisplayHistory = {};
        }

        var overrideGoogletag = function () {
            if (configs.override && configs.override.destroySlots) {

                __gptDestroySlots = SpaceCamp.LastLineGoogletag.destroySlots;
            }
        };
        SpaceCamp.initQueue.push(overrideGoogletag);
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptDestroySlots',
        //? }

        destroySlots: destroySlots
    };
}

module.exports = GptDestroySlots;
