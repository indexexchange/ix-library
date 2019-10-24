'use strict';

var DeviceTypeChecker = require('device-type-checker.js');
var HtSlotMapper = require('ht-slot-mapper.js');
var Prms = require('prms.js');
var Size = require('size.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var HeaderStatsService = require('header-stats-service.js');

var EventsService;
var TimerService;

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function Prefetch(configs, sharedFunctions) {

    var PREFETCHED_DEMAND_EXPIRY = 55000;

    var __storage;

    var __prefetchOnLoad;

    var __htSlotMapper;

    var __dynamicVar;
    var __dynamicSlotMappingStyle;
    var __dynamicSlotMappingConfigs;

    var __pageTypeVar;
    var __pageTypeMapping;

    var __fixedList;

    function __filterHtSlotsByDeviceType(htSlotNames) {

        if (!__htSlotMapper) {
            __htSlotMapper = HtSlotMapper({
                selectors: ['divId'],
                filters: ['deviceType']
            });
        }

        var htSlots = [];

        for (var i = 0; i < htSlotNames.length; i++) {
            if (!SpaceCamp.htSlotsMap.hasOwnProperty(htSlotNames[i])) {
                continue;
            }

            htSlots.push(SpaceCamp.htSlotsMap[htSlotNames[i]]);
        }

        return __htSlotMapper.filter(htSlots, [{}]).map(function (parcel) {
            return parcel.getName();
        });
    }

    function __getHtSlotsByDynamic() {

        if (!__dynamicSlotMappingConfigs || !__dynamicSlotMappingStyle) {
            return null;
        }

        var dynamicVal = Utilities.evalVariable(__dynamicVar);

        if (dynamicVal === undefined || dynamicVal === null) {
            return null;
        }

        if (!Utilities.isArray(dynamicVal, 'object') || Utilities.isEmpty(dynamicVal)) {
            EventsService.emit('error', '`' + __dynamicVar + '` must be a non-empty array');

            return [];
        }

        var validPSlots = [];
        var errorSuffix = ', ignoring this p-slot';

        for (var i = 0; i < dynamicVal.length; i++) {
            var pSlot = dynamicVal[i];

            if (Utilities.isEmpty(pSlot)) {
                EventsService.emit('error', '`' + __dynamicVar + '[' + i + ']` must be a non-empty object' + errorSuffix);

                continue;
            }

            if (!pSlot.hasOwnProperty('adUnitPath') || !Utilities.isString(pSlot.adUnitPath) || Utilities.isEmpty(pSlot.adUnitPath)) {
                EventsService.emit('error', '`' + __dynamicVar + '[' + i + '].adUnitPath` is required and must be a non-empty string' + errorSuffix);

                continue;
            }

            if (pSlot.hasOwnProperty('divId')) {
                if (!Utilities.isString(pSlot.divId) || Utilities.isEmpty(pSlot.divId)) {
                    EventsService.emit('error', '`' + __dynamicVar + '[' + i + '].divId` must be a non-empty string' + errorSuffix);

                    continue;
                }
            }

            if (pSlot.hasOwnProperty('sizes')) {
                if (!Size.isSizes(pSlot.sizes)) {
                    EventsService.emit('error', '`' + __dynamicVar + '[' + i + '].sizes` must be a sizes array' + errorSuffix);

                    continue;
                }
            }

            if (pSlot.hasOwnProperty('targeting')) {
                if (!Utilities.isArray(pSlot.targeting, 'object')) {
                    EventsService.emit('error', '`' + __dynamicVar + '[' + i + '].targeting` must be an array of objects' + errorSuffix);

                    continue;
                }

                var targetingObjInvalid = false;

                for (var j = 0; j < pSlot.targeting.length; j++) {
                    var targetingObj = pSlot.targeting[j];

                    for (var targetingKey in targetingObj) {
                        if (!targetingObj.hasOwnProperty(targetingKey)) {
                            continue;
                        }

                        if (!Utilities.isArray(targetingObj[targetingKey], 'string')) {
                            targetingObjInvalid = true;
                            EventsService.emit('error', '`' + __dynamicVar + '[' + i + '].targeting[' + j + '].' + targetingKey + '` must be an array of strings');

                            continue;
                        }
                    }
                }

                if (targetingObjInvalid) {
                    continue;
                }
            }

            if (pSlot.hasOwnProperty('deviceType')) {
                if (!DeviceTypeChecker.isValidDeviceType(pSlot.deviceType)) {
                    EventsService.emit('error', '`' + __dynamicVar + '[' + i + '].deviceType` must be a valid device type string' + errorSuffix);

                    continue;
                }
            }

            validPSlots.push(pSlot);
        }

        if (!validPSlots.length) {
            return [];
        }

        if (!__htSlotMapper) {
            __htSlotMapper = HtSlotMapper(__dynamicSlotMappingConfigs);
        }

        var filteredHtSlots = __htSlotMapper.filter(SpaceCamp.htSlots, validPSlots);

        if (__dynamicSlotMappingStyle === 'ALL') {
            return __htSlotMapper.select(filteredHtSlots, validPSlots).map(function (parcel) {
                return parcel.htSlot.getName();
            });
        } else {
            var htSlotNames = [];

            for (var k = 0; k < validPSlots.length; k++) {
                htSlotNames = Utilities.appendToArray(htSlotNames, __htSlotMapper.select(filteredHtSlots, [validPSlots[k]]).map(function (parcel) {
                    return parcel.htSlot.getName();
                }));
            }

            return htSlotNames;
        }
    }

    function __getHtSlotsByPageType() {

        if (!__pageTypeMapping) {
            return null;
        }

        var pageTypeVal = Utilities.evalVariable(__pageTypeVar);

        if (pageTypeVal === undefined || pageTypeVal === null) {
            return null;
        }

        if (!Utilities.isString(pageTypeVal) || Utilities.isEmpty(pageTypeVal)) {
            EventsService.emit('error', '`' + __pageTypeVar + '` must be a non-empty string');

            return [];
        }

        if (!__pageTypeMapping.hasOwnProperty(pageTypeVal)) {
            EventsService.emit('error', 'Unrecognized page type "' + pageTypeVal + '"');

            return [];
        }

        var filteredHtSlotNames = __filterHtSlotsByDeviceType(__pageTypeMapping[pageTypeVal]);

        return filteredHtSlotNames;
    }

    function __getHtSlotsByFixed() {

        if (!__fixedList) {
            return null;
        }

        var filteredHtSlotNames = __filterHtSlotsByDeviceType(__fixedList);

        return filteredHtSlotNames;
    }

    function __getHtSlotsToPrefetch() {
        var methods = [__getHtSlotsByDynamic, __getHtSlotsByPageType, __getHtSlotsByFixed];

        for (var i = 0; i < methods.length; i++) {
            var htSlotNames = methods[i]();

            if (htSlotNames) {
                return htSlotNames;
            }
        }

        return [];
    }

    function __copyOverRef(sessionId, dro, outParcel, defer) {
        dro.drd.promise.then(function (returnParcels) {
            for (var i = 0; i < returnParcels.length; i++) {
                EventsService.emit('hs_slot_prefetch', {
                    sessionId: sessionId,
                    statsId: returnParcels[i].partnerStatsId,
                    htSlotId: returnParcels[i].htSlot.getId(),
                    requestId: returnParcels[i].requestId,
                    xSlotNames: [returnParcels[i].xSlotName]
                });

                returnParcels[i].ref = outParcel.ref;
            }

            defer.resolve(returnParcels);
        });
    }

    function fulfilDemand(sessionId, partnerId, partnerInstance, outParcels) {
        var partnerDefers = [];

        var i = 0;
        while (i < outParcels.length) {
            var curHtSlotName = outParcels[i].htSlot.getName();

            if (!outParcels[i].prefetch && __storage.hasOwnProperty(curHtSlotName) && __storage[curHtSlotName].hasOwnProperty(partnerId)) {
                var droArray = __storage[curHtSlotName][partnerId];

                while (droArray.length) {
                    var dro = droArray.shift();

                    if (dro.timeOfExpiry < System.now()) {
                        continue;
                    }

                    TimerService.startTimer(dro.sessionId);

                    var defer = Prms.defer();

                    __copyOverRef(sessionId, dro, outParcels[i], defer);

                    partnerDefers.push(defer);

                    outParcels.splice(i, 1);

                    i--;

                    break;
                }
            }

            i++;
        }

        return partnerDefers;
    }

    function storeDemand(sessionId, partnerId, partnerInstance, outParcels, wrappedPartnerPromises) {

        var droMap = {};

        outParcels.map(function (outParcel) {
            droMap[outParcel.ref] = {
                sessionId: sessionId,
                timeOfExpiry: Infinity,
                drd: Prms.defer()
            };
        });

        outParcels.map(function (outParcel) {

            if (partnerInstance.getPrefetchDisabled()) {
                return;
            }

            var dro = droMap[outParcel.ref];
            var defer = dro.drd;

            Prms.all(wrappedPartnerPromises)
                .then(function (receivedParcelsArray) {
                    dro.timeOfExpiry = System.now() + PREFETCHED_DEMAND_EXPIRY;

                    var parcelsForThisHtSlot = [];

                    for (var i = 0; i < receivedParcelsArray.length; i++) {
                        var receivedParcels = receivedParcelsArray[i];

                        for (var j = 0; j < receivedParcels.length; j++) {
                            var receivedParcel = receivedParcels[j];

                            if (receivedParcel.ref === outParcel.ref) {
                                parcelsForThisHtSlot.push(receivedParcel);
                            }
                        }
                    }

                    defer.resolve(parcelsForThisHtSlot);
                })
                .catch(function (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Error occurred during htSlot filtering');
                    Scribe.error(ex.stack);
                    //? }

                    defer.resolve([]);
                });

            var curHtSlotName = outParcel.htSlot.getName();

            if (!__storage.hasOwnProperty(curHtSlotName)) {
                __storage[curHtSlotName] = {};
            }

            if (!__storage[curHtSlotName].hasOwnProperty(partnerId)) {
                __storage[curHtSlotName][partnerId] = [];
            }

            __storage[curHtSlotName][partnerId].push(dro);
        });
    }

    function prefetch(htSlotNames, identityData) {
        if (!htSlotNames.length) {
            return;
        }

        var outParcels = [];

        for (var i = 0; i < htSlotNames.length; i++) {
            var htSlotName = htSlotNames[i];

            if (!SpaceCamp.htSlotsMap.hasOwnProperty(htSlotName)) {
                EventsService.emit('error', 'Unrecognized htSlotName ' + htSlotName);

                continue;
            }

            var newParcel = {
                htSlot: SpaceCamp.htSlotsMap[htSlotName],
                prefetch: true,
                ref: System.generateUuid()
            };

            //? if (FEATURES.IDENTITY) {
            if (identityData) {
                newParcel.identityData = identityData;
            }
            //? }

            outParcels.push(newParcel);

            //? if (DEBUG) {
            Scribe.info('Prefetching ht-slot "' + htSlotName + '"');
            //? }
        }

        if (!outParcels.length) {
            return;
        }

        var sessionId = TimerService.createTimer(SpaceCamp.globalTimeout, false);

        EventsService.emit('hs_session_start', {
            sessionId: sessionId,
            timeout: SpaceCamp.globalTimeout,
            sessionType: HeaderStatsService.SessionTypes.DISPLAY
        });

        var returnObj = sharedFunctions.__invokeAllPartners(sessionId, outParcels, true);

        TimerService.addTimerCallback(sessionId, function () {
            for (var i = 0; i < returnObj.defers.length; i++) {
                returnObj.defers[i].resolve([]);
            }
        });

        Prms.all(returnObj.promises).then(function () {
            EventsService.emit('hs_session_end', {
                sessionId: sessionId
            });
        });
    }

    function prefetchOnLoad(identityData) {
        if (!__prefetchOnLoad) {
            return;
        }

        var htSlotNames = __getHtSlotsToPrefetch();

        if (!htSlotNames.length) {
            return;
        }

        prefetch(htSlotNames, identityData);
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        __storage = {};

        __prefetchOnLoad = false;

        __dynamicVar = 'window.headertag.publisher.prefetchSlots';
        __pageTypeVar = 'window.headertag.pagetype';

        if (configs.prefetchOnLoad) {
            if (configs.prefetchOnLoad.enabled) {
                __prefetchOnLoad = true;
            }

            if (configs.prefetchOnLoad.configs) {
                var dynamicConfigs = configs.prefetchOnLoad.configs.dynamic;
                if (dynamicConfigs) {
                    if (dynamicConfigs.var) {
                        __dynamicVar = dynamicConfigs.var;
                    }

                    if (dynamicConfigs.slotMapping) {
                        if (dynamicConfigs.slotMapping.style) {
                            __dynamicSlotMappingStyle = dynamicConfigs.slotMapping.style;
                        }

                        if (dynamicConfigs.slotMapping.selectors && dynamicConfigs.slotMapping.filters) {
                            __dynamicSlotMappingConfigs = {
                                selectors: dynamicConfigs.slotMapping.selectors,
                                filters: dynamicConfigs.slotMapping.filters
                            };
                        }
                    }
                }

                var pageTypeConfigs = configs.prefetchOnLoad.configs.pageType;
                if (pageTypeConfigs) {
                    if (pageTypeConfigs.var) {
                        __pageTypeVar = pageTypeConfigs.var;
                    }

                    if (pageTypeConfigs.mapping) {
                        __pageTypeMapping = pageTypeConfigs.mapping;
                    }
                }

                var fixedConfigs = configs.prefetchOnLoad.configs.fixed;
                if (fixedConfigs) {
                    if (fixedConfigs.htSlotNames) {
                        __fixedList = fixedConfigs.htSlotNames;
                    }
                }
            }
        }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'Prefetch',
        //? }

        //? if (TEST) {
        __storage: __storage,

        __prefetchOnLoad: __prefetchOnLoad,

        __dynamicVar: __dynamicVar,
        __dynamicSlotMappingConfigs: __dynamicSlotMappingConfigs,
        __htSlotMapper: __htSlotMapper,

        __pageTypeVar: __pageTypeVar,
        __pageTypeMapping: __pageTypeMapping,

        __fixedList: __fixedList,
        //? }

        //? if (TEST) {
        __getHtSlotsByDynamic: __getHtSlotsByDynamic,
        __getHtSlotsByPageType: __getHtSlotsByPageType,
        __getHtSlotsByFixed: __getHtSlotsByFixed,
        __copyOverRef: __copyOverRef,
        //? }

        prefetch: prefetch,
        prefetchOnLoad: prefetchOnLoad,
        fulfilDemand: fulfilDemand,
        storeDemand: storeDemand
    };
}

module.exports = Prefetch;
