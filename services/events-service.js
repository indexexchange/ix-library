'use strict';

var System = require('system.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function EventsService() {

    var __eventsMap;

    function __on(event, once, fn) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                event: {
                    type: 'string',
                    minLength: 1
                },
                fn: {
                    type: 'function'
                },
                once: {
                    type: 'boolean'
                }
            }
        }, {
            event: event,
            fn: fn,
            once: once
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__eventsMap.hasOwnProperty(event)) {
            __eventsMap[event] = [];
        }

        var id = System.generateUniqueId();

        __eventsMap[event].push({
            id: id,
            fn: fn,
            once: once
        });

        return id;
    }

    function on(event, fn) {
        return __on(event, false, fn);
    }

    function once(event, fn) {
        return __on(event, true, fn);
    }

    function off(id) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                id: {
                    type: 'string',
                    minLength: 1
                }
            }
        }, {
            id: id
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var event in __eventsMap) {
            if (!__eventsMap.hasOwnProperty(event)) {
                continue;
            }

            for (var i = __eventsMap[event].length - 1; i >= 0; i--) {
                if (__eventsMap[event][i].id === id) {
                    __eventsMap[event].splice(i, 1);

                    return;
                }
            }
        }
    }

    function emit() {
        var args = Array.prototype.slice.call(arguments);
        var event = args.shift();

        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                event: {
                    type: 'string',
                    minLength: 1
                },
                args: {
                    type: 'array'
                }
            }
        }, {
            event: event,
            args: args
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!event) {
            return;
        }

        if (!__eventsMap.hasOwnProperty(event)) {
            return;
        }

        for (var i = __eventsMap[event].length - 1; i >= 0; i--) {
            try {
                __eventsMap[event][i].fn.apply(null, args);
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occurred while running event listener.');
                Scribe.error(ex.stack);
                //? }
            }

            if (__eventsMap[event][i].once) {
                __eventsMap[event].splice(i, 1);
            }
        }
    }

    (function __constructor() {
        __eventsMap = {};
    })();

    return {

        //? if (DEBUG) {
        __type__: 'EventsService',
        //? }

        //? if (TEST) {
        __eventsMap: __eventsMap,
        //? }

        //? if (TEST) {
        __on: __on,
        //? }

        on: on,
        once: once,
        off: off,
        emit: emit
    };
}

module.exports = EventsService;