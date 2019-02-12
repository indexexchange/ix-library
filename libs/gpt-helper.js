'use strict';

var Browser = require('browser.js');
var Network = require('network.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function GptHelper() {
    function run(fn, gpt) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                fn: {
                    type: 'function'
                },
                gpt: {
                    type: 'any',
                    optional: true
                }
            }
        }, {
            fn: fn,
            gpt: gpt
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        gpt = gpt || window.googletag;

        if (!gpt || !gpt.cmd) {
            //? if (DEBUG) {
            Scribe.warn('GPT is not loaded within the current scope.');
            //? }

            return;
        }

        gpt.cmd.push(fn);
    }

    function loadGpt(w) {
        //? if (DEBUG){
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                w: {
                    type: 'object',
                    optional: true
                }
            }
        }, {
            w: w
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        w = w || window;

        if (w.googletag) {
            //? if (DEBUG) {
            Scribe.warn('GPT already loaded in this window scope.');
            //? }

            return w.googletag;
        }

        w.googletag = w.googletag || {};
        w.googletag.cmd = w.googletag.cmd || [];

        Network.jsonp({
            async: true,
            url: Browser.getProtocol() + '//www.googletagservices.com/tag/js/gpt.js',
            windowScope: w
        });

        return w.googletag;
    }

    function getGpt(level) {
        var foundGpt = null;

        if (typeof level === 'undefined') {
            foundGpt = Browser.getNearestEntity('googletag');
        } else {
            foundGpt = Browser.traverseContextTree(function (context) {
                if (context.hasOwnProperty('googletag')) {
                    return context.googletag;
                }

                return null;
            }, null, level, level);
        }

        return foundGpt;
    }

    function isGSlot(entity) {
        return Utilities.isObject(entity)
            && Utilities.isFunction(entity.getSlotElementId)
            && Utilities.isFunction(entity.setTargeting)
            && Utilities.isFunction(entity.getTargeting)
            && Utilities.isFunction(entity.clearTargeting);
    }

    function getGSlots() {
        return googletag
            .pubads()
            .getSlots()
            .slice();
    }

    function getGSlotByDivId(divId) {
        var slots = getGSlots();
        for (var i = 0; i < slots.length; i++) {
            if (slots[i].getSlotElementId() === divId) {
                return slots[i];
            }
        }

        return null;
    }

    return {

        //? if (DEBUG) {
        __type__: 'GptHelper',
        //? }

        run: run,
        loadGpt: loadGpt,
        getGpt: getGpt,
        isGSlot: isGSlot,
        getGSlots: getGSlots,
        getGSlotByDivId: getGSlotByDivId
    };
}

module.exports = GptHelper();
