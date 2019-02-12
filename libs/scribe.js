'use strict';

var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function Scribe() {
    var __level;

    var __header;

    //? if (DEBUG) {
    var __dummyConsole;
    //? }

    //? if (DEBUG) {
    var console;
    //? }

    function __getPrefix() {
        var caller = 'unknown';

        var re = /at\s(.+)/g;
        var stack = Error().stack;
        var match;

        var i = 0;
        while ((match = re.exec(stack)) !== null) {
            if (i === 2) {
                caller = match[1];

                break;
            }

            i++;
        }

        return (__header ? __header + ' | ' : '') + caller + ':';
    }

    function setLevel(level) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string',
            exec: function (schema, post) {
                if (!Scribe.LoggingLevels.hasOwnProperty(post)) {
                    this.report('must be one of the predefined values in `Scribe.LoggingLevels`');
                }
            }
        }, level);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        __level = Scribe.LoggingLevels[level];
    }

    function setHeader(header) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string'
        }, header);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        __header = header;
    }

    //? if (TEST || DEBUG) {
    function disableNativeLogging() {
        window.console = __dummyConsole;
    }
    //? }

    //? if (TEST || DEBUG) {
    function enableNativeLogging() {
        window.console = console;
    }
    //? }

    function error() {
        if (__level < Scribe.LoggingLevels.ERROR) {
            return;
        }

        var args = Array.prototype.slice.call(arguments);
        args.unshift(__getPrefix());

        console.error.apply(console, args);
    }

    function warn() {
        if (__level < Scribe.LoggingLevels.WARN) {
            return;
        }

        var args = Array.prototype.slice.call(arguments);
        args.unshift(__getPrefix());

        console.warn.apply(console, args);
    }

    function info() {
        if (__level < Scribe.LoggingLevels.INFO) {
            return;
        }

        var args = Array.prototype.slice.call(arguments);
        args.unshift(__getPrefix());

        console.info.apply(console, args);
    }

    function table() {
        if (__level < Scribe.LoggingLevels.INFO) {
            return;
        }

        console.info.apply(console, [__getPrefix()]);
        console.table.apply(console, arguments);
    }

    function debug() {
        if (__level < Scribe.LoggingLevels.DEBUG) {
            return;
        }

        var args = Array.prototype.slice.call(arguments);
        args.unshift(__getPrefix());

        console.debug.apply(console, args);
    }

    (function __constructor() {
        //? if (DEBUG) {
        __dummyConsole = {
            assert: System.noOp,
            clear: System.noOp,
            count: System.noOp,
            debug: System.noOp,
            dir: System.noOp,
            dirxml: System.noOp,
            error: System.noOp,
            exception: System.noOp,
            group: System.noOp,
            groupCollapsed: System.noOp,
            groupEnd: System.noOp,
            info: System.noOp,
            log: System.noOp,
            profile: System.noOp,
            profileEnd: System.noOp,
            table: System.noOp,
            time: System.noOp,
            timeEnd: System.noOp,
            timeStamp: System.noOp,
            trace: System.noOp,
            warn: System.noOp
        };

        console = window.console;
        //? }

        __level = Scribe.LoggingLevels.DEBUG;
        __header = SpaceCamp.NAMESPACE + '_' + System.generateUniqueId(4);
    })();

    return {

        __type__: 'Scribe',

        //? if (DEBUG) {
        __dummyConsole: __dummyConsole,
        //? }

        //? if (TEST) {
        __getPrefix: __getPrefix,
        //? }

        //? if (TEST || DEBUG) {
        disableNativeLogging: disableNativeLogging,
        enableNativeLogging: enableNativeLogging,
        //? }

        setLevel: setLevel,
        setHeader: setHeader,

        error: error,
        warn: warn,
        info: info,
        table: table,
        debug: debug
    };
}

Scribe.LoggingLevels = {

    SILENT: 0,

    ERROR: 1,

    WARN: 2,

    INFO: 3,

    DEBUG: 4
};

module.exports = Scribe();
