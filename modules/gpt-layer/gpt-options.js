'use strict';

var SpaceCamp = require('space-camp.js');
var Whoopsie = require('whoopsie.js');
var Constants = require('constants.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function GptOptions(configs, state) {
    var __gptEnableSingleRequest;
    var __gptDisableInitialLoad;

    function __callGptEnableSingleRequest() {
        if (__gptEnableSingleRequest) {
            return __gptEnableSingleRequest();
        }

        return window.googletag.pubads().enableSingleRequest();
    }

    function __callGptDisableInitialLoad() {
        if (__gptDisableInitialLoad) {
            return __gptDisableInitialLoad();
        }

        return window.googletag.pubads().disableInitialLoad();
    }

    function enableSingleRequest() {
        state.requestArchitecture = Constants.RequestArchitectures.SRA;

        return __callGptEnableSingleRequest();
    }

    function disableInitialLoad() {
        state.initialLoadState = Constants.InitialLoadStates.DISABLED;

        return __callGptDisableInitialLoad();
    }

    (function __constructor() {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                enableSingleRequest: {
                    type: 'boolean'
                },
                disableInitialLoad: {
                    type: 'boolean'
                }
            }
        }, configs);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        state.requestArchitecture = configs.enableSingleRequest ? Constants.RequestArchitectures.SRA : Constants.RequestArchitectures.MRA;
        state.initialLoadState = configs.disableInitialLoad ? Constants.InitialLoadStates.DISABLED : Constants.InitialLoadStates.ENABLED;

        var overrideGoogletag = function () {
            if (configs.override) {
                if (configs.override.enableSingleRequest) {
                    __gptEnableSingleRequest = SpaceCamp.LastLineGoogletag.enableSingleRequest;
                }

                if (configs.override.disableInitialLoad) {
                    __gptDisableInitialLoad = SpaceCamp.LastLineGoogletag.disableInitialLoad;
                }
            }
        };
        SpaceCamp.initQueue.push(overrideGoogletag);
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptOptions',
        //? }

        enableSingleRequest: enableSingleRequest,
        disableInitialLoad: disableInitialLoad
    };
}

module.exports = GptOptions;
