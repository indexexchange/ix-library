'use strict';

var Browser = require('browser.js');
var Network = require('network.js');
var Size = require('size.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function MvtBuilder() {

    var __fixedParams;

    var __specialParams;

    var __targetingSubGroups;

    var __baseUrls;

    function __extractTargetingKeyValues(demandObj) {

        if (!demandObj.hasOwnProperty('targeting')) {
            return {};
        }

        var extractedTargetingKeyValues = {};
        __targetingSubGroups.map(function (subGroup) {
            if (!demandObj.targeting.hasOwnProperty(subGroup)) {
                return;
            }

            var targetingKeyValues = demandObj.targeting[subGroup];

            for (var key in targetingKeyValues) {
                if (!targetingKeyValues.hasOwnProperty(key)) {
                    continue;
                }

                extractedTargetingKeyValues[key] = targetingKeyValues[key];
            }
        });

        return extractedTargetingKeyValues;
    }

    function __buildCustParamsString(obj) {
        var paramsString = '';

        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }

            paramsString = paramsString + key + '=' + obj[key].join(',') + '&';
        }

        return paramsString.slice(0, -1);
    }

    function mediateVideoBids(slotDemand) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    partnerId: {
                        type: 'string',
                        optional: true
                    },
                    size: {
                        type: 'array',
                        optional: true
                    },
                    price: {
                        type: 'number'
                    },
                    targeting: {
                        type: 'object'
                    },
                    dealId: {
                        type: 'string',
                        optional: true
                    }
                }
            }
        }, slotDemand);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var mediatedDemand = [];

        var highestPricedBids = [];
        slotDemand = Utilities.deepCopy(slotDemand);

        slotDemand.map(function (clonedBid) {
            if (highestPricedBids.length === 0 || highestPricedBids[0].price === clonedBid.price) {
                highestPricedBids.push(clonedBid);
            } else if (highestPricedBids[0].price < clonedBid.price) {

                for (var j = 0; j < highestPricedBids.length; j++) {
                    if (highestPricedBids[j].hasOwnProperty('dealId')) {
                        delete highestPricedBids[j].targeting.price;
                    }
                }

                highestPricedBids = [clonedBid];
            }

            if (clonedBid.hasOwnProperty('dealId')) {
                mediatedDemand.push(clonedBid);

                if (highestPricedBids.length > 0 && highestPricedBids[0].price > clonedBid.price) {
                    delete clonedBid.targeting.price;
                }
            }
        });

        if (highestPricedBids.length > 0) {

            var winningBid = Utilities.randomSplice(highestPricedBids);

            if (!winningBid.hasOwnProperty('dealId')) {
                mediatedDemand.push(winningBid);
            }

            for (var i = 0; i < highestPricedBids.length; i++) {
                if (highestPricedBids[i].hasOwnProperty('dealId')) {
                    delete highestPricedBids[i].targeting.price;
                }
            }
        }

        return mediatedDemand;
    }

    function buildDfpMvt(htSlotParams, demandArr) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            strict: true,
            type: 'object',
            properties: {
                htSlotParams: {
                    type: 'object'
                },
                demandArr: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            targeting: {
                                optional: true,
                                type: 'object',
                                properties: {
                                    price: {
                                        optional: true,
                                        type: 'object'
                                    },
                                    deal: {
                                        optional: true,
                                        type: 'object'
                                    }
                                }
                            },
                            size: {
                                type: 'array',
                                exactLength: 2,
                                items: {
                                    type: 'number'
                                }
                            }
                        }
                    }
                }
            }
        }, {
            htSlotParams: htSlotParams,
            demandArr: demandArr
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var targetingKeyValues = {};
        var sizes = [];
        for (var i = 0; i < demandArr.length; i++) {
            var demandObj = demandArr[i];

            var curSize = Size.arrayToString(demandObj.size);
            if (sizes.indexOf(curSize) === -1) {
                sizes.push(curSize);
            }

            targetingKeyValues = Utilities.appendToObject(targetingKeyValues, __extractTargetingKeyValues(demandObj));
        }

        var sizeString = sizes.join('|');

        if (htSlotParams.hasOwnProperty('sz')) {
            sizeString = Size.arrayToString(htSlotParams.sz, '|');
        }

        if (htSlotParams.hasOwnProperty('cust_params')) {
            targetingKeyValues = Utilities.appendToObject(targetingKeyValues, htSlotParams.cust_params);
        }

        var queryObj = {
            correlator: System.generateUniqueId(16, 'NUM'),
            iu: htSlotParams.iu,
            description_url: htSlotParams.description_url,
            output: 'vast',
            sz: sizeString,
            url: Browser.getPageUrl(),
            cust_params: __buildCustParamsString(targetingKeyValues)
        };

        for (var key in htSlotParams) {
            if (!htSlotParams.hasOwnProperty(key)) {
                continue;
            }

            if (__fixedParams.hasOwnProperty(key) || __specialParams.indexOf(key) !== -1) {
                continue;
            }

            queryObj[key] = htSlotParams[key];
        }

        queryObj = Utilities.appendToObject(queryObj, __fixedParams);

        return Network.buildUrl(__baseUrls.dfp, null, queryObj);
    }

    (function __constructor() {

        __fixedParams = {
            env: 'vp',
            gdfp_req: 1,
            unviewed_position_start: 1
        };

        __specialParams = ['sz', 'cust_params', 'correlator'];

        __targetingSubGroups = ['price', 'deal'];

        __baseUrls = {
            dfp: 'https://securepubads.g.doubleclick.net/gampad/ads'
        };
    })();

    return {

        //? if (DEBUG) {
        __type__: 'MvtBuilder',
        //? }

        //? if (TEST) {
        __fixedParams: __fixedParams,
        __specialParams: __specialParams,
        __targetingSubGroups: __targetingSubGroups,
        __baseUrls: __baseUrls,
        //? }

        //? if (TEST) {
        __extractTargetingKeyValues: __extractTargetingKeyValues,
        __buildCustParamsString: __buildCustParamsString,
        //? }

        mediateVideoBids: mediateVideoBids,
        buildDfpMvt: buildDfpMvt
    };
}

module.exports = MvtBuilder();
