'use strict';

var Constants = require('constants.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');
var Device = require('device.js');

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Scribe = require('scribe.js');
//? }

function DeviceTypeChecker(configs) {
    var __activeMethod;

    function __getDeviceTypeByUserAgent() {
        if (Device.mobile()) {
            return DeviceTypeChecker.DeviceTypes.MOBILE;
        } else if (Device.tablet()) {
            return DeviceTypeChecker.DeviceTypes.DESKTOP;
        }

        return DeviceTypeChecker.DeviceTypes.DESKTOP;
    }

    function __getDeviceTypeByReference() {
        var deviceTypeRef;

        try {
            deviceTypeRef = eval(configs.configs.reference);
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error(ex.stack);
            //? }
            throw Whoopsie('INTERNAL_ERROR', 'DeviceTypeChecker: could not eval() `reference`.');
        }

        if (Utilities.isFunction(deviceTypeRef)) {
            try {
                return deviceTypeRef();
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error(ex.stack);
                //? }
                throw Whoopsie('INTERNAL_ERROR', 'DeviceTypeChecker: could not execute `reference` function.');
            }
        } else if (Utilities.isString(deviceTypeRef)) {
            return deviceTypeRef;
        } else {
            throw Whoopsie('INVALID_TYPE', 'DeviceTypeChecker: `reference` must refer to a function or a string');
        }
    }

    function getDeviceType() {
        switch (__activeMethod) {
            case Constants.DeviceTypeMethods.USER_AGENT:
                return __getDeviceTypeByUserAgent();
            case Constants.DeviceTypeMethods.REFERENCE:
                return __getDeviceTypeByReference();
            default:
                return __getDeviceTypeByUserAgent();
        }
    }

    (function __constructor() {
        //? if (DEBUG) {
        var results = ConfigValidators.DeviceTypeChecker(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }

        __activeMethod = Constants.DeviceTypeMethods[configs.method] || Constants.DeviceTypeMethods.USER_AGENT;
    })();

    return {

        //? if (DEBUG) {
        __type__: 'DeviceTypeChecker',
        //? }

        getDeviceType: getDeviceType
    };
}

DeviceTypeChecker.isValidDeviceType = function (str) {
    for (var deviceType in DeviceTypeChecker.DeviceTypes) {
        if (!DeviceTypeChecker.DeviceTypes.hasOwnProperty(deviceType)) {
            continue;
        }

        if (deviceType === 'TABLET') {
            continue;
        }

        if (str === DeviceTypeChecker.DeviceTypes[deviceType]) {
            return true;
        }
    }

    return false;
};

DeviceTypeChecker.DeviceTypes = {
    DESKTOP: 'desktop',
    MOBILE: 'mobile',
    TABLET: 'tablet'
};

module.exports = DeviceTypeChecker;
