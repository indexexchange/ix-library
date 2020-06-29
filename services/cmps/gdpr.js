'use strict';

var Utilities = require('utilities.js');
var Cmp = require('cmp.js');
var Classify = require('classify.js');
var System = require('system.js');

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function Gdpr(configs) {

    var __CMP_CHECK_INTERVAL = 250;

    var __CMP_WINDOW_FUCTION = '__cmp';

    var __CMP_COMMAND = 'getConsentData';

    var __CMP_FRAME_MESSAGE_PROPERTY = '__cmpReturn';

    var __CMP_FRAME_CONTEXT_PROPERTY = '__cmpLocator';

    var __baseClass;

    var __complianceTimeout;

    function __cmpCallback(result) {
        var type = Utilities.getType(result);

        if (type === 'undefined') {
            return false;
        }

        //? if (DEBUG) {
        Scribe.info('CMP callback received result: ' + JSON.stringify(result));
        //? }

        if (type === 'string') {
            //? if (DEBUG) {
            Scribe.info('CMP result interpreted as string');
            //? }
            __baseClass._dataModel.consentString.value = result;
            __baseClass._obtainedConsent = true;
        } else if (type === 'object') {
            //? if (DEBUG) {
            Scribe.info('CMP result interpreted as object');
            //? }

            __baseClass._interpretResultObject(result);
            __baseClass._obtainedConsent = true;
        } else {
            //? if (DEBUG) {
            Scribe.warn('CMP result had unexpected type: ' + type);
            //? }
        }

        __baseClass._defer.resolve();

        return true;
    }

    function _callInWindow(windowFunction, command, argument, callback) {
        return function () {
            var callOnce = function () {
                return __baseClass._callInWindow(__CMP_WINDOW_FUCTION, __CMP_COMMAND, null, callback)();
            };

            var result = callOnce();

            if (__complianceTimeout > 0) {

                var cmpCallIntervalId = window.setInterval(callOnce, __CMP_CHECK_INTERVAL);

                __baseClass._cleanup = function () {
                    window.clearInterval(cmpCallIntervalId);
                };
            }

            return result;
        };
    }

    function _messageListener(event) {
        return __baseClass._messageListener(event, __CMP_FRAME_MESSAGE_PROPERTY, __cmpCallback, _messageListener);
    }

    function getConsent() {
        return __baseClass.getConsent(__baseClass._dataModel);
    }

    function hasObtainedConsent() {
        return __baseClass._obtainedConsent;
    }

    function getPromise() {
        return __baseClass._defer.promise;
    }

    function runCleanup() {
        __baseClass._cleanup();
    }

    function setApplies(applies) {
        __baseClass._dataModel.applies.value = applies;
    }

    (function __constructor() {
        __baseClass = Cmp();

        __complianceTimeout = configs.timeout;

        __baseClass._registerCustomFunction(configs.customFn);

        __baseClass._dataModel = {
            applies: {
                type: 'boolean',
                default: configs.gdprAppliesDefault,
                properties: {
                    'v1.1': 'gdprApplies',
                    'v1.0': 'isUserInEu'
                }
            },
            consentString: {
                type: 'string',
                default: '',
                properties: ['consentData']
            },
            version: {
                type: 'number',
                default: 1
            }
        };

        __baseClass._addRetriever(
            __baseClass._callCustomFunction(__cmpCallback)
        );

        __baseClass._addRetriever(
            _callInWindow(__CMP_WINDOW_FUCTION, __CMP_COMMAND, null, __cmpCallback)
        );

        __baseClass._postMessageId = System.generateUniqueId();

        __baseClass._addRetriever(
            __baseClass._callInFrame(__CMP_FRAME_CONTEXT_PROPERTY,
                {
                    __cmpCall: {
                        command: __CMP_COMMAND,
                        parameter: null,
                        callId: __baseClass._postMessageId
                    }
                },
                _messageListener)
        );
    })();

    var derivedClass = {

        __type__: 'Gdpr',

        getConsent: getConsent,
        hasObtainedConsent: hasObtainedConsent,
        getPromise: getPromise,
        setApplies: setApplies,
        runCleanup: runCleanup,

        //? if (TEST) {
        __baseClass: __baseClass,
        __cmpCallback: __cmpCallback
        //? }
    };

    return Classify.derive(__baseClass, derivedClass);
}

module.exports = Gdpr;