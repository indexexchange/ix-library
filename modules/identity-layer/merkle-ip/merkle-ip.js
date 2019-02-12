'use strict';

var Browser = require('browser.js');
var Cache = require('cache.js');
var Network = require('network.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var Whoopsie = require('whoopsie.js');

var EventsService;

//? if (DEBUG) {
var PartnerSpecificValidator = require('merkle-ip-validator.js');
var Scribe = require('scribe.js');
//? }

function MerkleIp(configs) {
    if (!Network.isXhrSupported()) {
        //? if (DEBUG) {
        Scribe.warn('Identity Partner MerkleIp requires AJAX support. Aborting instantiation.');
        //? }

        return null;
    }

    var __profile;

    var __baseUrl;

    var __pubId;

    var __authorizationToken;

    var __identitySource;

    var __identityStore;

    var __storageKey;

    function __setPpid(ppid) {
        __identityStore = {
            source: __identitySource,
            uids: [
                {
                    id: ppid
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
                    __setPpid(cachedData.ppid);
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
                    ptk: __authorizationToken,
                    pubid: __pubId
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

                    if (!responseObj.hasOwnProperty('ppid')) {
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

                    __setPpid(responseObj.ppid);

                    Cache.setData(
                        __storageKey, {
                            response: 'match',
                            ppid: responseObj.ppid
                        },
                        __profile.features.identityDataExpiry.match
                    );

                    resolve();
                },

                onFailure: function (statusCode) {
                    if (statusCode === 404) {
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
            partnerId: 'MerkleIp',
            statsId: 'MRKL',
            version: '1.1.0',
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

        __baseUrl = Browser.getProtocol() + '//mid.rkdms.com/ids';
        __authorizationToken = '17c1789b-e660-493b-aa74-3c8fb990dc5f';
        __pubId = configs.pubid;

        __identitySource = 'merkleinc.com';
        __storageKey = 'MerkleIp';
        __identityStore = null;
    })();

    return {

        //? if (DEBUG) {
        __type__: 'MerkleIp',
        //? }

        //? if (TEST) {
        __profile: __profile,
        __baseUrl: __baseUrl,
        __pubId: __pubId,
        __authorizationToken: __authorizationToken,
        __identityStore: __identityStore,
        //? }

        //? if (TEST) {
        __setPpid: __setPpid,
        //? }

        getStatsId: getStatsId,
        getResults: getResults,

        retrieve: retrieve
    };
}

module.exports = MerkleIp;
