'use strict';

var Prms = require('prms.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function Layer() {
    var __directInterface;

    var __executor;

    var __next;

    function __layerLoopBack(sessionId, inParcels) {
        return Prms.resolve(inParcels);
    }

    function _setDirectInterface(namespace, directInterface) {
        __directInterface = {};
        __directInterface[namespace] = directInterface;
    }

    function _setExecutor(executor) {
        __executor = executor;
    }

    function getDirectInterface() {
        return __directInterface;
    }

    function setNext(next) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'function'
        }, next);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        __next = next;
    }

    function _executeNext(sessionId, outParcels) {
        //? if (DEBUG) {
        return __next(sessionId, outParcels).then(function (receivedParcels) {
            var results = Inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    sessionId: {
                        type: 'string',
                        minLength: 1
                    },
                    receivedParcels: {
                        type: 'array',
                        items: {
                            type: 'object'
                        }
                    }
                }
            }, {
                sessionId: sessionId,
                receivedParcels: receivedParcels
            });

            if (!results.valid) {
                throw Whoopsie('INVALID_ARGUMENT', results.format());
            }

            return receivedParcels;
        });

        //? } else {
        return __next(sessionId, outParcels);
        //? }
    }

    function execute(sessionId, inParcels) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    minLength: 1
                },
                inParcels: {
                    type: 'array',
                    items: {
                        type: 'object'
                    }
                }
            }
        }, {
            sessionId: sessionId,
            inParcels: inParcels
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        return Prms.resolve().then(function () {
            return __executor(sessionId, inParcels);
        });
    }

    (function __constructor() {
        __directInterface = null;
        __executor = __layerLoopBack;
        __next = __layerLoopBack;
    })();

    return {

        //? if (DEBUG) {
        __type__: 'Layer',
        //? }

        //? if (TEST) {
        __layerLoopBack: __layerLoopBack,
        //? }

        _setDirectInterface: _setDirectInterface,
        _setExecutor: _setExecutor,

        _executeNext: _executeNext,

        setNext: setNext,
        getDirectInterface: getDirectInterface,

        execute: execute
    };
}

module.exports = Layer;
