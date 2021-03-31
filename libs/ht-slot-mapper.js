'use strict';

var Browser = require('browser.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function HtSlotMapper(config) {

    var __selectors = [];

    var __filters = [];

    function __doesTargetArrayMatch(arrA, arrB) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                arrA: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                arrB: {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            }
        }, {
            arrA: arrA,
            arrB: arrB
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var i = 0; i < arrA.length; i++) {
            var checkStringA;
            var isNotTargeting;

            if (arrA[i].charAt(0) === '!') {
                checkStringA = arrA[i].slice(1);
                isNotTargeting = true;
            } else {
                checkStringA = arrA[i];
                isNotTargeting = false;
            }

            var isPresent = false;

            for (var j = 0; j < arrB.length; j++) {
                if (checkStringA === arrB[j]) {
                    isPresent = true;

                    break;
                }
            }

            if (isNotTargeting === isPresent) {
                return false;
            }
        }

        return true;
    }

    function __doesTargetingMapMatch(obj1, obj2) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                obj1: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    }
                },
                obj2: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    }
                }
            }
        }, {
            obj1: obj1,
            obj2: obj2
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var key in obj1) {
            if (!obj1.hasOwnProperty(key)) {
                continue;
            }

            if (!obj2.hasOwnProperty(key)) {
                return false;
            }

            if (!__doesTargetArrayMatch(obj1[key], obj2[key])) {
                return false;
            }
        }

        return true;
    }

    var __matcherFunctions = {

        divId: function (adSlot, htSlot) {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'object',
                properties: {
                    adSlot: {
                        type: 'object',
                        properties: {
                            divId: {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    },
                    htSlot: {
                        type: 'object',
                        properties: {
                            __type__: {
                                type: 'string',
                                eq: ['HeaderTagSlot']
                            }
                        }
                    }
                }
            }, {
                adSlot: adSlot,
                htSlot: htSlot
            });

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var divIdRegex = htSlot.getDivId();

            if (!divIdRegex) {
                return -1;
            }

            if (divIdRegex.test(adSlot.divId)) {
                return 1;
            }

            return 0;
        },

        targeting: function (adSlot, htSlot) {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'object',
                properties: {
                    adSlot: {
                        type: 'object',
                        properties: {
                            targeting: {
                                type: 'object',
                                properties: {
                                    '*': {
                                        type: 'array',
                                        items: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    htSlot: {
                        type: 'object',
                        properties: {
                            __type__: {
                                type: 'string',
                                eq: ['HeaderTagSlot']
                            }
                        }
                    }
                }
            }, {
                adSlot: adSlot,
                htSlot: htSlot
            });

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var htSlotTargetingArray = htSlot.getTargeting();
            var adSlotTargeting = adSlot.targeting;

            if (!htSlotTargetingArray) {
                return -1;
            }

            var hasEmptyTargeting = false;

            var targetingMatchScore = 0;
            for (var k = 0; k < htSlotTargetingArray.length; k++) {
                if (!htSlotTargetingArray[k]) {
                    continue;
                }

                if (Utilities.isEmpty(htSlotTargetingArray[k])) {
                    hasEmptyTargeting = true;

                    continue;
                }

                if (!__doesTargetingMapMatch(htSlotTargetingArray[k], adSlotTargeting)) {
                    continue;
                }

                var currentTargetingMatchScore = 0;
                for (var key in htSlotTargetingArray[k]) {
                    if (!htSlotTargetingArray[k].hasOwnProperty(key)) {
                        continue;
                    }

                    currentTargetingMatchScore += htSlotTargetingArray[k][key].length;
                }

                targetingMatchScore = Math.max(targetingMatchScore, currentTargetingMatchScore);
            }

            if (hasEmptyTargeting || targetingMatchScore > 0) {

                return targetingMatchScore + 1;
            }

            return 0;
        },

        size: function (adSlot, htSlot) {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'object',
                properties: {
                    adSlot: {
                        type: 'object',
                        properties: {
                            sizes: {
                                type: 'array',
                                minLength: 1,
                                items: {
                                    type: 'array',
                                    exactLength: 2,
                                    items: {
                                        type: 'integer',
                                        gte: 0
                                    }
                                }
                            }
                        }
                    },
                    htSlot: {
                        type: 'object',
                        properties: {
                            __type__: {
                                type: 'string',
                                eq: ['HeaderTagSlot']
                            }
                        }
                    }
                }
            }, {
                adSlot: adSlot,
                htSlot: htSlot
            });

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var htSlotSizes = htSlot.getSizes(Browser.getViewportWidth(), Browser.getViewportHeight());

            if (!htSlotSizes) {
                return -1;
            }

            var matches = 0;

            for (var i = 0; i < htSlotSizes.length; i++) {
                var subMatches = 0;

                for (var j = 0; j < adSlot.sizes.length; j++) {
                    if (htSlotSizes[i][0] === adSlot.sizes[j][0] && htSlotSizes[i][1] === adSlot.sizes[j][1]) {
                        subMatches++;

                        break;
                    }
                }

                if (subMatches === 0) {
                    return 0;
                }

                matches += subMatches;
            }

            if (matches === 0) {
                return 0;
            }

            return Math.ceil((matches * 100) / adSlot.sizes.length);
        },

        deviceType: function (adSlot, htSlot) {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'object',
                properties: {
                    adSlot: {
                        type: 'object'
                    },
                    htSlot: {
                        type: 'object',
                        properties: {
                            __type__: {
                                type: 'string',
                                eq: ['HeaderTagSlot']
                            }
                        }
                    }
                }
            }, {
                adSlot: adSlot,
                htSlot: htSlot
            });

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var htSlotDeviceType = htSlot.getDeviceType();

            if (!htSlotDeviceType) {
                return -1;
            }

            if (htSlotDeviceType === SpaceCamp.DeviceTypeChecker.getDeviceType()) {
                return 1;
            }

            return 0;
        },

        adUnitPath: function (adSlot, htSlot) {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'object',
                properties: {
                    adSlot: {
                        type: 'object',
                        properties: {
                            adUnitPath: {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    },
                    htSlot: {
                        type: 'object',
                        properties: {
                            __type__: {
                                type: 'string',
                                eq: ['HeaderTagSlot']
                            }
                        }
                    }
                }
            }, {
                adSlot: adSlot,
                htSlot: htSlot
            });

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var adUnitPathRegex = htSlot.getAdUnitPath();

            if (!adUnitPathRegex) {
                return -1;
            }

            if (adUnitPathRegex.test(adSlot.adUnitPath)) {
                return 1;
            }

            return 0;
        }
    };

    function __doAllFiltersPass(adSlot, htSlot) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                adSlot: {
                    type: 'object'
                },
                htSlot: {
                    type: 'object',
                    properties: {
                        __type__: {
                            type: 'string',
                            eq: ['HeaderTagSlot']
                        }
                    }
                }
            }
        }, {
            adSlot: adSlot,
            htSlot: htSlot
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var i = 0; i < __filters.length; i++) {
            if (__filters[i](adSlot, htSlot) === 0) {
                return false;
            }
        }

        return true;
    }

    function __doAllSelectorsMatch(adSlot, htSlot, selectorSet) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                adSlot: {
                    type: 'object'
                },
                htSlot: {
                    type: 'object',
                    properties: {
                        __type__: {
                            type: 'string',
                            eq: ['HeaderTagSlot']
                        }
                    }
                },
                selectorSet: {
                    type: 'array',
                    minLength: 1,
                    items: {
                        type: 'function'
                    }
                }
            }
        }, {
            adSlot: adSlot,
            htSlot: htSlot,
            selectorSet: selectorSet
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var i = 0; i < selectorSet.length; i++) {
            var score = selectorSet[i](adSlot, htSlot);
            if (score <= 0) {
                return false;
            }
        }

        return true;
    }

    function filter(htSlots, adSlots) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                adSlots: {
                    type: 'array',
                    items: {
                        type: 'object'
                    }
                },
                htSlots: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            __type__: {
                                type: 'string',
                                eq: ['HeaderTagSlot']
                            }
                        }
                    }
                }
            }
        }, {
            adSlots: adSlots,
            htSlots: htSlots
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (Utilities.isEmpty(__filters)) {

            return htSlots.slice();
        }

        var filteredSlots = [];

        for (var i = 0; i < htSlots.length; i++) {
            for (var j = 0; j < adSlots.length; j++) {
                if (__doAllFiltersPass(adSlots[j], htSlots[i])) {
                    filteredSlots.push(htSlots[i]);

                    break;
                }
            }
        }

        return filteredSlots;
    }

    function select(libSlots, adSlots) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                adSlots: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            reference: {
                                optional: true,
                                type: 'any'
                            }
                        }
                    }
                },
                libSlots: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            __type__: {
                                type: 'string',
                                eq: ['HeaderTagSlot']
                            }
                        }
                    }
                }
            }
        }, {
            adSlots: adSlots,
            libSlots: libSlots
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (Utilities.isEmpty(libSlots) || Utilities.isEmpty(adSlots)) {
            return [];
        }

        var selectedParcels = [];
        var libSlotsCopy = libSlots.slice();
        var adSlotsCopy = adSlots.slice();

        for (var k = 0; k < __selectors.length; k++) {
            var selectorSet = __selectors[k];
            var libSlotsMatched = [];

            for (var l = adSlotsCopy.length - 1; l >= 0; l--) {
                var bestMatch = [];
                var bestMatchSlot = -1;

                for (var m = 0; m < libSlotsCopy.length; m++) {
                    if (!__doAllSelectorsMatch(adSlotsCopy[l], libSlotsCopy[m], selectorSet)) {
                        continue;
                    }

                    var curlibSlotScores = [];

                    for (var n = 0; n < selectorSet.length; n++) {
                        var score = selectorSet[n](adSlotsCopy[l], libSlotsCopy[m]);
                        curlibSlotScores.push(score);
                    }

                    for (var o = 0; o < selectorSet.length; o++) {
                        if (!bestMatch[o] || (curlibSlotScores[o] > bestMatch[o])) {
                            bestMatch = curlibSlotScores;
                            bestMatchSlot = m;

                            break;
                        }

                        if (curlibSlotScores[o] < bestMatch[o]) {
                            break;
                        }
                    }
                }

                if (bestMatchSlot >= 0) {
                    //? if (DEBUG) {
                    Scribe.info('htSlot "' + libSlotsCopy[bestMatchSlot].getName() + '" mapped to adSlot "' + adSlotsCopy[l].divId + '"');
                    //? }

                    var matchParcel = {};
                    libSlotsMatched[bestMatchSlot] = true;

                    matchParcel.htSlot = libSlotsCopy[bestMatchSlot];

                    if (adSlotsCopy[l].firstPartyData) {
                        matchParcel.firstPartyData = adSlotsCopy[l].firstPartyData;
                    }

                    matchParcel = libSlotsCopy[bestMatchSlot];

                    if (adSlotsCopy[l].reference) {
                        matchParcel.ref = adSlotsCopy[l].reference;
                    }
                    selectedParcels.push(matchParcel);
                    adSlotsCopy.splice(l, 1);
                }
            }

            for (var p = libSlotsCopy.length - 1; p >= 0; p--) {
                if (libSlotsMatched[p]) {
                    libSlotsCopy.splice(p, 1);
                }
            }
        }

        return selectedParcels;
    }

    (function __constructor() {
        //? if (DEBUG) {
        var results;

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        for (var i = 0; i < config.filters.length; i++) {
            if (!__matcherFunctions.hasOwnProperty(config.filters[i])) {
                throw Whoopsie('INVALID_CONFIG', 'Cannot find function ' + config.filters[i] + ' in HtSlotMapper');
            }

            __filters.push(__matcherFunctions[config.filters[i]]);
        }

        for (var j = 0; j < config.selectors.length; j++) {
            var selectorSetFuncs = [];
            var selectorSet = config.selectors[j];

            if (Utilities.isString(selectorSet)) {
                //? if (DEBUG) {
                if (!__matcherFunctions.hasOwnProperty(selectorSet)) {
                    throw Whoopsie('INVALID_CONFIG', 'Cannot find function ' + selectorSet + ' in HtSlotMapper');
                }
                //? }

                selectorSetFuncs.push(__matcherFunctions[selectorSet]);
            } else {
                for (var k = 0; k < selectorSet.length; k++) {
                    //? if (DEBUG) {
                    if (!__matcherFunctions.hasOwnProperty(selectorSet[k])) {
                        throw Whoopsie('INVALID_CONFIG', 'Cannot find function ' + selectorSet[k] + ' in HtSlotMapper');
                    }
                    //? }

                    selectorSetFuncs.push(__matcherFunctions[selectorSet[k]]);
                }
            }
            __selectors.push(selectorSetFuncs);
        }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'HtSlotMapper',
        //? }

        //? if (TEST) {
        __selectors: __selectors,
        __filters: __filters,
        __matcherFunctions: __matcherFunctions,
        //? }

        select: select,
        filter: filter,

        //? if (TEST) {
        __doesTargetArrayMatch: __doesTargetArrayMatch,
        __doesTargetingMapMatch: __doesTargetingMapMatch,
        __doAllFiltersPass: __doAllFiltersPass
        //? }
    };
}

module.exports = HtSlotMapper;