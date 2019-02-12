'use strict';

var Browser = require('browser.js');
var Cache = require('cache.js');
var Network = require('network.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Whoopsie = require('whoopsie.js');
var Utilities = require('utilities.js');

var EventsService;

//? if (DEBUG) {
var PartnerSpecificValidator = require('live-ramp-ip-validator.js');
var Scribe = require('scribe.js');
//? }

function LiveRampIp(configs) {
    if (!Network.isXhrSupported()) {
        //? if (DEBUG) {
        Scribe.warn('Identity Partner LiveRampIp requires AJAX support. Aborting instantiation.');
        //? }

        return null;
    }

    var __profile;

    var __baseUrl;

    var __partnerId;

    var __identitySource;

    var __identityStore;

    var __storageKey;

    function __setEnvelope(envelope) {
        __identityStore = {
            source: __identitySource,
            uids: [
                {
                    id: envelope,
                    ext: {
                        rtiPartner: 'idl'
                    }
                }
            ]
        };
    }

    function getStatsId() {
        return __profile.statsId;
    }

    function getResults() {
        return __identityStore;
    }

    function retrieve() {
        return new Prms(function (resolve) {
            var cachedData = Cache.getData(__storageKey);

            if (cachedData) {
                EventsService.emit('hs_identity_cached', {
                    statsId: __profile.statsId
                });

                var statsEvent;

                if (cachedData.response === 'match') {
                    statsEvent = 'hs_identity_response';
                    __setEnvelope(cachedData.envelope);
                } else if (cachedData.response === 'pass') {
                    statsEvent = 'hs_identity_pass';
                } else {
                    statsEvent = 'hs_identity_error';
                }

                EventsService.emit(statsEvent, {
                    statsId: __profile.statsId
                });

                resolve();

                return;
            }

            EventsService.emit('hs_identity_request', {
                statsId: __profile.statsId
            });

            Network.ajax({
                url: __baseUrl,
                data: {
                    pid: __partnerId,
                    rt: 'envelope'
                },
                method: 'GET',
                withCredentials: true,

                onSuccess: function (responseText) {
                    var responseObj;

                    try {
                        responseObj = JSON.parse(responseText);
                    } catch (ex) {
                        EventsService.emit('hs_identity_error', {
                            statsId: __profile.statsId
                        });

                        Cache.setData(
                            __storageKey, {
                                response: 'error'
                            },
                            __profile.features.identityDataExpiry.error
                        );

                        resolve();

                        return;
                    }

                    if (Utilities.isEmpty(responseObj)) {
                        EventsService.emit('hs_identity_pass', {
                            statsId: __profile.statsId
                        });

                        Cache.setData(
                            __storageKey, {
                                response: 'pass'
                            },
                            __profile.features.identityDataExpiry.pass
                        );

                        resolve();

                        return;
                    }

                    if (!responseObj.hasOwnProperty('envelope')) {
                        EventsService.emit('hs_identity_error', {
                            statsId: __profile.statsId
                        });

                        Cache.setData(
                            __storageKey, {
                                response: 'error'
                            },
                            __profile.features.identityDataExpiry.error
                        );

                        resolve();

                        return;
                    }

                    if (Utilities.isEmpty(responseObj.envelope)) {
                        EventsService.emit('hs_identity_pass', {
                            statsId: __profile.statsId
                        });

                        Cache.setData(
                            __storageKey, {
                                response: 'pass'
                            },
                            __profile.features.identityDataExpiry.pass
                        );

                        resolve();

                        return;
                    }

                    EventsService.emit('hs_identity_response', {
                        statsId: __profile.statsId
                    });

                    __setEnvelope(responseObj.envelope);

                    Cache.setData(
                        __storageKey, {
                            response: 'match',
                            envelope: responseObj.envelope
                        },
                        __profile.features.identityDataExpiry.match
                    );

                    resolve();
                },

                onFailure: function (statusCode) {
                    if (statusCode === 204) {
                        EventsService.emit('hs_identity_pass', {
                            statsId: __profile.statsId
                        });

                        Cache.setData(
                            __storageKey, {
                                response: 'pass'
                            },
                            __profile.features.identityDataExpiry.pass
                        );
                    } else {
                        EventsService.emit('hs_identity_error', {
                            statsId: __profile.statsId
                        });

                        Cache.setData(
                            __storageKey, {
                                response: 'error'
                            },
                            __profile.features.identityDataExpiry.error
                        );
                    }

                    resolve();
                }
            });
        });
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;

        __profile = {
            partnerId: 'LiveRampIp',
            statsId: 'LVRAMP',
            version: '1.0.0',
            features: {
                identityDataExpiry: {
                    match: 86400000,
                    pass: 86400000,
                    error: 86400000
                }
            }
        };

        //? if (DEBUG) {
        var results = PartnerSpecificValidator(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __baseUrl = Browser.getProtocol() + '//api.rlcdn.com/api/identity';
        __partnerId = 2;

        __identitySource = 'liveramp.com';
        __storageKey = 'LiveRampIp';
        __identityStore = null;
    })();

    return {

        //? if (DEBUG) {
        __type__: 'LiveRampIp',
        //? }

        //? if (TEST) {
        __profile: __profile,
        __baseUrl: __baseUrl,
        __identityStore: __identityStore,
        //? }

        //? if (TEST) {
        __setEnvelope: __setEnvelope,
        //? }

        getStatsId: getStatsId,
        getResults: getResults,

        retrieve: retrieve
    };
}

module.exports = LiveRampIp;
