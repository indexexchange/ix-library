'use strict';

var Classify = require('classify.js');
var HeaderTagSlot = require('header-tag-slot.js');
var Layer = require('layer.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');
var Mvt = require('mvt.js');
var HeaderStatsService = require('header-stats-service.js');
var Size = require('size.js');
var Browser = require('browser.js');

var EventsService;
var TimerService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function VideoInterfaceLayer(configs) {
    var __baseClass = Layer();

    var __desktopVideoGlobalTimeout;
    var __mobileVideoGlobalTimeout;

    function buildGamMvt(htSlotsParams, demandObjs) {
        if (!Utilities.isObject(htSlotsParams)) {
            throw new Error('htSlotsParams must be an object');
        }

        if (!Utilities.isObject(demandObjs)) {
            throw new Error('demandObjs must be an object');
        }

        var mvts = {};
        var specialCaseKeys = ['iu', 'description_url', 'cust_params', 'sz'];

        for (var htSlotName in htSlotsParams) {
            if (!htSlotsParams.hasOwnProperty(htSlotName)) {
                continue;
            }

            var htSlotParams = htSlotsParams[htSlotName];

            if (!Utilities.isObject(htSlotParams)) {
                throw new Error('htSlotsParams.' + htSlotName + ' must be an object');
            }

            if (!htSlotParams.hasOwnProperty('iu') || !Utilities.isString(htSlotParams.iu) || Utilities.isEmpty(htSlotParams.iu)) {
                throw new Error('htSlotsParams.' + htSlotName + '.iu must exist and must be a non empty string');
            }

            if (!htSlotParams.hasOwnProperty('description_url') || !Utilities.isString(htSlotParams.description_url) || Utilities.isEmpty(htSlotParams.description_url)) {
                throw new Error('htSlotsParams.' + htSlotName + '.description_url must exist and must be a non empty string');
            }

            if (htSlotParams.hasOwnProperty('sz') && !Size.isSize(htSlotParams.sz) && !Size.isSizes(htSlotParams.sz)) {
                throw new Error('htSlotsParams.' + htSlotName + '.sz must be in the format [width, height] or [[width, height], [width, height], ...]');
            }

            if (htSlotParams.hasOwnProperty('cust_params')) {
                if (!Utilities.isObject(htSlotParams.cust_params)) {
                    throw new Error('htSlotsParams.' + htSlotName + '.cust_params must be an object');
                }

                var custParams = htSlotParams.cust_params;

                for (var custParamsKey in custParams) {
                    if (!custParams.hasOwnProperty(custParamsKey)) {
                        continue;
                    }

                    if (!Utilities.isArray(custParams[custParamsKey], 'string')) {
                        throw new Error('htSlotsParams.' + htSlotName + '.cust_params.' + custParamsKey + ' must be an array of string');
                    }
                }
            }

            for (var slotParamskey in htSlotParams) {
                if (!htSlotParams.hasOwnProperty(slotParamskey)) {
                    continue;
                }

                if (specialCaseKeys.indexOf(slotParamskey) !== -1) {
                    continue;
                }

                if (!Utilities.isString(htSlotParams[slotParamskey]) && !Utilities.isNumber(htSlotParams[slotParamskey])) {
                    throw new Error('htSlotsParams.' + htSlotName + '.' + slotParamskey + ' must be a string or number');
                }

                if (Utilities.isString(htSlotParams[slotParamskey]) && Utilities.isEmpty(htSlotParams[slotParamskey])) {
                    throw new Error('htSlotsParams.' + htSlotName + '.' + slotParamskey + ' must be a non empty string or number');
                }
            }

            var mvtDemandObjs = [];

            if (demandObjs.hasOwnProperty(htSlotName)) {
                var slotDemandObjs = demandObjs[htSlotName];

                if (!Utilities.isArray(slotDemandObjs, 'object')) {
                    throw new Error('demandObjs.' + htSlotName + ' must be an array of objects');
                }

                for (var j = 0; j < slotDemandObjs.length; j++) {
                    if (!slotDemandObjs[j].hasOwnProperty('size') || !Size.isSize(slotDemandObjs[j].size)) {
                        throw new Error('demandObjs.' + htSlotName + '[' + j + '].size must exist and must be an array of 2 numbers');
                    }

                    if (slotDemandObjs[j].hasOwnProperty('targeting') && !Utilities.isObject(slotDemandObjs[j].targeting)) {
                        throw new Error('demandObjs.' + htSlotName + '[' + j + '].targeting must be an object');
                    }
                }

                try {
                    mvtDemandObjs = Mvt.mediateVideoBids(slotDemandObjs);
                } catch (ex) {

                    //? if (DEBUG) {
                    Scribe.error('Error occurred while mediating demand');
                    Scribe.error(ex.stack);
                    //? }
                }
            } else {

                var htSlotsMap = SpaceCamp.htSlotsMap;

                if (!htSlotsMap.hasOwnProperty(htSlotName) || htSlotsMap[htSlotName].getType() !== HeaderTagSlot.SlotTypes.INSTREAM_VIDEO) {
                    throw new Error('htSlotName ' + htSlotName + ' does not exist');
                }

                mvtDemandObjs = [
                    {
                        size: htSlotsMap[htSlotName].getSizes(Browser.getViewportWidth(), Browser.getViewportHeight())[0]
                    }
                ];
            }

            try {
                mvts[htSlotName] = Mvt.buildDfpMvt(htSlotParams, mvtDemandObjs);
            } catch (ex) {

                //? if (DEBUG) {
                Scribe.error('Error occurred while constructing mvt');
                Scribe.error(ex.stack);
                //? }
            }
        }

        return mvts;
    }

    function retrieveVideoDemandValidation(htSlotVideoDemandObjs, callback, options) {
        if (!Utilities.isFunction(callback)) {
            throw new Error('callback must be a function');
        }

        if (!Utilities.isArray(htSlotVideoDemandObjs, 'object')) {
            callback({}, new Error('htSlotVideoDemandObjs must be an array of objects'));

            return false;
        }

        for (var i = 0; i < htSlotVideoDemandObjs.length; i++) {
            var htSlot = htSlotVideoDemandObjs[i];

            if (!htSlot.hasOwnProperty('htSlotName')) {
                callback({}, new Error('htSlotVideoDemandObjs[' + i + ']: members must contain the htSlotName property'));

                return false;
            }

            if (!Utilities.isString(htSlot.htSlotName)) {
                callback({}, new Error('htSlotVideoDemandObjs[' + i + ']: htSlotName must be a string'));

                return false;
            }
        }

        if (Utilities.getType(options) !== 'undefined') {
            if (!Utilities.isObject(options)) {
                callback({}, new Error('options must be an object'));

                return false;
            }

            if (options.hasOwnProperty('timeout') && (!Utilities.isInteger(options.timeout) || options.timeout < 0)) {
                callback({}, new Error('options.timeout must be an integer greater than 0'));

                return false;
            }
        }

        return true;
    }

    function retrieveVideoDemand(htSlotVideoDemandObjs, options) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                htSlotVideoDemandObjs: {
                    type: 'array',
                    items: {
                        type: 'object',
                        strict: true,
                        properties: {
                            htSlotName: {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    }
                },
                options: {
                    optional: true,
                    type: 'object',
                    strict: true,
                    properties: {
                        timeout: {
                            optional: true,
                            type: 'number',
                            gte: 1
                        }
                    }
                }
            }
        }, {
            htSlotVideoDemandObjs: htSlotVideoDemandObjs,
            options: options
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var outParcels = [];

        for (var i = 0; i < htSlotVideoDemandObjs.length; i++) {
            var slotFound = false;
            for (var j = 0; j < SpaceCamp.htSlots.length; j++) {

                if (SpaceCamp.htSlots[j].getType() !== HeaderTagSlot.SlotTypes.INSTREAM_VIDEO) {
                    continue;
                }

                if (htSlotVideoDemandObjs[i].htSlotName === SpaceCamp.htSlots[j].getName()) {
                    slotFound = true;
                    var newParcel = {
                        htSlot: SpaceCamp.htSlots[j],
                        ref: ''
                    };
                    outParcels.push(newParcel);
                }
            }

            if (!slotFound) {
                //? if (DEBUG){
                Scribe.info('unrecognized header tag slot name ' + htSlotVideoDemandObjs[i].htSlotName);
                //? }
                EventsService.emit('error', 'unrecognized header tag slot name ' + htSlotVideoDemandObjs[i].htSlotName + ' in call to retrieveVideoDemand');
            }
        }

        if (outParcels.length === 0) {
            //? if (DEBUG){
            Scribe.warn('no valid header tag slots found in call to retrieveVideoDemand');
            //? }
            EventsService.emit('warning', 'no valid header tag slots found in call to retrieveVideoDemand');

            return {
                sessionId: '',
                promise: Prms.resolve({})
            };
        }

        var calculatedTimeout = __desktopVideoGlobalTimeout;

        if (Utilities.getType(options) === 'undefined' || !options.hasOwnProperty('timeout')) {
            if (SpaceCamp.DeviceTypeChecker.getDeviceType() === 'mobile') {
                calculatedTimeout = __mobileVideoGlobalTimeout;
            }

            //? if (COMPONENTS.SERVICES.ADAPTIVE_TIMEOUT) {

            //? if (DEBUG) {
            if (SpaceCamp.services.hasOwnProperty('AdaptiveTimeoutService')) {
            //? }
                try {
                    calculatedTimeout = SpaceCamp.services.AdaptiveTimeoutService.getTimeout(calculatedTimeout);
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Error occurred while calculating Adaptive Timeout.');
                    Scribe.error(ex.stack);
                    //? }
                }
            //? if (DEBUG) {
            }
            //? }
            //? }
        } else {
            calculatedTimeout = options.timeout;
        }

        //? if (DEBUG) {
        Scribe.info('Calculated Timeout: ' + calculatedTimeout);
        //? }

        SpaceCamp.globalTimeout = calculatedTimeout;

        var sessionId = TimerService.createTimer(calculatedTimeout, true);
        EventsService.emit('hs_session_start', {
            sessionId: sessionId,
            timeout: calculatedTimeout,
            sessionType: HeaderStatsService.SessionTypes.VIDEO
        });

        TimerService.addTimerCallback(sessionId, function () {
            EventsService.emit('global_timeout_reached', {
                sessionId: sessionId
            });
        });

        var retPromise = __baseClass._executeNext(sessionId, outParcels).then(function (receivedParcels) {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        partnerId: {
                            type: 'string',
                            minLength: 1
                        },
                        htSlot: {
                            type: 'object'
                        },
                        size: {
                            type: 'array',
                            exactLength: 2,
                            items: {
                                type: 'number',
                                gte: 0
                            }
                        },
                        targetingType: {
                            optional: true,
                            type: 'string'
                        },
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
                        price: {
                            optional: true,
                            type: 'number',
                            gte: 1
                        },
                        dealId: {
                            optional: true,
                            type: 'string',
                            minLength: 1
                        },
                        pass: {
                            optional: true,
                            type: 'boolean'
                        },
                        adm: {
                            optional: true,
                            type: 'string',
                            minLength: 1
                        }
                    }
                }
            }, receivedParcels);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            EventsService.emit('hs_session_end', {
                sessionId: sessionId
            });

            var returnDemand = {};

            for (var k = 0; k < receivedParcels.length; k++) {

                if (receivedParcels[k].pass) {
                    continue;
                }

                if (!Utilities.isObject(receivedParcels[k].targeting) || Utilities.isEmpty(receivedParcels[k].targeting)) {
                    continue;
                }

                if (!receivedParcels[k].targetingType === 'slot') {
                    continue;
                }

                var demandObj = {
                    targeting: receivedParcels[k].targeting,
                    price: receivedParcels[k].price ? receivedParcels[k].price : 0,
                    size: receivedParcels[k].size ? receivedParcels[k].size : [],
                    partnerId: receivedParcels[k].partnerId ? receivedParcels[k].partnerId : '',
                    adm: receivedParcels[k].adm ? receivedParcels[k].adm : ''
                };

                if (receivedParcels[k].hasOwnProperty('dealId')) {
                    demandObj.dealId = receivedParcels[k].dealId;
                }

                var htSlotName = receivedParcels[k].htSlot.getName();
                if (!returnDemand.hasOwnProperty(htSlotName)) {
                    returnDemand[htSlotName] = [];
                }

                returnDemand[htSlotName].push(demandObj);
            }

            return returnDemand;
        });

        return {
            promise: retPromise,
            sessionId: sessionId
        };
    }

    function __executor(sessionId, inParcels) {
        return __baseClass._executeNext(sessionId, inParcels);
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        //? if (DEBUG){
        var ConfigValidators = require('config-validators.js');

        var results = ConfigValidators.VideoInterfaceLayer(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __desktopVideoGlobalTimeout = configs.desktopVideoGlobalTimeout;
        __mobileVideoGlobalTimeout = configs.mobileVideoGlobalTimeout;
        __baseClass._setExecutor(__executor);

        __baseClass._setDirectInterface('VideoInterfaceLayer', {
            buildGamMvt: buildGamMvt,
            retrieveVideoDemand: retrieveVideoDemand,
            retrieveVideoDemandValidation: retrieveVideoDemandValidation
        });
    })();

    var derivedClass = {

        //? if (DEBUG) {
        __type__: 'VideoInterfaceLayer',
        //? }

        //? if (TEST) {

        //? }

        //? if (TEST) {
        buildGamMvt: buildGamMvt,
        retrieveVideoDemand: retrieveVideoDemand,
        retrieveVideoDemandValidation: retrieveVideoDemandValidation
        //? }
    };

    return Classify.derive(__baseClass, derivedClass);
}

module.exports = VideoInterfaceLayer;