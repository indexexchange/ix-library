'use strict';

var Browser = require('browser.js');
var CommandQueue = require('command-queue.js');
var Loader = require('loader.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');

var ComplianceService;
var EventsService;

//? if (FEATURES.MULTIPLE_CONFIGS) {
var JsonPatch = require('jsonpatch-reduced.js');
//? }

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function IdentityShell() {

    var __configs;

    var __rtiPartnerRequestComplete = {
        emitted: false,
        args: {}
    };

    var __directInterface;

    var __fallbackShellInterface;

    var __validEvents = {
        error: 1,
        warning: 2,
        rti_partner_request_complete: 3
    };

    function subscribeEvent(eventName, once, callback) {
        var subscriptionId = '';

        try {
            if (!Utilities.isBoolean(once)) {
                EventsService.emit('error', '`once` must be a boolean');

                return subscriptionId;
            }

            if (!Utilities.isFunction(callback)) {
                EventsService.emit('error', '`callback` must be a function');

                return subscriptionId;
            }

            if (!Utilities.isString(eventName)) {
                EventsService.emit('error', '`eventName` must be a string');

                return subscriptionId;
            }

            if (!__validEvents.hasOwnProperty(eventName)) {
                EventsService.emit('error', 'Unrecognized event ' + eventName);

                return subscriptionId;
            }

            if (eventName === 'rti_partner_request_complete' && __rtiPartnerRequestComplete.emitted === true) {
                callback(eventName, __rtiPartnerRequestComplete.args);

                return subscriptionId;
            }

            var wrappingCallback = function () {
                var args = Array.prototype.slice.call(arguments);

                callback(eventName, JSON.stringify(args));
            };

            if (once) {
                subscriptionId = EventsService.once(eventName, wrappingCallback);
            } else {
                subscriptionId = EventsService.on(eventName, wrappingCallback);
            }
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while subscribing to event ' + eventName);
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);
        }

        return subscriptionId;
    }

    function unsubscribeEvent(subscriptionId) {
        try {
            if (!Utilities.isString(subscriptionId)) {
                EventsService.emit('error', '`subscriptionId` must be a string');

                return;
            }

            EventsService.off(subscriptionId);
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while unsubscribing from event ' + subscriptionId);
            Scribe.error(ex.stack);
            //? }

            EventsService.emit('error', ex);
        }
    }

    function getIdentityInfo() {
        return __directInterface.Layers.IdentityLayer.getAllPartnerResults();
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

            __directInterface = Loader(__configs).getDirectInterface();

            ComplianceService = SpaceCamp.services.ComplianceService;
            EventsService = SpaceCamp.services.EventsService;

            var sessionId = Math.random().toString(36)
                .slice(-5);
            EventsService.emit('hs_session_start', {
                sessionId: sessionId
            });
            subscribeEvent('rti_partner_request_complete', true, function (eventName, args) {
                __rtiPartnerRequestComplete = {
                    emitted: true,
                    args: args
                };
                EventsService.emit('hs_session_end', {
                    sessionId: sessionId
                });
            });

            ComplianceService.wait()
                .then(function () {
                    __directInterface.Layers.IdentityLayer.retrieve();
                })
                .catch(function (ex) {
                //? if (DEBUG) {
                    Scribe.error('Error occured while retrieving identity data.');
                    Scribe.error(ex.stack);
                //? }
                });
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred trying to load modules.');
            Scribe.error(ex);
            Scribe.error(ex.stack);
            //? }

            __fallbackShellInterface = {
                subscribeEvent: function () {
                    return '';
                },
                unsubscribeEvent: function () {}
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
    shellInterface.__type__ = 'IdentityShell';
    //? }

    shellInterface.subscribeEvent = subscribeEvent;
    shellInterface.unsubscribeEvent = unsubscribeEvent;
    shellInterface.getIdentityInfo = getIdentityInfo;

    return shellInterface;
}

//? if (!TEST) {

window[SpaceCamp.NAMESPACE] = window[SpaceCamp.NAMESPACE] || {};
window[SpaceCamp.NAMESPACE].cmd = window[SpaceCamp.NAMESPACE].cmd || [];

var cmd = window[SpaceCamp.NAMESPACE].cmd;

window[SpaceCamp.NAMESPACE] = IdentityShell();
window[SpaceCamp.NAMESPACE].cmd = CommandQueue(cmd);

//? } else {

module.exports = IdentityShell;

//? }