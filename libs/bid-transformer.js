'use strict';

var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function BidTransformer(configs) {
    var __defaultSettings = {
        floor: 0,
        buckets: [
            {
                max: Infinity,
                step: 1
            }
        ]
    };

    var __inputShift;

    var __outputShift;

    function __round(price) {
        if (configs.roundingType === BidTransformer.RoundingTypes.FLOOR) {
            return Math.floor(price);
        }

        return price;
    }

    function apply(rawBid) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: ['string', 'number'],
            minLenth: 1,
            exec: function (schema, post) {
                if (!Utilities.isNumeric(post)) {
                    this.report('must be numeric');
                }
            }
        }, rawBid);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var decimalShift = 0;
        var shiftMultiplier = 1;
        var transformed = rawBid.toString();
        var decimalPos = transformed.indexOf('.');

        if (decimalPos > -1) {
            decimalShift = transformed.length - decimalPos - 1;
            transformed = transformed.slice(0, decimalPos) + transformed.slice(decimalPos + 1);
        }

        if (decimalShift >= __inputShift) {
            decimalShift -= __inputShift;
        } else {
            var numZeros = __inputShift - decimalShift;
            decimalShift = 0;
            transformed = Utilities.padEnd(transformed, transformed.length + numZeros, '0');
        }

        if (transformed.length > 9) {
            decimalShift -= transformed.length - 9;
            transformed = transformed.slice(0, 9);
        }

        shiftMultiplier = Math.pow(10, decimalShift);

        transformed = Number(transformed);

        var len = configs.buckets.length;

        if (transformed < (configs.floor * shiftMultiplier)) {
            transformed = 0;
        } else if (transformed >= (configs.buckets[len - 1].max * shiftMultiplier)) {
            transformed = configs.buckets[len - 1].max * shiftMultiplier;
        } else {
            var min = configs.floor;

            var bucket;

            for (var i = 0; i < len; i++) {
                bucket = configs.buckets[i];

                if (transformed <= (bucket.max * shiftMultiplier)) {
                    break;
                }

                min = bucket.max;
            }

            if (configs.roundingType !== BidTransformer.RoundingTypes.NONE) {
                transformed -= min * shiftMultiplier;
                transformed /= bucket.step * shiftMultiplier;
                transformed = __round(transformed);
                transformed *= bucket.step * shiftMultiplier;
                transformed += min * shiftMultiplier;
            }
        }

        transformed = transformed.toString();

        decimalShift += __outputShift;

        var newDecimalPos = transformed.length - decimalShift;

        if (newDecimalPos < 1) {
            transformed = Utilities.padStart(transformed, transformed.length + (1 - newDecimalPos), '0');
            newDecimalPos = 1;
        }

        var retVal = transformed.slice(0, newDecimalPos);

        if (configs.outputPrecision !== 0) {
            retVal = retVal + '.' + transformed.slice(newDecimalPos);

            if (configs.outputPrecision > 0) {
                if (decimalShift < configs.outputPrecision) {
                    retVal = Utilities.padEnd(retVal, newDecimalPos + configs.outputPrecision + 1, '0');
                } else {
                    retVal = retVal.slice(0, newDecimalPos + configs.outputPrecision + 1);
                }
            }
        }

        return retVal;
    }

    (function __constructor() {
        //? if (DEBUG) {
        var results = ConfigValidators.bidTransformerConfig(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __inputShift = Math.round(Math.log(configs.bidUnitInCents) * Math.LOG10E);
        __outputShift = Math.round(Math.log(configs.outputCentsDivisor) * Math.LOG10E);

        configs.roundingType = BidTransformer.RoundingTypes[configs.roundingType];

        var fields = ['floor', 'buckets'];

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];

            if (!configs.hasOwnProperty(field)) {
                configs[field] = __defaultSettings[field];

                //? if (DEBUG) {
                Scribe.warn('Applying default value ' + __defaultSettings[field] + ' for ' + field);
                //? }
            }
        }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'BidTransformer',
        //? }

        apply: apply
    };
}

BidTransformer.RoundingTypes = {
    NONE: 0,
    FLOOR: 1
};

module.exports = BidTransformer;
