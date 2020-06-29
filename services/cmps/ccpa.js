'use strict';

var Utilities = require('utilities.js');
var Cmp = require('cmp.js');
var Classify = require('classify.js');
var System = require('system.js');

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function Ccpa() {

    var __USP_WINDOW_FUNCTION = '__uspapi';

    var __USP_COMMAND = 'getUSPData';

    var __USP_FRAME_MESSAGE_PROPERTY = '__uspapiReturn';

    var __USP_FRAME_NAME = '__uspapiLocator';

    var __baseClass;

    function __uspCallback(result, success) {
        var type = Utilities.getType(result);

        if (type === 'undefined' || !success) {
            return false;
        }

        //? if (DEBUG) {
        Scribe.info('USP callback received result: ' + JSON.stringify(result));
        //? }

        if (type === 'object') {
            //? if (DEBUG) {
            Scribe.info('USP result interpreted as object');
            //? }

            __baseClass._interpretResultObject(result);
            __baseClass._obtainedConsent = true;
        } else {
            //? if (DEBUG) {
            Scribe.warn('USP result had unexpected type: ' + type);
            //? }
        }

        __baseClass._defer.resolve();

        return true;
    }

    function _messageListener(event) {
        return __baseClass._messageListener(event, __USP_FRAME_MESSAGE_PROPERTY, __uspCallback, _messageListener);
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
            version: {
                type: 'number',
                default: 1
            },
            uspString: {
                type: 'string',
                default: ''
            }
        };

        __baseClass._addRetriever(
            __baseClass._callInWindow(
                __USP_WINDOW_FUNCTION,
                __USP_COMMAND,
                __baseClass._getDataModelValue('version'),
                __uspCallback
            )
        );

        __baseClass._postMessageId = System.generateUniqueId();

        __baseClass._addRetriever(
            __baseClass._callInFrame(__USP_FRAME_NAME,
                {
                    __uspapiCall: {
                        command: __USP_COMMAND,
                        parameter: null,
                        version: __baseClass._getDataModelValue('version'),
                        callId: __baseClass._postMessageId
                    }
                },
                _messageListener)
        );
    })();

    var derivedClass = {

        __type__: 'Ccpa',

        getConsent: getConsent,
        hasObtainedConsent: hasObtainedConsent,
        getPromise: getPromise,
        runCleanup: runCleanup,

        //? if (TEST) {
        __baseClass: __baseClass,
        __uspCallback: __uspCallback
        //? }
    };

    return Classify.derive(__baseClass, derivedClass);
}

module.exports = Ccpa;