'use strict';

var Browser = require('browser.js');
var LocalCache = require('cache.js');
var Network = require('network.js');
var Prms = require('prms.js');
var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');

var ComplianceService;
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

    var __consentProvided;

    var __retrieveResolve;

    var __storageKey;

    var __isRegisterCalled;

    function __validateEid(data) {
        if (!data || !data.uids || !Utilities.isString(data.source) || !Utilities.isArray(data.uids)) {
            return false;
        }

        return data.uids.every(function (e) {
            return Boolean(!Utilities.isEmpty(e) && e.id);
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
            version: __partnerProfile.version
        };

        if (type !== 'pass') {
            cacheData.data = data;
        }

        if (Object.keys(__consentProvided).length) {
            cacheData.consent = __consentProvided;
        }

        var expiry = __partnerProfile.cacheExpiry[type];
        LocalCache.setData(__storageKey, cacheData, expiry);

        __registerRetrieval(type, data);

        if (__retrieveResolve) {
            __retrieveResolve();
        }
    }

    function __apiUtilityGetConsent(type) {
        if (!ComplianceService.isPrivacyEnabled()) {
            return null;
        }

        if (type === 'gdpr') {
            var consent = ComplianceService.gdpr.getConsent();

            if (consent && consent.consentString) {
                __consentProvided.gdpr = true;
            }

            return consent;
        }

        //? if (DEBUG) {
        Scribe.warn('consent type invalid. consentType: ' + type);
        //? }

        return null;
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

    function __bustCacheForConsentUpdate(cache) {

        if (!__partnerProfile.consent || !ComplianceService.isPrivacyEnabled()) {
            return false;
        }

        if (cache.data.consent
            && Utilities.isArraySubset(Object.keys(__partnerProfile.consent), Object.keys(cache.data.consent))) {
            return false;
        }

        return ComplianceService.wait().then(function () {

            var shouldBust = Object.keys(__partnerProfile.consent).some(function (reg) {

                if (cache.data.consent && cache.data.consent[reg]) {
                    return false;
                }

                var data = ComplianceService[reg].getConsent();

                return data && data.consentString;
            });

            //? if (DEBUG) {
            if (shouldBust) {
                Scribe.info('Cache bust for ' + __partnerId + ': Consent update available.');
            }
            //? }

            return shouldBust;
        });
    }

    function __bustCacheForModuleUpdate(cache) {
        var shouldBust = cache.data.version !== __partnerProfile.version;

        //? if (DEBUG) {
        if (shouldBust) {
            Scribe.info('Cache bust for ' + __partnerId + ': New partner module version.');
        }
        //? }

        return shouldBust;
    }

    function __bustCacheForInvalidEids(cache) {
        var shouldBust = !__validateEid(cache.data.data);

        //? if (DEBUG) {
        if (shouldBust) {
            Scribe.warn('Cache bust for ' + __partnerId + ': Invalid Eids object in cache.');
        }
        //? }

        return shouldBust;
    }

    var __cacheBustTriggers = {
        match: [__bustCacheForInvalidEids],
        pass: [__bustCacheForConsentUpdate, __bustCacheForModuleUpdate],
        error: [__bustCacheForModuleUpdate]
    };

    function __waitForConsent() {

        if (__partnerProfile.consent && ComplianceService.isPrivacyEnabled()) {
            return ComplianceService.wait();
        }

        return null;
    }

    var __partnerRetrieveWaits = [__waitForConsent];

    function __retrieveFromCache() {
        var cache = LocalCache.getEntry(__storageKey);

        return Prms.resolve()
            .then(function () {
                if (!cache) {
                    //? if (DEBUG) {
                    Scribe.info('Cache miss for ' + __partnerId);
                    //? }

                    return null;
                }

                var triggers = __cacheBustTriggers[cache.data.response];

                if (!triggers) {
                    //? if (DEBUG) {
                    Scribe.warn('Invalid cached .response value for ' + __partnerId + ': ' + cache.data.response);
                    //? }

                    return null;
                }

                return Prms.all(triggers.map(function (trigger) {
                    return trigger.call(null, cache);
                }));
            })
            .then(function (results) {

                if (!results || results.indexOf(true) > -1) {
                    return null;
                }

                //? if (DEBUG) {
                Scribe.info('Cache hit for ' + __partnerId);
                //? }

                EventsService.emit('hs_identity_cached', {
                    statsId: __partnerStatsId
                });

                __registerRetrieval(cache.data.response, cache.data.data);

                return cache.data;
            });
    }

    function __retrieveFromPartner() {
        return Prms.resolve()
            .then(function () {

                return Prms.all(__partnerRetrieveWaits.map(function (wait) {
                    return wait.call();
                }));
            })
            .then(function () {
                return new Prms(function (resolve) {
                    EventsService.emit('hs_identity_request', {
                        statsId: __partnerStatsId
                    });

                    __isRegisterCalled = false;

                    __retrieveResolve = resolve;

                    EventsService.emit('ip_module_retrieve_' + __partnerId);
                });
            });
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
        return __retrieveFromCache().then(function (results) {
            if (!results) {
                return __retrieveFromPartner();
            }

            return null;
        });
    }

    (function __constructor() {
        ComplianceService = SpaceCamp.services.ComplianceService;
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
        __consentProvided = {};

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

                ajax: __apiUtilityGuardedAjax,
                getConsent: __apiUtilityGetConsent,
                getIdentityResultFrom: __apiUtilityGetIdentityResultFrom
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

        __cacheBustTriggers: __cacheBustTriggers,
        __partnerRetrieveWaits: __partnerRetrieveWaits,

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
        __registerResponseRetrieval: __registerResponseRetrieval,

        __bustCacheForInvalidEids: __bustCacheForInvalidEids,
        __bustCacheForConsentUpdate: __bustCacheForConsentUpdate,
        __bustCacheForModuleUpdate: __bustCacheForModuleUpdate,

        __waitForConsent: __waitForConsent,

        get __validateEid() {
            return __validateEid;
        },
        set __validateEid(val) {
            __validateEid = val;
        },
        get __retrieveFromCache() {
            return __retrieveFromCache;
        },
        set __retrieveFromCache(val) {
            __retrieveFromCache = val;
        },
        get __retrieveFromPartner() {
            return __retrieveFromPartner;
        },
        set __retrieveFromPartner(val) {
            __retrieveFromPartner = val;
        },
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