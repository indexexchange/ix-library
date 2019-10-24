'use strict';

//? if (FEATURES.GPT_IDENTITY_TARGETING) {
var GptHelper = require('gpt-helper.js');
var GptSetTargeting = require('gpt-set-targeting.js');
//? }

function GptService(configs) {

    var __setTargeting;

    //? if (FEATURES.GPT_IDENTITY_TARGETING) {

    function setIdentityTargeting(kv) {
        var gpt = GptHelper.loadGpt();
        gpt.cmd.push(function () {
            __setTargeting(null, [
                {
                    targetingType: 'page',
                    targeting: kv
                }
            ]);
        });
    }
    //? }

    (function __constructor() {
        //? if (FEATURES.GPT_IDENTITY_TARGETING) {
        __setTargeting = GptSetTargeting(configs, {}).setTargeting;
        //? }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'GptService',
        //? }

        //? if (TEST) {
        get __setTargeting() {
            return __setTargeting;
        },
        set __setTargeting(fn) {
            __setTargeting = fn;
        },
        //? }

        //? if (FEATURES.GPT_IDENTITY_TARGETING) {
        setIdentityTargeting: setIdentityTargeting
        //? }
    };
}

module.exports = GptService;
