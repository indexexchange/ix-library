'use strict';

var Classify = require('classify.js');
var HeaderTagSlot = require('header-tag-slot.js');
var Layer = require('layer.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');
var System = require('system.js');
var HeaderStatsService = require('header-stats-service.js');

var EventsService;
var TimerService;

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function DirectBiddingLayer(configs) {
    var baseClass = Layer();

    var __desktopGlobalTimeout;
    var __mobileGlobalTimeout;

    function retrieveDemand(htSlotDemandObjs, options) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'array',
            items: {
                type: 'object',
                strict: true,
                properties: {
                    htSlotName: {
                        type: 'string',
                        minLength: 1
                    },
                    firstPartyData: {
                        type: 'object',
                        optional: true
                    }
                }
            }
        }, htSlotDemandObjs);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var outParcels = [];

        for (var i = 0; i < htSlotDemandObjs.length; i++) {
            var slotFound = false;
            for (var j = 0; j < SpaceCamp.htSlots.length; j++) {

                if (SpaceCamp.htSlots[j].getType() !== HeaderTagSlot.SlotTypes.BANNER) {
                    continue;
                }

                if (htSlotDemandObjs[i].htSlotName === SpaceCamp.htSlots[j].getName()) {
                    slotFound = true;
                    var newParcel = {
                        htSlot: SpaceCamp.htSlots[j],
                        ref: ''
                    };
                    if (htSlotDemandObjs[i].hasOwnProperty('firstPartyData')) {
                        newParcel.firstPartyData = htSlotDemandObjs[i].firstPartyData;
                    }
                    outParcels.push(newParcel);
                }
            }

            if (!slotFound) {
                //? if (DEBUG){
                Scribe.info('unrecognized header tag slot name ' + htSlotDemandObjs[i].htSlotName);
                //? }
                EventsService.emit('error', 'unrecognized header tag slot name ' + htSlotDemandObjs[i].htSlotName + ' in call to retrieveDemand');
            }
        }

        if (outParcels.length === 0) {
            //? if (DEBUG){
            Scribe.warn('no valid header tag slots found in call to retrieveDemand');
            //? }
            EventsService.emit('warning', 'no valid header tag slots found in call to retrieveDemand');

            return {
                sessionId: '',
                promise: Prms.resolve({})
            };
        }

        var calculatedTimeout = __desktopGlobalTimeout;

        if (Utilities.getType(options) === 'undefined' || !options.hasOwnProperty('timeout')) {
            if (SpaceCamp.DeviceTypeChecker.getDeviceType() === 'mobile') {
                calculatedTimeout = __mobileGlobalTimeout;
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
            sessionType: HeaderStatsService.SessionTypes.DISPLAY
        });

        TimerService.addTimerCallback(sessionId, function () {
            EventsService.emit('global_timeout_reached', {
                sessionId: sessionId
            });
        });

        var retPromise = baseClass._executeNext(sessionId, outParcels).then(function (receivedParcels) {
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
                        targetingType: {
                            optional: true,
                            type: 'string'
                        },
                        htSlot: {
                            optional: true,
                            type: 'object'
                        }
                    },
                    exec: function (schema, post) {
                        if (post.targetingType !== 'page' && post.htSlot === undefined) {
                            this.report('Parcel missing htSlot property.');
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

            var returnDemand = {
                slot: {},
                page: []
            };

            for (var k = 0; k < receivedParcels.length; k++) {

                if (receivedParcels[k].pass) {
                    continue;
                }

                if (!Utilities.isObject(receivedParcels[k].targeting) || Utilities.isEmpty(receivedParcels[k].targeting)) {
                    continue;
                }

                if (receivedParcels[k].targetingType === 'slot') {
                    var htSlotName = receivedParcels[k].htSlot.getName();
                    if (!returnDemand.slot.hasOwnProperty(htSlotName)) {
                        returnDemand.slot[htSlotName] = [];
                    }
                    returnDemand.slot[htSlotName].push({
                        targeting: receivedParcels[k].targeting,
                        price: receivedParcels[k].price ? receivedParcels[k].price : 0,
                        adm: receivedParcels[k].adm ? receivedParcels[k].adm : '',
                        size: receivedParcels[k].size ? receivedParcels[k].size : [],
                        partnerId: receivedParcels[k].partnerId ? receivedParcels[k].partnerId : '',
                        winNotice: receivedParcels[k].winNotice ? receivedParcels[k].winNotice : System.noOp
                    });
                } else if (receivedParcels[k].targetingType === 'page') {
                    var pageDemand = {
                        targeting: receivedParcels[k].targeting,
                        partnerId: receivedParcels[k].partnerId ? receivedParcels[k].partnerId : ''
                    };

                    if (receivedParcels.hasOwnProperty('price')) {
                        pageDemand.price = receivedParcels[k].price;
                    }

                    if (receivedParcels.hasOwnProperty('adm')) {
                        pageDemand.adm = receivedParcels[k].adm;
                    }
                    returnDemand.page.push(pageDemand);
                }
            }

            return returnDemand;
        });

        return {
            promise: retPromise,
            sessionId: sessionId
        };
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        //? if (DEBUG){
        var ConfigValidators = require('config-validators.js');

        var results = ConfigValidators.DirectBiddingLayer(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __desktopGlobalTimeout = configs.desktopGlobalTimeout;
        __mobileGlobalTimeout = configs.mobileGlobalTimeout;

        if (SpaceCamp.DeviceTypeChecker.getDeviceType() === 'mobile') {
            SpaceCamp.globalTimeout = __mobileGlobalTimeout;
        } else {
            SpaceCamp.globalTimeout = __desktopGlobalTimeout;
        }

        baseClass._setDirectInterface('DirectBiddingLayer', {
            retrieveDemand: retrieveDemand
        });
    })();

    var derivedClass = {

        //? if (DEBUG) {
        __type__: 'DirectBiddingLayer',
        //? }

        //? if (TEST) {

        //? }

        //? if (TEST) {
        retrieveDemand: retrieveDemand
        //? }
    };

    return Classify.derive(baseClass, derivedClass);
}

module.exports = DirectBiddingLayer;