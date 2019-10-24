'use strict';

var DeviceTypeChecker = require('device-type-checker.js');
//? if (PRODUCT !== 'IdentityLibrary') {
var HeaderTagSlot = require('header-tag-slot.js');
//? }
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

var ServiceConstructors = [

    //? if (COMPONENTS.SERVICES.EVENTS) {
    {
        name: 'EventsService',
        constructor: require('events-service.js')
    },
    //? } else {
    {
        name: 'EventsService',
        constructor: require('events-service.stub.js')
    },
    //? }

    //? if (COMPONENTS.SERVICES.GPT) {
    {
        name: 'GptService',
        constructor: require('gpt-service.js')
    },
    //? } else {
    {
        name: 'GptService',
        constructor: require('gpt-service.stub.js')
    },
    //? }

    //? if (COMPONENTS.SERVICES.HEADER_STATS) {
    {
        name: 'HeaderStatsService',
        constructor: require('header-stats-service.js')
    },
    //? }

    //? if (COMPONENTS.SERVICES.TIMER) {
    {
        name: 'TimerService',
        constructor: require('timer-service.js')
    },
    //? }

    //? if (COMPONENTS.SERVICES.COMPLIANCE) {
    {
        name: 'ComplianceService',
        constructor: require('compliance-service.js')
    },
    //? } else {
    {
        name: 'ComplianceService',
        constructor: require('compliance-service.stub.js')
    },
    //? }

    //? if (COMPONENTS.SERVICES.RENDER) {
    {
        name: 'RenderService',
        constructor: require('render-service.js')
    },
    //? }

    //? if (COMPONENTS.SERVICES.ADAPTIVE_TIMEOUT) {
    {
        name: 'AdaptiveTimeoutService',
        constructor: require('adaptive-timeout-service.js')
    },
    //? }

    //? if (COMPONENTS.SERVICES.KEY_VALUE) {
    {
        name: 'KeyValueService',
        constructor: require('key-value-service.js')
    }
    //? }
];

var LayerConstructors = {
    //? if (COMPONENTS.LAYERS.POST_GPT_LAYER) {
    PostGptLayer: require('post-gpt-layer.js'),
    //? }

    //? if (COMPONENTS.LAYERS.GPT_LAYER) {
    GptLayer: require('gpt-layer.js'),
    //? }

    //? if (COMPONENTS.LAYERS.MEDIATION_LAYER) {
    MediationLayer: require('mediation-layer.js'),
    //? }

    //? if (COMPONENTS.LAYERS.PARTNERS_LAYER) {
    PartnersLayer: require('partners-layer.js'),
    //? }

    //? if (COMPONENTS.LAYERS.DIRECT_BIDDING_LAYER) {
    DirectBiddingLayer: require('direct-bidding-layer.js'),
    //? }

    //? if (COMPONENTS.LAYERS.IDENTITY_LAYER) {
    IdentityLayer: require('identity-layer.js')
    //? }
};

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Scribe = require('scribe.js');
//? }

function Loader(configs) {

    var __directInterface;

    //? if (DEBUG) {
    function __logEvent(type) {
        var args = Array.prototype.slice.call(arguments);
        args.shift();
        var fn;

        if (type === 'error') {
            fn = Scribe.error;
        } else if (type === 'warn') {
            fn = Scribe.warn;
        } else if (type === 'info') {
            fn = Scribe.info;
        } else {
            return;
        }

        for (var i = 0; i < args.length; i++) {
            fn(args[i]);
        }
    }
    //? }

    function getDirectInterface() {
        return __directInterface;
    }

    (function __constructor() {
        //? if (DEBUG) {
        var validServices = [];
        for (var k = 0; k < ServiceConstructors.length; k++) {
            validServices.push(ServiceConstructors[k].name);
        }
        var results = ConfigValidators.ModuleLoader(configs, validServices, Object.keys(LayerConstructors));

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        SpaceCamp.DeviceTypeChecker = DeviceTypeChecker(configs.DeviceTypeChecker);

        //? if (DEBUG) {
        Scribe.info('DeviceTypeChecker loaded.');
        //? }
        //? if (PRODUCT !== 'IdentityLibrary') {

        for (var htSlotName in configs.htSlots) {
            if (!configs.htSlots.hasOwnProperty(htSlotName)) {
                continue;
            }

            var htSlot = HeaderTagSlot(htSlotName, configs.htSlots[htSlotName]);

            SpaceCamp.htSlots.push(htSlot);
            SpaceCamp.htSlotsMap[htSlotName] = htSlot;

            //? if (DEBUG) {
            Scribe.info('Created htSlot "' + htSlotName + '"');
            //? }
        }
        //? }

        __directInterface = {
            Services: {},
            Layers: {}
        };

        for (var j = 0; j < ServiceConstructors.length; j++) {
            var serviceId = ServiceConstructors[j].name;

            //? if (TEST) {

            if (!configs.Services.hasOwnProperty(serviceId) && serviceId !== 'ComplianceService') {
                continue;
            }
            //? }

            var service = ServiceConstructors[j].constructor(configs.Services[serviceId]);

            if (!service) {
                continue;
            }

            //? if (DEBUG) {
            if (serviceId === 'EventsService') {
                service.on('error', __logEvent.bind(null, 'error'));
                service.on('internal_error', __logEvent.bind(null, 'error'));
                service.on('warning', __logEvent.bind(null, 'warn'));
                service.on('internal_warning', __logEvent.bind(null, 'warn'));
                service.on('info', __logEvent.bind(null, 'info'));
                service.on('internal_info', __logEvent.bind(null, 'info'));
            }
            //? }

            SpaceCamp.services[serviceId] = service;

            if (service.getDirectInterface && service.getDirectInterface()) {
                __directInterface.Services = Utilities.mergeObjects(__directInterface.Services, service.getDirectInterface());
            }

            //? if (DEBUG) {
            Scribe.info('Loaded service "' + serviceId + '"');
            //? }
        }

        var previousLayer;

        for (var i = configs.Layers.length - 1; i >= 0; i--) {
            var layerId = configs.Layers[i].layerId;

            var layer = LayerConstructors[layerId](configs.Layers[i].configs);

            if (layer.getDirectInterface()) {
                __directInterface.Layers = Utilities.mergeObjects(__directInterface.Layers, layer.getDirectInterface());
            }

            if (previousLayer) {
                layer.setNext(previousLayer.execute);
            }

            previousLayer = layer;

            //? if (DEBUG) {
            Scribe.info('Loaded layer "' + layerId + '"');
            //? }
        }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'Loader',
        //? }

        getDirectInterface: getDirectInterface
    };
}

module.exports = Loader;
