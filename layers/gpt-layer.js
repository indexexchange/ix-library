'use strict';

var Classify = require('classify.js');
var Layer = require('layer.js');
var SpaceCamp = require('space-camp.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

var GptLayerModules = [
    //? if (FEATURES.GPT_SET_TARGETING) {
    require('gpt-set-targeting.js'),
    //? }
    //? if (FEATURES.GPT_CLEAR_TARGETING) {
    require('gpt-clear-targeting.js'),
    //? }
    //? if (FEATURES.GPT_MAP_SLOTS) {
    require('gpt-map-slots.js'),
    //? }
    //? if (FEATURES.GPT_RETRIEVE_AND_SET_TARGETING) {
    require('gpt-retrieve-and-set-targeting.js'),
    //? }
    //? if (FEATURES.GPT_DISPLAY) {
    require('gpt-display.js'),
    //? }
    //? if (FEATURES.GPT_REFRESH) {
    require('gpt-refresh.js'),
    //? }
    //? if (FEATURES.GPT_DESTROY_SLOTS) {
    require('gpt-destroy-slots.js'),
    //? }
    //? if (FEATURES.GPT_OPTIONS) {
    require('gpt-options.js')
    //? }
];

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
//? }

function GptLayer(configs) {

    var __baseClass;

    var __state;

    var __directInterface;

    var __desktopGlobalTimeout;

    var __mobileGlobalTimeout;

    (function __constructor() {
        //? if (DEBUG) {
        var results = ConfigValidators.GptLayer(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __baseClass = Layer();

        __desktopGlobalTimeout = configs.desktopGlobalTimeout;
        __mobileGlobalTimeout = configs.mobileGlobalTimeout;

        if (SpaceCamp.DeviceTypeChecker.getDeviceType() === 'mobile') {
            SpaceCamp.globalTimeout = __mobileGlobalTimeout;
        } else {
            SpaceCamp.globalTimeout = __desktopGlobalTimeout;
        }

        __state = {
            slotDemandHistory: {},
            desktopGlobalTimeout: __desktopGlobalTimeout,
            mobileGlobalTimeout: __mobileGlobalTimeout
        };

        __directInterface = {};

        for (var i = 0; i < GptLayerModules.length; i++) {
            __directInterface = Utilities.mergeObjects(__directInterface, GptLayerModules[i](configs, __state, __baseClass._executeNext));
        }

        __baseClass._setDirectInterface('GptLayer', __directInterface);
    })();

    return Classify.derive(__baseClass, {

        //? if (DEBUG) {
        __type__: 'GptLayer',
        //? }

        //? if (TEST) {
        __baseClass: __baseClass,
        __state: __state,
        __directInterface: __directInterface
        //? }
    });
}

module.exports = GptLayer;
