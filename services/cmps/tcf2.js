'use strict';

var Utilities = require('utilities.js');
var Cmp = require('cmp.js');
var Classify = require('classify.js');
var System = require('system.js');

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function Tcf2(configs) {

    var __TCF_WINDOW_FUNCTION = '__tcfapi';

    var __TCF_GET_COMMAND = 'getTCData';

    var __TCF_EVENT_COMMAND = 'addEventListener';

    var __TCF_FRAME_MESSAGE_PROPERTY = '__tcfapiReturn';

    var __TCF_FRAME_NAME = '__tcfapiLocator';

    var __eventRegistered = false;

    var __baseClass;

    function __tcfCallback(result, success) {
        var type = Utilities.getType(result);

        if (type === 'undefined' || !success) {
            return false;
        }

        //? if (DEBUG) {
        Scribe.info('TCF2 callback received result: ' + JSON.stringify(result));
        //? }

        if (type === 'object') {
            //? if (DEBUG) {
            Scribe.info('TCF2 result interpreted as object');
            //? }

            __baseClass._interpretResultObject(result);
            __baseClass._obtainedConsent = true;
        } else {
            //? if (DEBUG) {
            Scribe.warn('TCF2 result had unexpected type: ' + type);
            //? }
        }

        __baseClass._defer.resolve();

        return true;
    }

    function __eventListenerCallback(result, success) {

        if (__tcfCallback(result, success)) {

            __baseClass._removeRetriever(__TCF_GET_COMMAND);

            return true;
        }

        return false;
    }

    function __registerEventListener() {
        return function () {

            if (!__eventRegistered) {
                __baseClass._callInWindow(
                    __TCF_WINDOW_FUNCTION,
                    __TCF_EVENT_COMMAND,
                    __baseClass._getDataModelValue('version'),
                    __eventListenerCallback
                )();
                __eventRegistered = true;
            }

            return false;
        };
    }

    function _messageListener(event) {
        return __baseClass._messageListener(event, __TCF_FRAME_MESSAGE_PROPERTY, __tcfCallback, _messageListener);
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
        return __baseClass._cleanup();
    }

    (function __constructor() {
        __baseClass = Cmp();

        __baseClass._dataModel = {
            applies: {
                type: 'boolean',
                default: configs.gdprAppliesDefault,
                properties: ['gdprApplies']
            },
            consentString: {
                type: 'string',
                default: '',
                properties: ['tcString']
            },
            version: {
                type: 'number',
                default: 2,
                properties: ['tcfPolicyVersion']
            }
        };

        __baseClass._addRetriever(
            __registerEventListener(),
            __TCF_EVENT_COMMAND
        );

        __baseClass._addRetriever(
            __baseClass._callInWindow(
                __TCF_WINDOW_FUNCTION,
                __TCF_GET_COMMAND,
                __baseClass._getDataModelValue('version'),
                __tcfCallback
            ),
            __TCF_GET_COMMAND
        );

        __baseClass._postMessageId = System.generateUniqueId();

        __baseClass._addRetriever(
            __baseClass._callInFrame(__TCF_FRAME_NAME,
                {
                    __tcfapiCall: {
                        command: __TCF_GET_COMMAND,
                        parameter: null,
                        version: __baseClass._getDataModelValue('version'),
                        callId: __baseClass._postMessageId
                    }
                },
                _messageListener)
        );
    })();

    var derivedClass = {

        __type__: 'Tcf2',

        getConsent: getConsent,
        hasObtainedConsent: hasObtainedConsent,
        getPromise: getPromise,
        runCleanup: runCleanup,

        //? if (TEST) {
        __baseClass: __baseClass,
        __tcfCallback: __tcfCallback,
        __eventListenerCallback: __eventListenerCallback
        //? }
    };

    return Classify.derive(__baseClass, derivedClass);
}

module.exports = Tcf2;