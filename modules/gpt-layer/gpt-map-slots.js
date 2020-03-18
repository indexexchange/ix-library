'use strict';

var Browser = require('browser.js');
var GptHelper = require('gpt-helper.js');
var HtSlotMapper = require('ht-slot-mapper.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function GptMapSlots(configs, state) {

    var __state;

    var __htSlotMapper;

    function mapHtSlots(gSlotDemandObjs) {
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

        var adSlotInfoObjs = [];

        for (var i = 0; i < gSlotDemandObjs.length; i++) {
            var gSlot = gSlotDemandObjs[i].slot;
            var adSlotInfo = {
                reference: gSlot
            };

            if (gSlotDemandObjs[i].firstPartyData) {
                adSlotInfo.firstPartyData = gSlotDemandObjs[i].firstPartyData;
            }

            adSlotInfo.divId = gSlot.getSlotElementId();

            var googleSlotSizes = [];
            var googleSlotAllSizes = gSlot.getSizes(Browser.getViewportWidth(), Browser.getViewportHeight()) || gSlot.getSizes();
            if (!googleSlotAllSizes) {
                continue;
            }

            for (var j = 0; j < googleSlotAllSizes.length; j++) {

                if (Utilities.isString(googleSlotAllSizes[j])) {
                    continue;
                }
                googleSlotSizes.push([googleSlotAllSizes[j].getWidth(), googleSlotAllSizes[j].getHeight()]);
            }
            var googleSlotTargeting = {};
            var googleSlotTargetingKeys = gSlot.getTargetingKeys();
            for (var k = 0; k < googleSlotTargetingKeys.length; k++) {
                googleSlotTargeting[googleSlotTargetingKeys[k]] = gSlot.getTargeting(googleSlotTargetingKeys[k])
                    .map(function (target) {
                        return String(target);
                    });
            }

            adSlotInfo.sizes = googleSlotSizes;
            adSlotInfo.targeting = googleSlotTargeting;
            adSlotInfo.adUnitPath = gSlot.getAdUnitPath();

            adSlotInfoObjs.push(adSlotInfo);
        }

        var allHtSlots = SpaceCamp.htSlots;
        var filteredHtSlots = __htSlotMapper.filter(allHtSlots, adSlotInfoObjs);
        var selectedSlotParcels = __htSlotMapper.select(filteredHtSlots, adSlotInfoObjs);

        //? if (DEBUG) {
        Scribe.info(selectedSlotParcels.length + ' HT slot mappings');
        //? }

        return selectedSlotParcels;
    }

    (function __constructor() {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'object',
            properties: {
                slotMapping: {
                    type: 'object'
                }
            }
        }, configs);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }
        __state = state;
        __htSlotMapper = HtSlotMapper(configs.slotMapping);
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptMapSlots',
        //? }

        mapHtSlots: mapHtSlots
    };
}

module.exports = GptMapSlots;