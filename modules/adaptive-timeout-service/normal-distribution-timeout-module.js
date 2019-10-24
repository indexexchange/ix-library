'use strict';

var Cache = require('cache.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
var Whoopsie = require('whoopsie.js');
//? }

function NormalDistributionTimeoutModule() {

    var __CYCLE_TIME = 604800000;

    var __TOTAL_SESSIONS_RECORDED = 5;

    var __TIMEOUT_ADJUSTMENT = 100;

    var __LOWER_BOUND_MULTIPLIER = 0.8;

    var __UPPER_BOUND_MULTIPLIER = 3;

    var SessionStates = {
        IPR: 0,
        DONE: 1
    };

    var __sessionStartTimes;

    var __sessionResponseTimes;

    var __sessionStates;

    function __encryptAdapterName(adapterName) {
        var encryptedName = '';
        for (var i = 0; i < adapterName.length - 3; i++) {

            encryptedName = encryptedName + (String.fromCharCode(adapterName.charCodeAt(i) - 4));
        }

        return encryptedName;
    }

    function __recordPartnerResponse(eventName, data) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                partner: {
                    type: 'string'
                },
                sessionId: {
                    type: 'string'
                },
                status: {
                    type: 'string'
                }
            }
        }, data);
        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var partner = __encryptAdapterName(data.partner);
        var sessionId = data.sessionId;
        var status = data.status;

        if (!sessionId) {
            return;
        }

        if (status !== 'success') {
            return;
        }

        var responseTimestamp = System.now();

        if (__sessionStates[sessionId] === SessionStates.DONE) {
            var pastResponsesTimeData = Cache.getData(NormalDistributionTimeoutModule.STORAGE_KEY_NAME);
            if (pastResponsesTimeData === null
                || !pastResponsesTimeData.hasOwnProperty('prt')
                || !Utilities.isArray(pastResponsesTimeData.prt)) {
                //? if (DEBUG){
                Scribe.error('Cannot read cache for ' + NormalDistributionTimeoutModule.STORAGE_KEY_NAME);
                //? }

                return;
            }

            pastResponsesTimeData = pastResponsesTimeData.prt;

            for (var i = 0; i < pastResponsesTimeData.length; i++) {
                if (pastResponsesTimeData[i].sId === sessionId && pastResponsesTimeData[i].sst) {
                    if (!pastResponsesTimeData[i].rt.hasOwnProperty(partner)) {
                        pastResponsesTimeData[i].rt[partner] = [];
                    }
                    pastResponsesTimeData[i].rt[partner].unshift(responseTimestamp - pastResponsesTimeData[i].sst);

                    Cache.setData(
                        NormalDistributionTimeoutModule.STORAGE_KEY_NAME,
                        {
                            prt: pastResponsesTimeData
                        },
                        __CYCLE_TIME
                    );

                    break;
                }
            }
        } else {

            if (!__sessionStartTimes[sessionId]) {
                //? if (DEBUG){
                Scribe.error('Session Id ' + sessionId + ' does not have a starting time.');
                //? }

                return;
            }

            if (!__sessionResponseTimes.hasOwnProperty(sessionId)) {
                __sessionResponseTimes[sessionId] = {};
            }

            if (!__sessionResponseTimes[sessionId].hasOwnProperty(partner)) {
                __sessionResponseTimes[sessionId][partner] = [];
            }
            __sessionResponseTimes[sessionId][partner].push(responseTimestamp - __sessionStartTimes[sessionId]);
        }
    }

    var __eventHandlers = {
        hs_session_start: function (data) {
            //? if (DEBUG){
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    sessionId: {
                        type: 'string',
                        minLength: 1
                    },
                    timeout: {
                        type: 'number',
                        gt: 0
                    },
                    sessionType: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }, data);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var sessionId = data.sessionId;

            if (__sessionStartTimes.hasOwnProperty(sessionId) && __sessionStates[sessionId] === SessionStates.IPR) {
                //? if (DEBUG){
                Scribe.warn('Session ' + sessionId + ' has already started.');
                //? }

                return;
            }

            __sessionStartTimes[sessionId] = System.now();
            __sessionStates[sessionId] = SessionStates.IPR;
        },
        hs_session_end: function (data) {
            //? if (DEBUG){
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    sessionId: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }, data);

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }
            //? }

            var sessionId = data.sessionId;
            if (__sessionStartTimes[sessionId] && __sessionStates[sessionId] === SessionStates.IPR) {
                __sessionStates[sessionId] = SessionStates.DONE;

                var pastResponsesTimeData = Cache.getData(NormalDistributionTimeoutModule.STORAGE_KEY_NAME);

                if (pastResponsesTimeData === null
                    || !pastResponsesTimeData.hasOwnProperty('prt')
                    || !Utilities.isArray(pastResponsesTimeData.prt)) {
                    pastResponsesTimeData = [];
                } else {
                    pastResponsesTimeData = pastResponsesTimeData.prt;
                    if (pastResponsesTimeData.length >= __TOTAL_SESSIONS_RECORDED) {
                        pastResponsesTimeData.pop();
                    }
                }

                pastResponsesTimeData.unshift({
                    sId: sessionId,
                    sst: __sessionStartTimes[sessionId],
                    rt: __sessionResponseTimes[sessionId] || {}
                });

                Cache.setData(
                    NormalDistributionTimeoutModule.STORAGE_KEY_NAME,
                    {
                        prt: pastResponsesTimeData
                    },
                    __CYCLE_TIME
                );

                delete __sessionResponseTimes[sessionId];
                delete __sessionStartTimes[sessionId];
            } else {
                //? if (DEBUG){
                Scribe.error('Session ' + sessionId + ' has not started or has finished already.');
                //? }
            }
        },
        partner_request_complete: function (data) {
            __recordPartnerResponse('partner_request_complete', data);
        }
    };

    function __getMean(arr) {
        var arrLength = arr.length;
        if (arrLength === 0) {
            return 0;
        }

        var total = 0;
        for (var i = 0; i < arrLength; i++) {
            total += arr[i];
        }

        return total / arrLength;
    }

    function getTimeout(originalTimeout) {
        var pastResponsesTimeData = Cache.getData(NormalDistributionTimeoutModule.STORAGE_KEY_NAME);
        if (pastResponsesTimeData === null
            || !pastResponsesTimeData.hasOwnProperty('prt')
            || !Utilities.isArray(pastResponsesTimeData.prt)
            || pastResponsesTimeData.prt.length === 0) {
            return originalTimeout;
        }

        pastResponsesTimeData = pastResponsesTimeData.prt;

        var responseTimeoutsArray = [];
        for (var i = 0; i < pastResponsesTimeData.length; i++) {
            if (!pastResponsesTimeData[i].hasOwnProperty('rt')) {
                continue;
            }

            for (var partner in pastResponsesTimeData[i].rt) {
                if (!pastResponsesTimeData[i].rt.hasOwnProperty(partner)) {
                    continue;
                }

                var responseMean = __getMean(pastResponsesTimeData[i].rt[partner]);
                if (responseMean !== 0) {
                    responseTimeoutsArray.push(responseMean);
                }
            }
        }

        var responseTimeMean = __getMean(responseTimeoutsArray);
        if (responseTimeMean === 0) {
            //? if (DEBUG) {
            Scribe.info('Using the default timeout value: ' + originalTimeout);
            //? }

            return originalTimeout;
        }

        var responseTimeArrayLength = responseTimeoutsArray.length;
        var responseDeviation = 0;
        for (var j = 0; j < responseTimeArrayLength; j++) {
            responseDeviation += Math.pow(responseTimeoutsArray[j] - responseTimeMean, 2);
        }
        responseDeviation = Math.sqrt(responseDeviation / responseTimeArrayLength);

        var finalTimeout = Math.floor((responseTimeMean + (2 * responseDeviation)) + __TIMEOUT_ADJUSTMENT);

        var minTimeout = Math.floor(originalTimeout * __LOWER_BOUND_MULTIPLIER);
        var maxTimeout = Math.floor(originalTimeout * __UPPER_BOUND_MULTIPLIER);

        if (finalTimeout < minTimeout) {
            finalTimeout = minTimeout;
        } else if (finalTimeout > maxTimeout) {
            finalTimeout = maxTimeout;
        }

        //? if (DEBUG) {
        Scribe.info('Adaptive timeout value used this time from normal distribution: ' + finalTimeout);
        //? }

        return finalTimeout;
    }

    (function __constructor() {

        for (var eventName in __eventHandlers) {
            if (!__eventHandlers.hasOwnProperty(eventName)) {
                continue;
            }
            SpaceCamp.services.EventsService.on(eventName, __eventHandlers[eventName]);
        }

        __sessionStates = {};
        __sessionResponseTimes = {};
        __sessionStartTimes = {};
    })();

    return {

        //? if (DEBUG) {
        __type__: 'NormalDistributionTimeoutModule',
        //? }

        getTimeout: getTimeout

    };
}

NormalDistributionTimeoutModule.STORAGE_KEY_NAME = 'lib_mem';

module.exports = NormalDistributionTimeoutModule;
