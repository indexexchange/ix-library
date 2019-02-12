'use strict';

var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Inspector = require('schema-inspector.js');
//? }

function HeaderTagSlot(name, config) {
    var __name;

    var __id;

    var __divId;

    var __adUnitPath;

    var __sizeMapping;

    var __targeting;

    var __deviceType;

    var __position;

    function __numericSortComparison(a, b) {
        return Number(a) - Number(b);
    }

    function getName() {
        return __name;
    }

    function getId() {
        return __id;
    }

    function getDivId() {
        return __divId;
    }

    function getAdUnitPath() {
        return __adUnitPath;
    }

    function getSizes(clientWidth, clientHeight) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                clientWidth: {
                    type: 'integer',
                    gte: 0
                },
                clientHeight: {
                    type: 'integer',
                    gte: 0
                }
            }
        }, {
            clientWidth: clientWidth,
            clientHeight: clientHeight
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var retSizes = [];
        var widthsSorted;
        var heightsSorted;
        var width;
        var height;

        widthsSorted = Object.keys(__sizeMapping).sort(__numericSortComparison);

        for (var i = widthsSorted.length - 1; i >= 0; i--) {
            width = widthsSorted[i];

            if (Number(width) > clientWidth) {
                continue;
            }

            heightsSorted = Object.keys(__sizeMapping[width]).sort(__numericSortComparison);

            for (var j = heightsSorted.length - 1; j >= 0; j--) {
                height = heightsSorted[j];

                if (Number(height) > clientHeight) {
                    continue;
                }

                retSizes = __sizeMapping[width][height];

                break;
            }

            if (retSizes.length > 0) {
                break;
            }
        }

        return retSizes;
    }

    function getTargeting() {
        return __targeting;
    }

    function getDeviceType() {
        return __deviceType;
    }

    function getPosition() {
        return __position;
    }

    (function __constructor() {
        //? if (DEBUG) {
        var results = ConfigValidators.HeaderTagSlot(config, name);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __name = name;
        __id = config.id;

        __divId = null;
        __adUnitPath = null;
        __sizeMapping = null;
        __targeting = null;
        __deviceType = null;
        __position = null;

        if (config.hasOwnProperty('divId')) {
            __divId = RegExp(config.divId);
        }

        if (config.hasOwnProperty('adUnitPath')) {
            __adUnitPath = RegExp(config.adUnitPath);
        }

        if (config.hasOwnProperty('sizeMapping')) {
            var indexRegex = /^(\d+)x(\d+)$/;
            var regArray;
            var width;
            var height;
            __sizeMapping = {};

            for (var index in config.sizeMapping) {
                if (!config.sizeMapping.hasOwnProperty(index)) {
                    continue;
                }

                regArray = indexRegex.exec(index);

                width = regArray[1];
                height = regArray[2];

                if (!__sizeMapping.hasOwnProperty(width)) {
                    __sizeMapping[width] = {};
                }

                __sizeMapping[width][height] = config.sizeMapping[index];
            }
        }

        if (config.hasOwnProperty('targeting')) {
            __targeting = config.targeting;
        }

        if (config.hasOwnProperty('deviceType')) {
            __deviceType = config.deviceType;
        }

        if (config.hasOwnProperty('position')) {
            __position = config.position;
        }

        config = undefined;
    })();

    return {

        //? if (DEBUG) {
        __type__: 'HeaderTagSlot',
        //? }

        getName: getName,
        getId: getId,
        getDivId: getDivId,
        getAdUnitPath: getAdUnitPath,
        getSizes: getSizes,
        getTargeting: getTargeting,
        getDeviceType: getDeviceType,
        getPosition: getPosition,

        //? if(TEST) {
        __numericSortComparison: __numericSortComparison,
        __sizeMapping: __sizeMapping
        //? }
    };
}

module.exports = HeaderTagSlot;
