'use strict';

var Constants = require('constants.js');
var Size = require('size.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

var EventsService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function RenderService(configs) {

    //? if (DEBUG){
    var __adEntryFormat = {
        type: 'object',
        strict: true,
        properties: {
            sessionId: {
                type: 'string'
            },
            partnerId: {
                type: 'string'
            },
            adm: {
                minLength: 1,
                type: 'string'
            },
            requestId: {
                optional: true,
                type: 'string'
            },
            timeOfExpiry: {
                optional: true,
                type: 'number'
            },
            auxFn: {
                optional: true,
                type: 'function'
            },
            auxArgs: {
                optional: true,
                type: 'array'
            },
            size: {
                optional: true,
                type: ['array', 'string'],
                exec: function (schema, post) {
                    if (!post) {
                        return;
                    }

                    if (!Utilities.isString(post) && !Size.isSize(post)) {
                        this.report('must either be a size array or a string');
                    }
                }
            },
            price: {
                optional: true,
                type: 'string'
            },
            dealId: {
                optional: true,
                type: 'string'
            }
        }
    };
    //? }

    var __adStorage;

    var __expiredAdStorage;

    var __expirySweepIntervalId;

    //? if(FEATURES.GPT_LINE_ITEMS) {

    var __partnerInfo = {};

    var __sizeAdIdMap = {};

    var __priceAdIdMap = {};

    var __dealIdAdIdMap = {};

    //?    if(FEATURES.INDEX_LINE_ITEMS) {

    var __indexLegacyAdStore = {};
    //?     }

    var __sizeRetargetingMap;

    var __specialSizedSlotLookup = {};

    //? }

    function __findAdIdsFromMap(adIdMap, partnerId, dealIdOrPriceOrSize, targetingValues) {
        if (!adIdMap.hasOwnProperty(partnerId)) {
            return;
        }

        if (!adIdMap[partnerId].hasOwnProperty(dealIdOrPriceOrSize)) {
            return;
        }

        var adIdsArray = null;

        for (var i = 0; i < targetingValues.length; i++) {
            var requestId = targetingValues[i];

            if (!adIdMap[partnerId][dealIdOrPriceOrSize].hasOwnProperty(requestId)) {
                continue;
            }

            adIdsArray = adIdMap[partnerId][dealIdOrPriceOrSize][requestId];
        }

        return adIdsArray;
    }

    function __expireAd(pubKitAdId) {
        if (!__adStorage.hasOwnProperty(pubKitAdId)) {
            return false;
        }

        __expiredAdStorage[pubKitAdId] = true;
        delete __adStorage[pubKitAdId];

        return true;
    }

    function __removeExpiredAds() {
        var now = System.now();

        for (var pubKitAdId in __adStorage) {
            if (!__adStorage.hasOwnProperty(pubKitAdId)) {
                continue;
            }

            if (__adStorage[pubKitAdId].timeOfExpiry && now > __adStorage[pubKitAdId].timeOfExpiry) {
                __expireAd(pubKitAdId);
            }
        }
    }

    function __internalRegisterAd(adEntry) {
        //? if (DEBUG){
        var result = Inspector.validate(__adEntryFormat, adEntry);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var pubKitAdId;

        do {
            pubKitAdId = System.generateUniqueId(Constants.PUBKIT_AD_ID_LENGTH, 'ALPHANUM');
        } while (__adStorage.hasOwnProperty[pubKitAdId]);

        __adStorage[pubKitAdId] = adEntry;

        return pubKitAdId;
    }

    function __retrieveAdEntry(pubKitAdId) {
        //? if (DEBUG){
        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                pubKitAdId: {
                    type: 'string'
                }
            }
        }, {
            pubKitAdId: pubKitAdId
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        if (__adStorage.hasOwnProperty(pubKitAdId) && __adStorage[pubKitAdId].timeOfExpiry && System.now() > __adStorage[pubKitAdId].timeOfExpiry) {
            __expireAd(pubKitAdId);
        }

        if (__expiredAdStorage[pubKitAdId]) {
            EventsService.emit('internal_info', 'Attempted to render expired ad ' + pubKitAdId);

            return null;
        }

        if (!__adStorage.hasOwnProperty(pubKitAdId)) {
            throw Whoopsie('INVALID_VALUE', '`pubKitAdId` does not match any registered ad');
        }

        var adEntry = __adStorage[pubKitAdId];
        __expireAd(pubKitAdId);

        return adEntry;
    }

    function __runAuxFn(adEntry) {
        //? if (DEBUG){
        var result = Inspector.validate(__adEntryFormat, adEntry);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        if (adEntry.auxFn) {
            try {
                adEntry.auxFn.apply(null, adEntry.auxArgs);
            } catch (ex) {
                EventsService.emit('internal_error', 'Error occurred running ad aux function.', ex.stack);
            }
        }
    }

    function render(doc, pubKitAdId) {
        //? if (DEBUG){
        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                doc: {},
                pubKitAdId: {
                    type: 'string'
                }
            }
        }, {
            doc: doc,
            pubKitAdId: pubKitAdId
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var adEntry = __retrieveAdEntry(pubKitAdId);
        if (!adEntry) {
            return false;
        }

        //? if (DEBUG) {
        Scribe.info('Rendering ad ' + pubKitAdId + ' for ' + adEntry.partnerId + ' at ' + System.now());
        //? }

        __runAuxFn(adEntry);

        try {
            System.documentWrite(doc, adEntry.adm);
        } catch (ex) {
            EventsService.emit('internal_error', 'Error occurred while rendering ad "' + pubKitAdId + '".', ex.stack);

            return false;
        }

        return true;
    }

    function registerAd(adEntry) {
        //? if (DEBUG){
        var result = Inspector.validate(__adEntryFormat, adEntry);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }

        result = Inspector.validate({
            type: 'object',
            properties: {
                requestId: {
                    optional: false
                },
                size: {
                    optional: false
                }
            }
        }, adEntry);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var pubKitAdId = __internalRegisterAd(adEntry);

        //? if(FEATURES.GPT_LINE_ITEMS) {

        if (!adEntry.price && !adEntry.dealId) {
            //? if (DEBUG) {
            Scribe.error('Either `price` or `dealId` must be provided when registering an ad');
            //? }

            return;
        }

        var partnerId = adEntry.partnerId;
        var requestId = adEntry.requestId;

        if (!__partnerInfo.hasOwnProperty(partnerId)) {
            //? if (DEBUG) {
            Scribe.error('Tried to register ad for unrecognized partner ' + partnerId);
            //? }

            return;
        }

        var sizeKey;
        if (Utilities.isString(adEntry.size)) {
            sizeKey = adEntry.size;
        } else {
            sizeKey = Size.arrayToString(adEntry.size);
        }

        if (Size.isSpecialSize(sizeKey)) {
            __specialSizedSlotLookup[requestId] = sizeKey;
        }

        if (!__sizeAdIdMap[partnerId]) {
            __sizeAdIdMap[partnerId] = {};
        }

        if (!__sizeAdIdMap[partnerId][sizeKey]) {
            __sizeAdIdMap[partnerId][sizeKey] = {};
        }

        if (!__sizeAdIdMap[partnerId][sizeKey][requestId]) {
            __sizeAdIdMap[partnerId][sizeKey][requestId] = [];
        }
        __sizeAdIdMap[partnerId][sizeKey][requestId].push(pubKitAdId);

        var price = adEntry.price;
        if (price) {
            if (!__priceAdIdMap[partnerId]) {
                __priceAdIdMap[partnerId] = {};
            }

            if (!__priceAdIdMap[partnerId][price]) {
                __priceAdIdMap[partnerId][price] = {};
            }

            if (!__priceAdIdMap[partnerId][price][requestId]) {
                __priceAdIdMap[partnerId][price][requestId] = [];
            }
            __priceAdIdMap[partnerId][price][requestId].push(pubKitAdId);
        }

        var dealId = adEntry.dealId;
        if (dealId) {
            if (!__dealIdAdIdMap[partnerId]) {
                __dealIdAdIdMap[partnerId] = {};
            }

            if (!__dealIdAdIdMap[partnerId][dealId]) {
                __dealIdAdIdMap[partnerId][dealId] = {};
            }

            if (!__dealIdAdIdMap[partnerId][dealId][requestId]) {
                __dealIdAdIdMap[partnerId][dealId][requestId] = [];
            }
            __dealIdAdIdMap[partnerId][dealId][requestId].push(pubKitAdId);
        }
        //? }

        return pubKitAdId;
    }

    //? if(FEATURES.GPT_LINE_ITEMS) {

    //?     if (FEATURES.INDEX_LINE_ITEMS) {

    function registerIndexLegacyAd(sessionId, partnerId, adm, timeOfExpiry, price, xSlotName) {
        //? if (DEBUG){

        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                price: {
                    type: 'string',
                    minLength: 1
                },
                xSlotName: {
                    type: 'string',
                    minLength: 1
                }
            }
        }, {
            price: price,
            xSlotName: xSlotName
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        if (!__partnerInfo.hasOwnProperty(partnerId)) {
            //? if (DEBUG) {
            Scribe.error('Registering ad for unrecognized partner ' + partnerId);
            //? }

            return;
        }

        var newAdEntry = {
            sessionId: sessionId,
            partnerId: partnerId,
            adm: adm,
            price: price
        };

        if (timeOfExpiry && timeOfExpiry > 0) {
            newAdEntry.timeOfExpiry = timeOfExpiry;
        }

        var pubKitAdId = __internalRegisterAd(newAdEntry);

        __indexLegacyAdStore[xSlotName] = __indexLegacyAdStore[xSlotName] || {};
        __indexLegacyAdStore[xSlotName][price] = __indexLegacyAdStore[xSlotName][price] || [];
        __indexLegacyAdStore[xSlotName][price].push(pubKitAdId);

        return pubKitAdId;
    }
    //?     }

    function renderLegacyDfpAd(partnerId, doc, targetingMap, width, height) {
        try {
            //? if (DEBUG){
            var result = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    partnerId: {
                        type: 'string',
                        minLength: 1,
                        exec: function (schema, post) {
                            if (!__partnerInfo.hasOwnProperty(post)) {
                                this.report('partner ' + post + ' must be be a registered partner');
                            }
                        }
                    },
                    doc: {
                        type: 'any'
                    }
                }
            }, {
                partnerId: partnerId,
                doc: doc
            });
            if (!result.valid) {
                throw Whoopsie('INVALID_ARGUMENT', result.format());
            }
            //? }

            if (!__sizeAdIdMap.hasOwnProperty(partnerId)) {
                EventsService.emit('internal_error', 'Partner ' + partnerId + ' missing from ad ID map.');

                return;
            }

            if (!Utilities.isObject(targetingMap)) {
                EventsService.emit('internal_error', 'invalid targeting map');

                return;
            }

            if (!targetingMap.hasOwnProperty(__partnerInfo[partnerId].idKey)) {
                EventsService.emit('internal_error', 'targeting map missing key ' + __partnerInfo[partnerId].idKey);

                return;
            }

            var targetingValues = targetingMap[__partnerInfo[partnerId].idKey];

            if (!Utilities.isArray(targetingValues)) {
                EventsService.emit('internal_error', 'invalid targeting map');

                return;
            }

            if (!Utilities.isNumeric(width)) {
                EventsService.emit('internal_error', 'invalid width');

                return;
            }

            if (!Utilities.isNumeric(height)) {
                EventsService.emit('internal_error', 'invalid height');

                return;
            }

            var sizeKey = width + 'x' + height;

            if (__sizeRetargetingMap && __sizeRetargetingMap.hasOwnProperty(sizeKey)) {
                var trueSize = __sizeRetargetingMap[sizeKey];
                sizeKey = trueSize[0] + 'x' + trueSize[1];
            }

            for (var i = 0; i < targetingValues.length; i++) {
                var requestId = targetingValues[i];

                var actualSize = __specialSizedSlotLookup[requestId] || sizeKey;

                if (!__sizeAdIdMap[partnerId].hasOwnProperty(actualSize)) {
                    EventsService.emit('internal_error', 'Size key ' + actualSize + ' missing from ad ID map for partner ' + partnerId);

                    return;
                }

                if (!__sizeAdIdMap[partnerId][actualSize].hasOwnProperty(requestId)) {
                    continue;
                }

                var adIdsArray = __sizeAdIdMap[partnerId][actualSize][requestId];

                if (!adIdsArray.length) {
                    continue;
                }

                var pubKitAdId = Utilities.randomSplice(adIdsArray);

                render(doc, pubKitAdId);

                break;
            }
        } catch (ex) {
            EventsService.emit('internal_error', 'Error occurred while rendering ad for "' + partnerId + '".', ex.stack);
        }
    }

    function renderDfpSafeFrameAd(messagePayload, messageSourceWindow) {
        if (messagePayload.partner === undefined || messagePayload.id === undefined || messagePayload.targeting === undefined
            || (messagePayload.size === undefined && messagePayload.price === undefined)) {
            //? if (DEBUG) {
            Scribe.error('Invalid message from creative iframe');
            Scribe.error(messagePayload);
            //? }

            return;
        }

        var partnerId = messagePayload.partner;
        var price = messagePayload.price;
        var payloadId = messagePayload.id;
        var targetingMap = messagePayload.targeting;
        var creativeSize = messagePayload.size;

        if (!__partnerInfo[partnerId]) {
            //? if (DEBUG) {
            Scribe.error('Partner ' + partnerId + ' not recognized');
            //? }

            return;
        }

        if (!targetingMap.hasOwnProperty(__partnerInfo[partnerId].idKey)) {
            EventsService.emit('internal_error', 'targeting map missing key ' + __partnerInfo[partnerId].idKey);

            return;
        }

        var requestIds = targetingMap[__partnerInfo[partnerId].idKey];
        var adIdsArray = null;

        if (price !== undefined) {

            var adIdsMaps = [__dealIdAdIdMap, __priceAdIdMap];
            for (var i = 0; i < adIdsMaps.length; i++) {
                adIdsArray = __findAdIdsFromMap(adIdsMaps[i], partnerId, price, requestIds);

                if (adIdsArray) {
                    break;
                }
            }
        } else if (Size.isSize(creativeSize)) {
            var sizeKey = Size.arrayToString(creativeSize);

            if (__sizeRetargetingMap && __sizeRetargetingMap.hasOwnProperty(sizeKey)) {
                var trueSize = __sizeRetargetingMap[sizeKey];
                sizeKey = Size.arrayToString(trueSize);
            }

            adIdsArray = __findAdIdsFromMap(__sizeAdIdMap, partnerId, sizeKey, requestIds);
        } else {
            //? if (DEBUG) {
            Scribe.error('Either price or correct size should be provided by message from creative iframe');
            //? }

            return;
        }

        if (!adIdsArray) {
            //? if (DEBUG) {
            Scribe.error('No ad found or ad expired');
            //? }

            return;
        }

        var pubKitAdId = Utilities.randomSplice(adIdsArray);

        var adEntry = __retrieveAdEntry(pubKitAdId);
        if (!adEntry) {
            EventsService.emit('internal_error', 'No ad found for ad ID ' + pubKitAdId);

            return;
        }

        __runAuxFn(adEntry);

        var size = adEntry.size;
        var adm = adEntry.adm;

        var frames = document.getElementsByTagName('iframe');
        var iFrame;
        for (var j = 0; j < frames.length; j++) {
            if (frames[j].contentWindow === messageSourceWindow) {
                iFrame = frames[j];

                break;
            }
        }

        if (iFrame) {
            iFrame.width = String(size[0]);
            iFrame.height = String(size[1]);

            if (iFrame.parentElement.style.width !== '' && iFrame.parentElement.style.height !== '') {
                iFrame.parentElement.style.width = size[0] + 'px';
                iFrame.parentElement.style.height = size[1] + 'px';
            }
        }

        messageSourceWindow.postMessage('ix_ht_render_adm:' + JSON.stringify({
            adm: adm,
            id: payloadId,
            size: size
        }), '*');
    }

    //?     if (FEATURES.RUBICON_LINE_ITEMS) {

    function renderRubiconAd(partnerId, iframeBody, rubiElemId, rubiSizeId) {
        try {
            var doc = iframeBody.ownerDocument;

            if (!__sizeAdIdMap.hasOwnProperty(partnerId)) {
                EventsService.emit('internal_error', 'Partner ' + partnerId + ' missing from ad ID map.');

                return;
            }

            if (!Utilities.isString(rubiSizeId)) {
                EventsService.emit('internal_error', 'invalid width');

                return;
            }

            if (!__sizeAdIdMap[partnerId].hasOwnProperty(rubiSizeId)) {
                EventsService.emit('internal_error', 'Size key ' + rubiSizeId + ' missing from ad ID map for partner ' + partnerId);

                return;
            }

            if (__sizeAdIdMap[partnerId][rubiSizeId].hasOwnProperty(rubiElemId)) {
                var adIdsArray = __sizeAdIdMap[partnerId][rubiSizeId][rubiElemId];

                if (!adIdsArray.length) {
                    EventsService.emit('internal_error', 'Size key ' + rubiSizeId + ' contains no ads for partner ' + partnerId);

                    return;
                }

                var pubKitAdId = adIdsArray.shift();

                render(doc, pubKitAdId);
            }
        } catch (ex) {
            EventsService.emit('internal_error', 'Error occurred while rendering ad for "' + partnerId + '".', ex.stack);
        }
    }
    //?     }

    //?     if (FEATURES.INDEX_LINE_ITEMS) {

    function renderIndexLegacyAd(partnerId, doc, targets, selector) {
        try {
            var targetingArray = targets.split(',');
            var unpack;
            for (var i = 0; i < targetingArray.length; i++) {
                unpack = targetingArray[i].split('_');
                if (unpack[0] === selector) {
                    if (__indexLegacyAdStore[selector] && __indexLegacyAdStore[selector][unpack[1]]) {
                        var adQueue = __indexLegacyAdStore[selector][unpack[1]];
                        var renderSuccess = false;

                        while (adQueue.length > 0 && !renderSuccess) {
                            renderSuccess = render(doc, adQueue.shift());
                        }
                    }

                    return;
                }
            }
        } catch (ex) {
            EventsService.emit('internal_error', 'Error occurred while rendering ad for "' + partnerId + '".', ex.stack);
        }
    }
    //?     }

    function registerPartner(partnerId, lineItemType, idKey) {
        //? if (DEBUG){
        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                partnerId: {
                    type: 'string',
                    minLength: 1
                },
                lineItemType: {
                    type: 'integer',
                    exec: function (schema, post) {
                        var validLineItemType = false;
                        for (var type in Constants.LineItemTypes) {
                            if (!Constants.LineItemTypes.hasOwnProperty(type)) {
                                continue;
                            }

                            if (Constants.LineItemTypes[type] === post) {
                                validLineItemType = true;

                                break;
                            }
                        }

                        if (!validLineItemType) {
                            this.report('`lineItemType` must be one of the predefined types in constants.LineItemTypes');
                        }
                    }
                },
                idKey: {
                    type: 'string',
                    minLength: 1
                }
            }
        }, {
            partnerId: partnerId,
            lineItemType: lineItemType,
            idKey: idKey
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        if (!__partnerInfo.hasOwnProperty(partnerId)) {
            __partnerInfo[partnerId] = {};
        }
        __partnerInfo[partnerId].lineItemType = lineItemType;
        __partnerInfo[partnerId].idKey = idKey;
    }

    //? }

    (function __constructor() {
        __adStorage = {};
        __expiredAdStorage = {};
        //? if(FEATURES.GPT_LINE_ITEMS) {
        __sizeRetargetingMap = configs.sizeRetargeting || null;
        //? }
        __expirySweepIntervalId = setInterval(__removeExpiredAds, Constants.RENDER_SERVICE_EXPIRY_SWEEP_TIMER);
        EventsService = SpaceCamp.services.EventsService;

        //? if(FEATURES.GPT_LINE_ITEMS) {

        window.addEventListener('message', function (ev) {
            try {
                var expectedPrefix = 'ix_ht_render:';
                if (!Utilities.isString(ev.data) || ev.data.substr(0, expectedPrefix.length) !== expectedPrefix) {
                    return;
                }

                var payload = JSON.parse(ev.data.substr(expectedPrefix.length));

                renderDfpSafeFrameAd(payload, ev.source, ev.origin);
            } catch (ex) {
                EventsService.emit('internal_error', 'Error occurred while rendering ad.', ex.stack);
            }
        }, false);
        //? }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'RenderService',
        //? }

        //? if(TEST) {
        __adStorage: __adStorage,
        __expiredAdStorage: __expiredAdStorage,
        __expirySweepIntervalId: __expirySweepIntervalId,
        //? }

        //? if(TEST) {
        __findAdIdsFromMap: __findAdIdsFromMap,
        //? }

        registerAd: registerAd,
        render: render,
        //? if (FEATURES.GPT_LINE_ITEMS) {
        registerPartner: registerPartner,
        renderDfpAd: renderLegacyDfpAd,
        //?     if (FEATURES.INDEX_LINE_ITEMS) {
        registerIndexLegacyAd: registerIndexLegacyAd,
        renderIndexLegacyAd: renderIndexLegacyAd,
        //?     }
        //?     if (FEATURES.RUBICON_LINE_ITEMS) {
        renderRubiconAd: renderRubiconAd,
        //?     }
        //? }

        //? if (TEST) {
        __expireAd: __expireAd,
        __removeExpiredAds: __removeExpiredAds
        //? }
    };
}

module.exports = RenderService;