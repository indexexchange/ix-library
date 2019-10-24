'use strict';

var Utilities = require('utilities.js');

function KeyValueService() {

    var __defaultKeyValueData = {
        site: {},
        user: {}
    };
    var __keyValueData = {};

    function __validateKeyValueData(data) {
        return (typeof data !== 'object' || data === null || Array.isArray(data)) ? false : true;
    }

    function getDefaultKeyValueData() {
        return Utilities.deepCopy(__defaultKeyValueData);
    }

    function getKeyValueData() {
        return Utilities.deepCopy(__keyValueData);
    }

    function hasKeyValueAccess() {

        return true;
    }

    function setSiteKeyValueData(data) {
        if (!__validateKeyValueData(data)) {
            return false;
        }

        __keyValueData.site = Utilities.deepCopy(data);

        return true;
    }

    function setUserKeyValueData(data) {
        if (!__validateKeyValueData(data)) {
            return false;
        }

        __keyValueData.user = Utilities.deepCopy(data);

        return true;
    }

    (function __constructor() {
        __keyValueData = Utilities.deepCopy(__defaultKeyValueData);
    })();

    return {

        //? if (DEBUG) {
        __type__: 'KeyValueService',
        //? }

        getDefaultKeyValueData: getDefaultKeyValueData,
        getKeyValueData: getKeyValueData,
        hasKeyValueAccess: hasKeyValueAccess,
        setSiteKeyValueData: setSiteKeyValueData,
        setUserKeyValueData: setUserKeyValueData
    };
}

module.exports = KeyValueService;
