'use strict';

var Browser = require('browser.js');
var CommandQueue = require('command-queue.js');
var GptHelper = require('gpt-helper.js');
var Loader = require('loader.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var UserAgentMatcher = require('user-agent-matcher.js');

var ComplianceService;

//? if (FEATURES.MULTIPLE_CONFIGS) {
var JsonPatch = require('jsonpatch-reduced.js');
//? }

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function PostGptShell() {

    var __configs;

    var __lineItemDisablerTargeting;

    var __directInterface;

    var __fallbackShellInterface;

    function __findGSlot(iFrame) {
        var divId = iFrame.parentElement.parentElement.getAttribute('id');
        var slots = GptHelper
            .getGpt()
            .pubads()
            .getSlots();

        for (var i = 0; i < slots.length; i++) {
            if (slots[i].getSlotElementId() === divId) {
                return slots[i];
            }
        }
    }

    function __displayFallbackAd(googleSlot) {
        if (!UserAgentMatcher.msie && !UserAgentMatcher.msedge) {
            googleSlot.setTargeting(__lineItemDisablerTargeting.key, __lineItemDisablerTargeting.value);

            GptHelper.run(function () {
                window.parent.googletag.pubads().refresh([googleSlot]);
            }, window.parent.googletag);
        } else {
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

                var adUnitPath = googleSlot.getAdUnitPath();
                var sizes = [];
                googleSlot.getSizes().map(function (size) {
                    sizes.push([size.getWidth(), size.getHeight()]);
                });
                var targeting = googleSlot.getTargetingMap();

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
    }

    function display(iFrame) {
        var slot = __findGSlot(iFrame);

        try {
            var adIFrame = Browser.createHiddenIFrame(null, window);
            var gIFrame = window.frameElement;

            __directInterface.Layers.PostGptLayer.display(slot, adIFrame, gIFrame).catch(function (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occurred while displaying ad, displaying fallback.');
                Scribe.error(ex.stack);
                //? }

                try {
                    __displayFallbackAd(slot);
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Error occurred while displaying fallback ad.');
                    Scribe.error(ex.stack);
                    //? }
                }
            });
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while displaying ad, displaying fallback.');
            Scribe.error(ex.stack);
            //? }

            try {
                __displayFallbackAd(slot);
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occurred while displaying fallback ad.');
                Scribe.error(ex);
                //? }
            }
        }
    }

    (function __constructor() {
        try {

            /*?
            write('__configs = ');
            if(__CONFIG_WINDOW_GLOBAL__) {
                write('window.');
                write(__CONFIG_WINDOW_GLOBAL__);
            } else if(__CONFIGS__) {
                write(JSON.stringify(__CONFIGS__, null, 4));
            } else {
                write('{}');
            }
            write(';');
            */

            //? if (FEATURES.MULTIPLE_CONFIGS) {
            /*?
            if(__CONFIG_PATCHES__) {
                write('var configPatches = ');
                write(JSON.stringify(__CONFIG_PATCHES__, null, 4));
                write(';');
            }
            */

            for (var i = 0; i < configPatches.length; i++) {
                var locationRegex = new RegExp(configPatches[i].regex);

                if (locationRegex.test(Browser.getPageUrl())) {
                    __configs = JsonPatch.applyPatch(__configs, configPatches[i].patch);

                    break;
                }
            }
            //? }

            __lineItemDisablerTargeting = __configs.Layers[0].configs.lineItemDisablerTargeting;
            __directInterface = Loader(__configs).getDirectInterface();

            ComplianceService = SpaceCamp.services.ComplianceService;

            //? if (FEATURES.IDENTITY) {
            try {
                __directInterface.Layers.IdentityLayer.retrieve();
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occured while retrieving identity data.');
                Scribe.error(ex.stack);
                //? }
            }
            //? }
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred trying to load modules. Defaulting to GPT with house ads.');
            Scribe.error(ex);
            //? }

            __fallbackShellInterface = {
                display: function (iFrame) {
                    __displayFallbackAd(__findGSlot(iFrame));
                }
            };
        }
    })();

    if (__fallbackShellInterface) {
        return __fallbackShellInterface;
    }

    var shellInterface = {};

    if (window[SpaceCamp.NAMESPACE]) {
        for (var prop in window[SpaceCamp.NAMESPACE]) {
            if (!window[SpaceCamp.NAMESPACE].hasOwnProperty(prop)) {
                continue;
            }

            shellInterface[prop] = window[SpaceCamp.NAMESPACE][prop];
        }
    }

    //? if (DEBUG) {
    shellInterface.__type__ = 'PreGptShell';
    //? }

    //? if (TEST) {
    shellInterface.__findGSlot = __findGSlot;
    //? }

    shellInterface.display = ComplianceService.delay(display);
    shellInterface.setSiteKeyValueData = SpaceCamp.services.KeyValueService.setSiteKeyValueData;
    shellInterface.setUserKeyValueData = SpaceCamp.services.KeyValueService.setUserKeyValueData;
    /* PubKitTemplate<PartnerExports> */

    return shellInterface;
}

//? if (!TEST) {

window[SpaceCamp.NAMESPACE] = window[SpaceCamp.NAMESPACE] || {};
window[SpaceCamp.NAMESPACE].cmd = window[SpaceCamp.NAMESPACE].cmd || [];

var cmd = window[SpaceCamp.NAMESPACE].cmd;

window[SpaceCamp.NAMESPACE] = PostGptShell();
window[SpaceCamp.NAMESPACE].cmd = CommandQueue(cmd);

//? } else {

module.exports = PostGptShell;

//? }