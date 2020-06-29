'use strict';

var CommandQueue = require('command-queue.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');

var Ccpa = require('ccpa.js');
var Gdpr = require('gdpr.js');
var Tcf2 = require('tcf2.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var ConfigValidators = require('config-validators.js');
var Scribe = require('scribe.js');
var Whoopsie = require('whoopsie.js');
//? }

var TimerService;

function ComplianceService(configs) {

    var __cmd;

    var __status;

    var __cmps;

    var __EnumStatuses = {
        NOT_STARTED: 0,
        IN_PROGRESS: 1,
        COMPLETE: 2
    };

    var __complianceTimeout;

    var __retrievalDefer;

    var __complianceTimerId;

    function setGdprApplies(applies) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'boolean'
        }, applies);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }

        Scribe.info('Setting GDPR applicability bit to: ' + applies);
        //? }

        __cmps.Gdpr.setApplies(applies);
    }

    function getGdprConsent(version) {
        switch (parseInt(version, 10)) {
            case 2:
                return __cmps.Tcf2.getConsent();
            case 1:
                return __cmps.Gdpr.getConsent();
            default:
                if (__cmps.Tcf2.hasObtainedConsent() || !__cmps.Gdpr.hasObtainedConsent()) {
                    return __cmps.Tcf2.getConsent();
                } else {
                    return __cmps.Gdpr.getConsent();
                }
        }
    }

    function getUspConsent() {
        return __cmps.Ccpa.getConsent();
    }

    function isPrivacyEnabled() {
        return true;
    }

    function __setupCmps() {

        var enabledCmps = [
            {
                name: 'Gdpr',
                module: Gdpr
            },
            {
                name: 'Tcf2',
                module: Tcf2
            },
            {
                name: 'Ccpa',
                module: Ccpa
            }
        ];
        var promises = [];

        for (var c = 0; c < enabledCmps.length; c++) {

            var cmpName = enabledCmps[c].name;
            if (!__cmps.hasOwnProperty(cmpName) && Utilities.getType(enabledCmps[c].module) === 'function') {
                var cmp = enabledCmps[c].module(configs);
                __cmps[cmp.__type__] = cmp;
                __retrievalDefer.promise.then(cmp.runCleanup);
                promises.push(cmp.getPromise());
            }
        }

        Prms.all(promises).then(function () {
            __retrievalDefer.resolve();
        });

        var calledSuccessfully = Object.keys(__cmps).map(function (cmp) {
            return __cmps[cmp].retrieve() === true;
        });

        //? if (DEBUG) {

        if (!calledSuccessfully.length) {
            Scribe.info('No privacy method found, resolved right away');
        }
        //? }
    }

    function __retrieve() {

        if (__status !== __EnumStatuses.NOT_STARTED) {
            return;
        }

        //? if (DEBUG) {
        Scribe.info('__retrieve started()');
        //? }

        __retrievalDefer = Prms.defer();
        __status = __EnumStatuses.IN_PROGRESS;

        __retrievalDefer.promise.then(function () {

            __cmd = CommandQueue(__cmd);
            __status = __EnumStatuses.COMPLETE;
        });

        __setupCmps();

        if (__complianceTimeout === 0) {
            __retrievalDefer.resolve();
        } else if (!__complianceTimerId) {

            __complianceTimerId = TimerService.createTimer(__complianceTimeout, false, function () {
                //? if (DEBUG) {
                if (__status !== __EnumStatuses.COMPLETE) {
                    Scribe.info('Privacy APIs timed out with no result, using default');
                }
                //? }
                __retrievalDefer.resolve();
            });
        }
    }

    function __reset() {
        if (__status === __EnumStatuses.COMPLETE) {
            __status = __EnumStatuses.NOT_STARTED;
            __complianceTimerId = null;
            __complianceTimeout = 0;

            //? if (DEBUG) {
            Scribe.info('ComplianceService was __reset()');
            //? }
        }
    }

    function delay(func) {
        return function () {

            if (__status === __EnumStatuses.NOT_STARTED) {
                __retrieve();
            }

            if (__status !== __EnumStatuses.COMPLETE && __complianceTimerId) {
                TimerService.startTimer(__complianceTimerId);
            }

            var args = arguments;

            __cmd.push(function () {
                func.apply(null, args);
            });

            __retrievalDefer.promise.then(function () {
                __reset();
            });
        };
    }

    function wait() {

        if (__status === __EnumStatuses.NOT_STARTED) {
            __retrieve();
        }

        if (__status !== __EnumStatuses.COMPLETE && __complianceTimerId) {
            TimerService.startTimer(__complianceTimerId);
        }

        __retrievalDefer.promise.then(function () {
            __reset();
        });

        return __retrievalDefer.promise;
    }

    (function __constructor() {
        TimerService = SpaceCamp.services.TimerService;

        //? if (DEBUG){
        var results = ConfigValidators.ComplianceService(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __cmps = {};
        __cmd = [];
        __complianceTimeout = configs.timeout;
        __status = __EnumStatuses.NOT_STARTED;

        __retrieve();
    })();

    return {

        //? if (DEBUG) {
        __type__: 'ComplianceService',
        //? }

        gdpr: {

            getConsent: getGdprConsent,
            setApplies: setGdprApplies
        },

        usp: {

            getConsent: getUspConsent
        },

        isPrivacyEnabled: isPrivacyEnabled,
        delay: delay,
        wait: wait,

        //? if (TEST) {

        attachSpy: function (spy, method) {

            var methodCopy = eval(method + '.bind({})');
            var spied = spy(this, method).and.callFake(methodCopy);

            eval(method + '=spied;');

            return spied;
        },
        __retrieve: __retrieve,
        __reset: __reset,
        __setupCmps: __setupCmps
        //? }
    };
}

module.exports = ComplianceService;