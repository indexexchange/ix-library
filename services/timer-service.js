'use strict';

var Constants = require('constants.js');
var System = require('system.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function TimerService() {

    var TimerStates = {
        NEW: 0,
        RUNNABLE: 1,
        TERMINATED: 2
    };

    var __timerStorage;

    function __generateTimerCallback(id) {
        return function () {
            __timerStorage[id].state = TimerStates.TERMINATED;

            for (var i = 0; i < __timerStorage[id].cbs.length; i++) {
                try {
                    __timerStorage[id].cbs[i]();
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Error occurred running timer callbacks.');
                    Scribe.error(ex.stack);
                    //? }
                }
            }

            delete __timerStorage[id].cbs;
            delete __timerStorage[id].timer;
        };
    }

    function createTimer(timeout, startNow, fn) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                timeout: {
                    type: 'number',
                    gt: 0
                },
                startNow: {
                    type: 'boolean',
                    optional: true
                },
                fn: {
                    type: 'function',
                    optional: true
                }
            }
        }, {
            startNow: startNow,
            timeout: timeout,
            fn: fn
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var id = System.generateUniqueId(Constants.SESSION_ID_LENGTH);

        startNow = startNow ? true : false;
        fn = fn ? [fn] : [];

        __timerStorage[id] = {
            state: TimerStates.NEW,
            cbs: fn,
            timeout: timeout
        };

        if (startNow) {
            __timerStorage[id].state = TimerStates.RUNNABLE;
            __timerStorage[id].timer = setTimeout(__generateTimerCallback(id), timeout);
        }

        return id;
    }

    function startTimer(id) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'strict',
            minLength: 1
        }, id);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__timerStorage.hasOwnProperty(id)) {
            //? if (DEBUG) {
            Scribe.error('Tried to add callback for non-existent timer "' + id + '".');
            //? }

            return;
        }

        if (__timerStorage[id].state !== TimerStates.NEW) {
            return;
        }

        __timerStorage[id].state = TimerStates.RUNNABLE;
        __timerStorage[id].timer = setTimeout(__generateTimerCallback(id), __timerStorage[id].timeout);
    }

    function addTimerCallback(id, fn) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                id: {
                    type: 'strict',
                    minLength: 1
                },
                fn: {
                    type: 'function'
                }
            }
        }, {
            id: id,
            fn: fn
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__timerStorage.hasOwnProperty(id)) {
            //? if (DEBUG) {
            Scribe.error('Tried to add callback for non-existent timer "' + id + '".');
            //? }

            return;
        }

        if (__timerStorage[id].state === TimerStates.TERMINATED) {
            //? if (DEBUG) {
            Scribe.warn('Tried to add callback for "DONE" timer "' + id + '".');
            //? }

            return;
        }

        __timerStorage[id].cbs.unshift(fn);
    }

    function getTimerState(id) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'strict',
            minLength: 1
        }, id);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__timerStorage.hasOwnProperty(id)) {
            //? if (DEBUG) {
            Scribe.error('Tried to get state for non-existent timer "' + id + '".');
            //? }

            return null;
        }

        return __timerStorage[id].state;
    }

    function clearTimer(id) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'strict',
            minLength: 1
        }, id);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__timerStorage.hasOwnProperty(id)) {
            //? if (DEBUG) {
            Scribe.error('Tried to clear non-existent timer "' + id + '".');
            //? }

            return;
        }

        if (__timerStorage[id].state === TimerStates.TERMINATED) {
            //? if (DEBUG) {
            Scribe.warn('Tried to clear "DONE" timer "' + id + '".');
            //? }

            return;
        }

        __timerStorage[id].state = TimerStates.TERMINATED;
        clearTimeout(__timerStorage[id].timer);

        delete __timerStorage[id].cbs;
        delete __timerStorage[id].timer;
    }

    (function __constructor() {
        __timerStorage = {};
    })();

    return {

        //? if (DEBUG) {
        __type__: 'TimerService',
        //? }

        TimerStates: TimerStates,

        //? if (TEST) {
        __timerStorage: __timerStorage,
        //? }

        //? if (TEST) {
        __generateTimerCallback: __generateTimerCallback,
        //? }

        createTimer: createTimer,
        startTimer: startTimer,
        addTimerCallback: addTimerCallback,
        getTimerState: getTimerState,
        clearTimer: clearTimer
    };
}

module.exports = TimerService;