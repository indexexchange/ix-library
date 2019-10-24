'use strict';

var Browser = require('browser.js');
var Classify = require('classify.js');
var GptHelper = require('gpt-helper.js');
var HtSlotMapper = require('ht-slot-mapper.js');
var Layer = require('layer.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');
var HeaderStatsService = require('header-stats-service.js');

var EventsService;
var TimerService;

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function PostGptLayer(configs) {
    var baseClass = Layer();

    var __lineItemDisablerTargeting;

    var __htSlotMapper;

    var __desktopGlobalTimeout;

    var __mobileGlobalTimeout;

    function __displayFallbackAd(gSlot) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                gSlot: {
                    type: 'any'
                }
            }
        }, {
            gSlot: gSlot
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var randomId = System.generateUniqueId();

        var adDiv = document.createElement('div');
        adDiv.id = randomId;

        document.body.appendChild(adDiv);

        var gpt = GptHelper.loadGpt();
        gpt.cmd.push(function () {

            window.parent.googletag
                .pubads()
                .getTargetingKeys()
                .map(function (key) {
                    gpt.pubads().setTargeting(key, window.parent.googletag.pubads().getTargeting(key));
                });

            var adUnitPath = gSlot.getAdUnitPath();
            var sizes = [];
            gSlot.getSizes().map(function (size) {
                sizes.push([size.getWidth(), size.getHeight()]);
            });
            var targeting = gSlot.getTargetingMap();

            var adSlot = gpt.defineSlot(adUnitPath, sizes, randomId).addService(gpt.pubads());

            for (var key in targeting) {
                if (!targeting.hasOwnProperty(key)) {
                    continue;
                }

                adSlot.setTargeting(key, targeting[key]);
            }

            adSlot.setTargeting(__lineItemDisablerTargeting.key, __lineItemDisablerTargeting.value);

            gpt.enableServices();
            gpt.display(randomId);
        });
    }

    function display(gSlot, iFrame, gIFrame) {
        return Prms.resolve().then(function () {
            //? if (DEBUG) {
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    gSlot: {
                        type: 'any'
                    },
                    iFrame: {
                        type: 'any'
                    }
                }
            }, {
                gSlot: gSlot,
                iFrame: iFrame
            });

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var calculatedTimeout = __desktopGlobalTimeout;

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
                    Scribe.error('Error occurred while calculating adaptive timeout.');
                    Scribe.error(ex.stack);
                    //? }
                }
            //? if (DEBUG) {
            }
            //? }
            //? }

            //? if (DEBUG) {
            Scribe.info('Calculated Timeout: ' + calculatedTimeout);
            //? }

            SpaceCamp.globalTimeout = calculatedTimeout;

            var sessionId = TimerService.createTimer(calculatedTimeout, true);
            TimerService.addTimerCallback(sessionId, function () {
                EventsService.emit('global_timeout_reached', {
                    sessionId: sessionId
                });
            });

            var allHtSlots = SpaceCamp.htSlots;

            var adSlotInfo = [
                {
                    reference: gSlot
                }
            ];

            adSlotInfo[0].divId = gSlot.getSlotElementId();

            var googleSlotTargeting = {};
            var googleSlotTargetingKeys = gSlot.getTargetingKeys();
            for (var i = 0; i < googleSlotTargetingKeys.length; i++) {
                googleSlotTargeting[googleSlotTargetingKeys[i]] = gSlot.getTargeting(googleSlotTargetingKeys[i]);
            }
            var googleSlotSizes = [];
            var googleSlotAllSizes = gSlot.getSizes(Browser.getViewportWidth(), Browser.getViewportHeight()) || gSlot.getSizes();
            if (!googleSlotAllSizes) {
                return new Prms(function (resolve) {
                    //? if (DEBUG) {
                    Scribe.warn('Unable to get sizes for provided google slot');
                    //? }
                    __displayFallbackAd(gSlot);
                    resolve();
                });
            }

            for (var j = 0; j < googleSlotAllSizes.length; j++) {
                googleSlotSizes.push([googleSlotAllSizes[j].getWidth(), googleSlotAllSizes[j].getHeight()]);
            }

            adSlotInfo[0].sizes = googleSlotSizes;
            adSlotInfo[0].targeting = googleSlotTargeting;
            adSlotInfo[0].adUnitPath = gSlot.getAdUnitPath();

            var filteredHtSlots = __htSlotMapper.filter(allHtSlots, adSlotInfo);
            var selectedSlotParcels = __htSlotMapper.select(filteredHtSlots, adSlotInfo);

            if (Utilities.isEmpty(selectedSlotParcels)) {
                return new Prms(function (resolve) {
                    //? if (DEBUG) {
                    Scribe.warn('Unable to find htSlot for provided google slot');
                    //? }
                    __displayFallbackAd(gSlot);
                    resolve();
                });
            }

            EventsService.emit('hs_session_start', {
                sessionId: sessionId,
                timeout: calculatedTimeout,
                sessionType: HeaderStatsService.SessionTypes.DISPLAY
            });

            return baseClass._executeNext(sessionId, selectedSlotParcels).then(function (returnParcels) {
                EventsService.emit('hs_session_end', {
                    sessionId: sessionId
                });

                if (returnParcels.length === 0) {
                    __displayFallbackAd(gSlot, sessionId);

                    return;
                }

                //? if (DEBUG) {
                if (returnParcels.length > 1) {
                    Scribe.warn('More than one auction winner, using first one');
                }

                var results = Inspector.validate({
                    type: 'object',
                    properties: {
                        targeting: {
                            type: 'object',
                            properties: {
                                pubKitAdId: {
                                    type: 'string'
                                }
                            }
                        },
                        size: {
                            type: 'array',
                            exactLength: 2,
                            items: {
                                type: 'number',
                                gt: 0
                            }
                        }
                    }
                }, returnParcels[0]);

                if (!results.valid) {
                    throw Whoopsie('INVALID_ARGUMENT', results.format());
                }
                //? }

                iFrame.width = returnParcels[0].size[0];
                iFrame.height = returnParcels[0].size[1];
                iFrame.removeAttribute('style');

                gIFrame.width = returnParcels[0].size[0];
                gIFrame.height = returnParcels[0].size[1];

                SpaceCamp.services.RenderService.render(iFrame.contentDocument, returnParcels[0].targeting.pubKitAdId);
            });
        });
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        TimerService = SpaceCamp.services.TimerService;

        //? if (DEBUG) {
        var results = ConfigValidators.PostGptLayer(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __lineItemDisablerTargeting = configs.lineItemDisablerTargeting;

        __desktopGlobalTimeout = configs.desktopGlobalTimeout;
        __mobileGlobalTimeout = configs.mobileGlobalTimeout;

        if (SpaceCamp.DeviceTypeChecker.getDeviceType() === 'mobile') {
            SpaceCamp.globalTimeout = __mobileGlobalTimeout;
        } else {
            SpaceCamp.globalTimeout = __desktopGlobalTimeout;
        }

        __htSlotMapper = HtSlotMapper(configs.slotMapping);

        baseClass._setDirectInterface('PostGptLayer', {
            display: display
        });
    })();

    var derivedClass = {

        //? if (DEBUG) {
        __type__: 'PostGptLayer',
        //? }

        //? if (TEST) {
        __htSlotMapper: __htSlotMapper,
        __lineItemDisablerTargeting: __lineItemDisablerTargeting,
        //? }

        //? if (TEST) {
        display: display,
        __displayFallbackAd: __displayFallbackAd
        //? }
    };

    return Classify.derive(baseClass, derivedClass);
}

module.exports = PostGptLayer;
