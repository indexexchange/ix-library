'use strict';

var Browser = require('browser.js');
var LocalCache = require('cache.js');
var Network = require('network.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');

var EventsService;

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
var Whoopsie = require('whoopsie.js');
//? }

function IdentityPartnerFactory(partnerModule, validatedConfigs) {

    var __partnerProfile;

    var __partnerId;

    var __partnerStatsId;

    var __partnerApi;

    var __identityStore;

    var __identityEbKv;

    var __retrieveResolve;

    var __storageKey;

    var __isRegisterCalled;

    function __validateEid(data) {
        if (!data || !data.uids || !Utilities.isString(data.source) || !Utilities.isArray(data.uids)) {
            return false;
        }

        return data.uids.every(function (e) {
            return !Utilities.isEmpty(e) && e.id;
        });
    }

    //? if (DEBUG) {

    function __validateResponseType(type) {
        if (['match', 'pass', 'error'].indexOf(type) === -1) {
            throw Whoopsie('INVALID_VALUE', 'Type must be one of "match", "pass", or "error".');
        }
    }
    //? }

    //? if (DEBUG) {

    function __validateResponseData(data) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                source: {
                    type: 'string',
                    eq: __partnerProfile.source
                },
                uids: {
                    type: 'array',
                    optional: true,
                    items: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string'
                            },
                            ext: {
                                type: 'object',
                                optional: true
                            }
                        }
                    }
                }
            }
        }, data);

        if (!results.valid) {
            throw Whoopsie('INVALID_VALUE', results.format());
        }
    }
    //? }

    function __registerRetrieval(type, data) {
        //? if (DEBUG) {
        __validateResponseType(type);
        if (type === 'match') {
            __validateResponseData(data);
        }
        //? }

        var eventName = {
            match: 'hs_identity_response',
            pass: 'hs_identity_pass',
            error: 'hs_identity_error'
        }[type];

        EventsService.emit(eventName, {
            statsId: __partnerStatsId
        });

        EventsService.emit('ip_module_result_' + __partnerId, type, data);

        if (type === 'match') {

            __identityStore = data;
        }

        if (__retrieveResolve) {
            __retrieveResolve();
        }
    }

    function __registerResponseRetrieval(type, data) {

        if (__isRegisterCalled) {
            //? if (DEBUG) {
            Scribe.warn('Multiple calls to retrieve registers, API.register*() family of methods should only be called once per retrieve event!');
            //? }

            return;
        }

        __isRegisterCalled = true;

        //? if (DEBUG) {
        __validateResponseType(type);
        if (type === 'match') {
            __validateResponseData(data);
        }
        //? }

        var cacheData = {
            response: type,
            data: data
        };
        var expiry = __partnerProfile.cacheExpiry[type];
        LocalCache.setData(__storageKey, cacheData, expiry);

        __registerRetrieval(type, data);
    }

    function __apiUtilityGetIdentityResultFrom(partnerName) {

        var cache = LocalCache.getData(partnerName);

        if (cache && cache.response === 'match' && cache.data) {
            return cache.data;
        }

        return null;
    }

    function __apiUtilityGuardedAjax(args) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                url: {
                    type: 'string',
                    pattern: 'url'
                },
                method: {
                    type: 'string',
                    pattern: /(GET|POST)/
                },
                onSuccess: {
                    type: 'function',
                    optional: true
                },
                onTimeout: {
                    type: 'function',
                    optional: true
                },
                onFailure: {
                    type: 'function',
                    optional: true
                },
                timeout: {
                    type: 'integer',
                    gte: 0,
                    optional: true
                },
                data: {
                    type: ['object', 'string'],
                    optional: true
                },
                contentType: {
                    type: ['string', 'boolean'],
                    optional: true
                }
            }
        }, args);

        if (!results.valid) {
            throw Whoopsie('INVALID_VALUE', results.format());
        }
        //? }

        var filteredArgs = {
            url: args.url,
            method: args.method,
            async: true,
            withCredentials: true,
            jsonp: false,
            continueAfterTimeout: false,
            timeout: args.timeout || 0
        };

        if (args.onSuccess) {
            filteredArgs.onSuccess = args.onSuccess;
        }

        if (args.onTimeout) {
            filteredArgs.onTimeout = args.onTimeout;
        }

        if (args.onFailure) {
            filteredArgs.onFailure = args.onFailure;
        }

        if (typeof args.data !== 'undefined') {
            filteredArgs.data = args.data;
        }

        if (typeof args.contentType !== 'undefined') {
            filteredArgs.contentType = args.contentType;
        }

        return Network.ajax(filteredArgs);
    }

    function __apiRegisterEbTargeting(kv) {
        //? if (DEBUG) {
        if (kv && !Utilities.isObject(kv)) {
            throw Whoopsie('INVALID_VALUE', 'Key-value must be an object if set.');
        }
        //? }

        __identityEbKv = kv;
    }

    function getStatsId() {
        return __partnerStatsId;
    }

    function getResults() {
        return __identityStore;
    }

    function getTargets() {
        if (__identityEbKv) {
            return __identityEbKv;
        } else if (__identityStore && Utilities.isArray(__identityStore.uids) && __identityStore.uids.length && __identityStore.uids[0].id) {
            var kv = {};
            kv[__partnerProfile.targetingKeys.exchangeBidding] = __identityStore.uids[0].id;

            return kv;
        }

        return null;
    }

    function retrieve() {
        return new Prms(function (resolve) {
            __retrieveResolve = resolve;

            var cachedData = LocalCache.getData(__storageKey);
            if (cachedData) {

                if (cachedData.response !== 'match' || __validateEid(cachedData.data)) {
                    //? if (DEBUG) {
                    Scribe.info('Cache hit for ' + __partnerId + ', retrieving using cached value.');
                    //? }

                    EventsService.emit('hs_identity_cached', {
                        statsId: __partnerStatsId
                    });

                    __registerRetrieval(cachedData.response, cachedData.data);

                    return;
                }

                //? if (DEBUG) {
                Scribe.warn('Invalid data cached for ' + __partnerId + ', ignoring value and re-retrieving from partner module.');
                //? }
            }

            //? if (DEBUG) {
            Scribe.info('Cache miss for ' + __partnerId + ', retrieving using partner module retrieve.');
            //? }

            EventsService.emit('hs_identity_request', {
                statsId: __partnerStatsId
            });

            __isRegisterCalled = false;

            EventsService.emit('ip_module_retrieve_' + __partnerId);
        });
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;

        //? if (DEBUG) {
        var validationError = ConfigValidators.IdentityPartnerModule(partnerModule);

        if (validationError) {
            throw Whoopsie('INVALID_VALUE', validationError);
        }
        //? }

        __partnerProfile = partnerModule.profile;
        __partnerId = __partnerProfile.partnerId;
        __partnerStatsId = __partnerProfile.statsId;

        __identityStore = null;
        __identityEbKv = null;
        __retrieveResolve = null;
        __storageKey = __partnerId;

        __partnerApi = {
            Utilities: {

                buildUrl: Network.buildUrl,
                getPageUrl: Browser.getPageUrl,
                getProtocol: Browser.getProtocol,
                getReferrer: Browser.getReferrer,
                getTime: System.now,
                getType: Utilities.getType,
                isArray: Utilities.isArray,
                isEmpty: Utilities.isEmpty,
                isFunction: Utilities.isFunction,
                isInteger: Utilities.isInteger,
                isNumeric: Utilities.isNumeric,
                isString: Utilities.isString,
                isObject: Utilities.isObject,
                isTopFrame: Browser.isTopFrame,
                isXhrSupported: Network.isXhrSupported,

                getIdentityResultFrom: __apiUtilityGetIdentityResultFrom,
                ajax: __apiUtilityGuardedAjax
            },

            onRetrieve: EventsService.on.bind(null, 'ip_module_retrieve_' + __partnerId),
            onResult: EventsService.on.bind(null, 'ip_module_result_' + __partnerId),

            registerMatch: __registerResponseRetrieval.bind(null, 'match'),
            registerPass: __registerResponseRetrieval.bind(null, 'pass'),
            registerError: __registerResponseRetrieval.bind(null, 'error'),
            registerEbTargeting: __apiRegisterEbTargeting,

            configs: validatedConfigs
        };

        partnerModule.main(__partnerApi);
    })();

    return {

        //? if (DEBUG) {
        __type__: 'IdentityPartnerFactory',
        //? }

        //? if (TEST) {
        __partnerProfile: __partnerProfile,
        __partnerApi: __partnerApi,
        get __identityStore() {
            return __identityStore;
        },
        set __identityStore(val) {
            __identityStore = val;
        },
        get __identityEbKv() {
            return __identityEbKv;
        },
        set __identityEbKv(val) {
            __identityEbKv = val;
        },
        get __retrieveResolve() {
            return __retrieveResolve;
        },
        set __retrieveResolve(val) {
            __retrieveResolve = val;
        },
        //? }

        //? if (TEST) {
        __validateEid: __validateEid,
        __registerResponseRetrieval: __registerResponseRetrieval,
        get __registerRetrieval() {
            return __registerRetrieval;
        },
        set __registerRetrieval(val) {
            __registerRetrieval = val;
        },
        //? }

        getStatsId: getStatsId,
        getResults: getResults,
        getTargets: getTargets,
        retrieve: retrieve
    };
}

module.exports = IdentityPartnerFactory;
