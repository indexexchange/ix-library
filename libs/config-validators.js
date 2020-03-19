'use strict';

var Constants = require('./constants.js');
var Inspector = require('./external/schema-inspector.js');

var ConfigValidators = {
    PostGptLayer: function (configs) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                lineItemDisablerTargeting: {
                    type: 'object',
                    properties: {
                        key: {
                            type: 'string',
                            minLength: 1
                        },
                        value: {
                            type: 'array',
                            minLength: 1,
                            items: {
                                type: 'string'
                            }
                        }
                    }
                },
                desktopGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                },
                mobileGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                },
                slotMapping: {
                    type: 'object'
                }
            }
        }, configs);

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    GptLayer: function (configs) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                desktopGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                },
                mobileGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                },
                enableSingleRequest: {
                    type: 'boolean',
                    optional: true
                },
                disableInitialLoad: {
                    type: 'boolean',
                    optional: true
                },
                slotMapping: {
                    optional: true,
                    type: 'object',
                    properties: {
                        selectors: {
                            type: 'array',
                            items: {
                                type: ['array', 'string'],
                                minLength: 1,
                                items: {
                                    type: 'string',
                                    minLength: 1
                                }
                            }
                        },
                        filters: {
                            type: 'array',
                            items: {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    }
                }
            }
        }, configs);

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    IdentityLayer: function (configs, validPartnerNames) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                timeout: {
                    type: 'integer',
                    gte: 0,
                    optional: true
                },
                partners: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'object',
                            properties: {
                                configs: {
                                    type: 'object'
                                },
                                enabled: {
                                    type: 'boolean'
                                },
                                enableSetTargeting: {
                                    type: 'boolean',
                                    optional: true
                                }
                            }
                        }
                    }
                }
            }
        }, configs);

        if (!results.valid) {
            return results.format();
        }

        for (var cPartnerId in configs.partners) {
            if (!configs.partners.hasOwnProperty(cPartnerId)) {
                continue;
            }

            if (validPartnerNames.indexOf(cPartnerId) === -1) {
                return 'Identity partner ID "' + cPartnerId + '" is unrecognized';
            }
        }

        return null;
    },
    PartnersLayer: function (configs, validPartnerNames) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                prefetchOnLoad: {
                    optional: true,
                    type: 'object',
                    strict: true,
                    properties: {
                        enabled: {
                            type: 'boolean'
                        },
                        configs: {
                            optional: true,
                            type: 'object',
                            strict: true,
                            properties: {
                                dynamic: {
                                    optional: true,
                                    type: 'object',
                                    strict: true,
                                    properties: {
                                        var: {
                                            optional: true,
                                            type: 'string',
                                            minLength: 1
                                        },
                                        slotMapping: {
                                            type: 'object',
                                            strict: true,
                                            properties: {
                                                style: {
                                                    type: 'string',
                                                    eq: ['ALL', 'SINGLE']
                                                },
                                                selectors: {
                                                    type: 'array',
                                                    minLength: 1,
                                                    items: {
                                                        type: ['array', 'string'],
                                                        minLength: 1,
                                                        items: {
                                                            type: 'string',
                                                            minLength: 1
                                                        }
                                                    }
                                                },
                                                filters: {
                                                    type: 'array',
                                                    items: {
                                                        type: 'string',
                                                        minLength: 1
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                pageType: {
                                    optional: true,
                                    type: 'object',
                                    strict: true,
                                    properties: {
                                        var: {
                                            optional: true,
                                            type: 'string',
                                            minLength: 1
                                        },
                                        mapping: {
                                            type: 'object',
                                            strict: true,
                                            properties: {
                                                '*': {
                                                    type: 'array',
                                                    items: {
                                                        type: 'string',
                                                        minLength: 1
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                fixed: {
                                    optional: true,
                                    type: 'object',
                                    strict: true,
                                    properties: {
                                        htSlotNames: {
                                            type: 'array',
                                            items: {
                                                type: 'string',
                                                minLength: 1
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                bidTransformerTypes: {
                    type: 'object',
                    optional: true,
                    properties: {
                        '*': {
                            type: 'object',
                            exec: function (schema, config) {
                                if (!config) {
                                    return;
                                }

                                var result = ConfigValidators.bidTransformerConfig(config);
                                if (result !== null) {
                                    this.report(result);
                                }
                            }
                        }
                    }
                },
                partners: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'object',
                            properties: {
                                configs: {
                                    type: 'object'
                                },
                                enabled: {
                                    type: 'boolean'
                                }
                            }
                        }
                    }
                }
            }
        }, configs);

        if (!results.valid) {
            return results.format();
        }

        for (var cPartnerId in configs.partners) {
            if (!configs.partners.hasOwnProperty(cPartnerId)) {
                continue;
            }

            if (validPartnerNames.indexOf(cPartnerId) === -1) {
                return 'Partner ID "' + cPartnerId + '" is unrecognized';
            }
        }

        return null;
    },
    DirectBiddingLayer: function (configs) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                desktopGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                },
                mobileGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                }
            }
        }, configs);

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    VideoInterfaceLayer: function (configs) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                desktopVideoGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                },
                mobileVideoGlobalTimeout: {
                    type: 'integer',
                    gte: 0
                }
            }
        }, configs);

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    MediationLayer: function (configs) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                mediationLevel: {
                    type: 'string',
                    eq: ['NONE', 'HT_SLOT', 'PARTNER']
                }
            }
        }, configs);

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    PreGptLayer: function () {
        return null;
    },
    StorageLayer: function () {
        return null;
    },
    ModuleLoader: function (configs, serviceNames, layerNames) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                htSlots: {
                    type: 'object',
                    optional: true
                },
                Services: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'object'
                        }
                    }
                },
                Layers: {
                    type: 'array',
                    minLength: 1,
                    items: {
                        type: 'object',
                        properties: {
                            layerId: {
                                type: 'string',
                                minLength: 1
                            },
                            configs: {
                                type: 'object'
                            }
                        }
                    }
                }
            }
        }, configs);

        if (!result.valid) {
            return result.format();
        }

        for (var service in configs.Services) {
            if (serviceNames.indexOf(service) === -1) {
                return 'members of `configs.Services` must be one of the predefined values in `ServiceConstructors`';
            }
        }

        for (var j = 0; j < configs.Layers.length; j++) {
            if (layerNames.indexOf(configs.Layers[j].layerId) === -1) {
                return '`configs.Layers[' + j + '].layerId` must be one of the predefined values in `LayerConstructors`';
            }
        }

        return null;
    },
    HeaderTagSlot: function (configs, id) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                id: {
                    type: 'string'
                },
                divId: {
                    optional: true,
                    type: 'string'
                },
                adUnitPath: {
                    optional: true,
                    type: 'string'
                },
                sizeMapping: {
                    optional: true,
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'array',
                            minLength: 1,
                            items: {
                                type: 'array',
                                exactLength: 2,
                                items: {
                                    type: 'integer',
                                    gte: 0
                                }
                            }
                        }
                    }
                },
                targeting: {
                    optional: true,
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            '*': {
                                type: 'array',
                                minLength: 1,
                                items: {
                                    type: 'string',
                                    minLength: 1
                                }
                            }
                        }
                    }
                },
                deviceType: {
                    optional: true,
                    type: 'string',
                    minLength: 1
                },
                position: {
                    type: 'string',
                    eq: ['atf', 'btf'],
                    optional: true
                },
                type: {
                    type: 'string',
                    eq: ['INSTREAM_VIDEO', 'BANNER']
                }
            }
        }, configs);

        if (!results.valid) {
            return 'Invalid config: ' + results.format();
        }

        results = Inspector.validate({
            type: 'string',
            minLength: 1
        }, id);

        if (!results.valid) {
            return 'Invalid ID: ' + results.format();
        }

        if (!configs.hasOwnProperty('sizeMapping')) {
            return '`config` must have property "sizeMapping"';
        }

        var indexRegex = /^(\d+)x(\d+)$/;
        var keysCount = 0;

        for (var index in configs.sizeMapping) {
            if (!configs.sizeMapping.hasOwnProperty(index)) {
                continue;
            }

            if (indexRegex.test(index) === false) {
                return 'Keys of `config.sizeMapping` must be of form `widthxheight`';
            }

            keysCount++;
        }

        if (keysCount === 0) {
            return '`config.sizeMapping` must not be empty';
        }

        return null;
    },
    PartnerProfile: function (profile, requiredResources, fns) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                profile: {
                    type: 'object',
                    strict: true,
                    properties: {
                        partnerId: {
                            type: 'string',
                            minLength: 1
                        },
                        namespace: {
                            type: 'string',
                            minLength: 1
                        },
                        statsId: {
                            type: 'string',
                            minLength: 1
                        },
                        version: {
                            type: 'string',
                            minLength: 1,
                            optional: true
                        },
                        targetingType: {
                            type: 'string',
                            eq: ['page', 'slot']
                        },
                        bidUnitInCents: {
                            type: 'number',
                            gt: 0,
                            optional: true,
                            exec: function (schema, post) {
                                if ((post > 1 && post % 10 !== 0) || (post < 1 && !(/^0\.0*1$/).test(post.toString()))) {
                                    this.report('must be a power of 10');
                                }
                            }
                        },
                        enabledAnalytics: {
                            type: 'object',
                            properties: {
                                '*': {
                                    type: 'boolean'
                                }
                            }
                        },
                        features: {
                            type: 'object',
                            properties: {
                                '*': {
                                    type: 'object',
                                    strict: true,
                                    properties: {
                                        enabled: {
                                            type: 'boolean'
                                        },
                                        value: {
                                            type: 'any'
                                        }
                                    }
                                },
                                prefetchDisabled: {
                                    optional: true,
                                    type: 'object',
                                    strict: true,
                                    properties: {
                                        enabled: {
                                            type: 'boolean'
                                        }
                                    }
                                }
                            }
                        },
                        targetingKeys: {
                            type: 'object',
                            strict: true,
                            properties: {
                                id: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                om: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                pm: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                pmid: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                bidderKey: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                ybot_ad: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                ybot_size: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                ybot_cpm: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                ybot_slot: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                },
                                retargeter: {
                                    optional: true,
                                    type: 'string',
                                    minLength: 1
                                }
                            }
                        },
                        lineItemType: {
                            type: 'integer',
                            exec: function (schema, post) {
                                var validType = false;

                                for (var type in Constants.LineItemTypes) {
                                    if (!Constants.LineItemTypes.hasOwnProperty(type)) {
                                        continue;
                                    }

                                    if (Constants.LineItemTypes[type] === post) {
                                        validType = true;

                                        break;
                                    }
                                }

                                if (!validType) {
                                    this.report('must be one of the predefined values in `Constants.LineItemTypes`');
                                }
                            }
                        },
                        callbackType: {
                            type: 'integer'
                        },
                        architecture: {
                            type: 'integer'
                        },
                        parseAfterTimeout: {
                            type: 'boolean',
                            optional: true
                        },
                        requestType: {
                            type: 'integer'
                        }
                    }
                },
                requiredResources: {
                    type: ['array', 'null'],
                    items: {
                        type: 'string',
                        minLength: 1
                    }
                },
                fns: {
                    type: 'object',
                    exec: function (schema, post) {
                        for (var fnName in post) {
                            if (!post.hasOwnProperty(fnName)) {
                                continue;
                            }

                            if (typeof post[fnName] !== 'function') {
                                this.report(fnName + ' must be a function, is ' + typeof post[fnName]);
                            }
                        }

                        if (post.hasOwnProperty('retriever')) {
                            if (post.hasOwnProperty('parseResponse') || post.hasOwnProperty('generateRequestObj') || post.hasOwnProperty('adResponseCallback')) {
                                this.report('must either have retriever or the other three.');
                            }
                        } else {
                            if (!post.hasOwnProperty('parseResponse') && !post.hasOwnProperty('generateRequestObj')) {
                                this.report('must either have retriever or the other three.');
                            }
                        }
                    }
                }
            }
        }, {
            profile: profile,
            requiredResources: requiredResources,
            fns: fns
        });

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    IdentityPartnerProfile: function (profile) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                partnerId: {
                    type: 'string',
                    minLength: 1
                },
                statsId: {
                    type: 'string',
                    minLength: 1
                },
                version: {
                    type: 'string',
                    pattern: /^\d+\.\d+\.\d+$/
                },
                source: {
                    type: 'string',
                    minLength: 1
                },
                cacheExpiry: {
                    type: 'object',
                    strict: true,
                    properties: {
                        match: {
                            type: 'integer',
                            gt: 0
                        },
                        pass: {
                            type: 'integer',
                            gt: 0
                        },
                        error: {
                            type: 'integer',
                            gt: 0
                        }
                    }
                },
                targetingKeys: {
                    type: 'object',
                    strict: true,
                    properties: {
                        exchangeBidding: {
                            type: 'string',
                            minLength: 1
                        }
                    }
                },
                consent: {
                    type: 'object',
                    optional: true,
                    strict: true,
                    properties: {
                        gdpr: {
                            type: 'string',
                            minLength: 1,
                            optional: true
                        }
                    },
                    exec: function (scheme, post) {
                        if (post && !Object.keys(post)) {
                            this.report('must declare at least one consent type');
                        }
                    }
                }
            }
        }, profile);

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    IdentityPartnerModule: function (instance) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                type: {
                    type: 'string',
                    eq: 'identity'
                },
                api: {
                    type: 'string',
                    minLength: 1
                },
                main: {
                    exec: function (scheme, post) {
                        if (typeof post !== 'function') {
                            this.report('must be a function');
                        }
                    }
                },
                profile: {
                    type: 'object',
                    exec: function (scheme, post) {
                        var err = ConfigValidators.IdentityPartnerProfile(post);
                        if (err) {
                            this.report(err);
                        }
                    }
                }
            }
        }, instance);

        if (!results.valid) {
            return results.format();
        }

        return null;
    },
    partnerBaseConfig: function (configs) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                timeout: {
                    optional: true,
                    type: 'integer',
                    gte: 0
                },
                xSlots: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'object'
                        }
                    }
                },
                mapping: {
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'array',
                            items: {
                                type: 'string',
                                minLength: 1,
                                exec: function (schema, post) {
                                    if (this.origin.xSlots && !this.origin.xSlots.hasOwnProperty(post)) {
                                        this.report('`configs.mapping` must map htSlotsNames to partner slots defined in `configs.xSlots`');
                                    }
                                }
                            }
                        }
                    }
                },
                targetingKeyOverride: {
                    optional: true,
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'string',
                            minLength: 1
                        }
                    }
                },
                lineItemType: {
                    type: 'string',
                    optional: true,
                    exec: function (schema, post) {
                        if (post && !Constants.LineItemTypes.hasOwnProperty(post)) {
                            this.report(post + ' must be one of the predefined values in `Constants.LineItemTypes`');
                        }
                    }
                },
                bidTransformer: {
                    type: 'object',
                    optional: true,
                    exec: function (schema, post) {
                        if (!post) {
                            return;
                        }

                        var transformerResults = ConfigValidators.bidTransformerConfig(post);
                        if (transformerResults !== null) {
                            this.report(transformerResults);
                        }
                    }
                }
            }
        }, configs);

        if (!result.valid) {
            return result.format();
        }

        return null;
    },
    rtiPartnerBaseConfig: function () {
        return null;
    },
    bidTransformerConfig: function (configs) {
        var result = Inspector.validate({
            type: 'object',
            optional: true,
            strict: true,
            properties: {
                bidUnitInCents: {
                    type: 'number',
                    gt: 0,
                    optional: true,
                    exec: function (schema, post) {
                        if ((post > 1 && post % 10 !== 0) || (post < 1 && !(/^0\.0*1$/).test(post.toString()))) {
                            this.report('must be a power of 10');
                        }
                    }
                },
                outputCentsDivisor: {
                    type: 'number',
                    gt: 0,
                    optional: true,
                    exec: function (schema, post) {
                        if ((post > 1 && post % 10 !== 0) || (post < 1 && !(/^0\.0*1$/).test(post.toString()))) {
                            this.report('must be a power of 10');
                        }
                    }
                },
                outputPrecision: {
                    type: 'integer',
                    gte: -1,
                    optional: true
                },
                roundingType: {
                    type: 'string',
                    eq: ['NONE', 'FLOOR'],
                    optional: true
                },
                floor: {
                    type: 'integer',
                    gte: 0,
                    optional: true
                },
                buckets: {
                    type: 'array',
                    minLenth: 1,
                    items: {
                        type: 'object',
                        properties: {
                            max: {
                                type: ['integer', 'string'],
                                gt: 0,
                                exec: function (schema, post) {
                                    if (typeof post === 'string' && post !== 'infinity') {
                                        this.report('The only acceptable string for bucket max is "infinity". Please check your config.');
                                    }
                                }
                            },
                            step: {
                                type: 'integer',
                                gt: 0
                            }
                        }
                    },
                    optional: true
                }
            },
            exec: function (schema, post) {
                if (!post) {
                    return;
                }

                if ((post.hasOwnProperty('floor') && !post.hasOwnProperty('buckets'))
                    || (!post.hasOwnProperty('floor') && post.hasOwnProperty('buckets'))) {
                    this.report('`configs.floor` and `configs.buckets` must be configured together');

                    return;
                }

                if (post.hasOwnProperty('floor') && post.hasOwnProperty('buckets')) {
                    var min = post.floor;

                    for (var i = 0; i < post.buckets.length; i++) {
                        var max = post.buckets[i].max;
                        var step = post.buckets[i].step;

                        if (max === 'infinity') {
                            max = Infinity;
                        }

                        if (max <= min) {
                            this.report('`configs.buckets[' + i + '].max` is not in ascending order');

                            return;
                        }

                        if (max !== Infinity) {
                            if ((max - min) % step !== 0) {
                                this.report('`configs.buckets[' + i + '].step` must evenly divide its range');

                                return;
                            }
                        }

                        min = max;
                    }
                }
            }
        }, configs);

        if (!result.valid) {
            return result.format();
        }

        return null;
    },
    EventsService: function () {
        return null;
    },
    KeyValueService: function () {
        return null;
    },
    GptService: function () {
        return null;
    },
    HeaderStatsService: function (config) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                siteId: {
                    type: 'string',
                    minLength: 1
                },
                configId: {
                    type: 'string',
                    minLength: 1
                },
                options: {
                    type: 'object',
                    properties: {
                        auctionCycle: {
                            type: 'boolean'
                        }
                    }
                }
            }
        }, config);

        if (!result.valid) {
            return result.format();
        }

        return null;
    },
    RenderService: function (config) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                sizeRetargeting: {
                    optional: true,
                    type: 'object',
                    properties: {
                        '*': {
                            type: 'array',
                            exactLength: 2,
                            items: {
                                type: 'integer'
                            }
                        }
                    }
                }
            }
        }, config);

        if (!result.valid) {
            return result.format();
        }

        if (config.sizeRetargeting) {
            for (var sizeKey in config.sizeRetargeting) {
                if (!config.sizeRetargeting.hasOwnProperty(sizeKey)) {
                    continue;
                }

                if (!(/^[0-9]+x[0-9]+$/).test(sizeKey)) {
                    return 'Invalid sizeRetargeting key `' + sizeKey + '`, must be format `widthxheight`';
                }
            }
        }

        return null;
    },
    TimerService: function () {
        return null;
    },
    ComplianceService: function (configs) {
        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                gdprAppliesDefault: {
                    type: 'boolean'
                },
                timeout: {
                    type: 'integer',
                    gte: 0
                },
                customFn: {
                    type: 'string',
                    optional: true
                }
            }
        }, configs);

        if (!result.valid) {
            return result.format();
        }

        return null;
    },
    AdaptiveTimeoutService: function (configs) {
        var result = Inspector.validate({
            type: 'object'
        }, configs);

        if (!result.valid) {
            return result.format();
        }

        return null;
    },
    HtSlotMapper: function (config, validMappingTypes) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                selectors: {
                    type: 'array',
                    minLength: 1,
                    items: {
                        type: ['array', 'string'],
                        minLength: 1,
                        items: {
                            type: 'string',
                            minLength: 1
                        }
                    }
                },
                filters: {
                    type: 'array',
                    items: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }
        }, config);
        if (!result.valid) {
            return result.format();
        }

        for (var i = 0; i < config.selectors.length; i++) {
            var selectorSet = config.selectors[i];

            if (typeof selectorSet === 'string') {
                if (validMappingTypes.indexOf(selectorSet) === -1) {
                    return 'Unrecognized selector `' + selectorSet + '`';
                }
            } else {
                for (var j = 0; j < selectorSet.length; j++) {
                    var selector = selectorSet[j];

                    if (validMappingTypes.indexOf(selector) === -1) {
                        return 'Unrecognized selector `' + selector + '`';
                    }
                }
            }
        }

        for (var k = 0; k < config.filters.length; k++) {
            var filter = config.filters[k];

            if (validMappingTypes.indexOf(filter) === -1) {
                return 'Unrecognized filter `' + filter + '`';
            }
        }

        return null;
    },
    DeviceTypeChecker: function (configs) {
        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                method: {
                    type: 'string',
                    eq: Object.keys(Constants.DeviceTypeMethods)
                },
                configs: {
                    optional: true,
                    type: 'object'
                }
            }
        }, configs);

        if (!result.valid) {
            return result.format();
        }

        if (configs.method === 'REFERENCE') {
            result = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    reference: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }, configs.configs);
        }

        if (configs.method === 'SIZE_MAPPING') {
            result = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    sizeMapping: {
                        type: 'object',
                        properties: {
                            '*': {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    }
                }
            }, configs.configs);

            if (configs.configs.hasOwnProperty('sizeMapping')) {
                var indexRegex = /^(\d+)x(\d+)$/;
                var keysCount = 0;

                for (var index in configs.configs.sizeMapping) {
                    if (!configs.configs.sizeMapping.hasOwnProperty(index)) {
                        continue;
                    }

                    if (indexRegex.test(index) === false) {
                        return 'Keys of `configs.sizeMapping` must be of form `widthxheight`';
                    }

                    keysCount++;
                }

                if (keysCount === 0) {
                    return '`configs.sizeMapping` must not be empty';
                }
            }
        }

        if (!result.valid) {
            return result.format();
        }

        return null;
    }
};

module.exports = ConfigValidators;