'use strict';

var Browser = require('browser.js');
var Cache = require('cache.js');
var Network = require('network.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Whoopsie = require('whoopsie.js');

var EventsService;

//? if (DEBUG) {
var PartnerSpecificValidator = require('adserver-org-ip-validator.js');
var Scribe = require('scribe.js');
//? }

function AdserverOrgIp(configs) {
    if (!Network.isXhrSupported()) {
        //? if (DEBUG) {
        Scribe.warn('Identity Partner AdserverOrgIp requires AJAX support. Aborting instantiation.');
        //? }

        return null;
    }

    var __profile;

    var __baseUrl;

    var __publisherId;

    var __identitySource;

    var __identityStore;

    var __storageKey;

    function __setIdentityData(data) {
        __identityStore = {
            source: __identitySource,
            uids: []
        };

        for (var sourceId in data) {
            if (!data.hasOwnProperty(sourceId)) {
                continue;
            }

            __identityStore.uids.push({
                id: data[sourceId],
                ext: {
                    rtiPartner: sourceId
                }
            });
        }
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
                    __setIdentityData(cachedData.data);
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
                    ttd_pid: 'casale',
                    fmt: 'json',
                    p: __publisherId
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

                    if (!responseObj.hasOwnProperty('TDID')) {
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

                    EventsService.emit('hs_identity_response', {
                        statsId: __profile.statsId
                    });

                    __setIdentityData(responseObj);

                    Cache.setData(
                        __storageKey, {
                            response: 'match',
                            data: responseObj
                        },
                        __profile.features.identityDataExpiry.match
                    );

                    resolve();
                },

                onFailure: function (statusCode) {
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
                }
            });
        });
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;

        __profile = {
            partnerId: 'AdserverOrgIp',
            statsId: 'ADSORG',
            version: '1.0.0',
            features: {
                identityDataExpiry: {
                    match: 604800000,
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

        __baseUrl = Browser.getProtocol() + '//match.adsrvr.org/track/rid';
        __publisherId = configs.publisherId;

        __identitySource = 'adserver.org';
        __storageKey = 'AdserverOrgIp';
        __identityStore = null;
    })();

    return {

        //? if (DEBUG) {
        __type__: 'AdserverOrgIp',
        //? }

        //? if (TEST) {
        __profile: __profile,
        __baseUrl: __baseUrl,
        __identityStore: __identityStore,
        //? }

        //? if (TEST) {
        __setIdentityData: __setIdentityData,
        //? }

        getStatsId: getStatsId,
        getResults: getResults,

        retrieve: retrieve
    };
}

module.exports = AdserverOrgIp;
