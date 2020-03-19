'use strict';

var Browser = require('browser.js');
var Utilities = require('utilities.js');
var System = require('system.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
var Whoopsie = require('whoopsie.js');
//? }

function Cache() {

    var __keyPrefix = 'IXWRAPPER';

    var __maxTTL = 604800000;

    var __localStorageAvailable;

    function deleteData(key) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string',
            minLength: 1
        }, key);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__localStorageAvailable) {
            //? if (DEBUG) {
            Scribe.warn('Attempted to remove cached data for key "' + key + '" but localstorage is unavailable.');
            //? }

            return false;
        }

        try {
            localStorage.removeItem(__keyPrefix + key);
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.warn('Error removing cached data for key "' + key + '": ' + ex);
            //? }

            return false;
        }

        return true;
    }

    function getEntry(key) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string',
            minLength: 1
        }, key);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__localStorageAvailable) {
            //? if (DEBUG) {
            Scribe.warn('Attempted to retrieve cached data for key "' + key + '" but localstorage is unavailable.');
            //? }

            return null;
        }

        var entry;

        try {
            entry = JSON.parse(localStorage.getItem(__keyPrefix + key));
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.warn('Error retrieving cached data for key "' + key + '": ' + ex);
            //? }

            return null;
        }

        if (entry === null) {
            return null;
        }

        if (!entry.e || entry.e < System.now()) {
            //? if (DEBUG) {
            Scribe.info('Removing cache key "' + key + '" due to expiry.');
            //? }

            deleteData(key);

            return null;
        }

        if (!Utilities.isObject(entry.d)) {
            return null;
        }

        return {
            data: entry.d,
            created: entry.t,
            expires: entry.e
        };
    }

    function getData(key) {
        var entry = getEntry(key);

        return entry && entry.data;
    }

    function setData(key, data, ttl) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    minLength: 1
                },
                data: {
                    type: 'object'
                },
                ttl: {
                    type: 'integer'
                }
            }
        }, {
            key: key,
            data: data,
            ttl: ttl
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!__localStorageAvailable) {
            //? if (DEBUG) {
            Scribe.warn('Attempted to cache data for key "' + key + '" but localstorage is unavailable.');
            //? }

            return false;
        }

        if (ttl > __maxTTL) {
            ttl = __maxTTL;
        }

        var now = System.now();

        var entry = {
            t: now,
            d: data,
            e: now + ttl
        };

        try {
            localStorage.setItem(__keyPrefix + key, JSON.stringify(entry));
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.warn('Error caching data for key "' + key + '": ' + ex);
            //? }

            return false;
        }

        return true;
    }

    //? if (TEST) {
    function setLocalStorageAvailability(availability) {
        __localStorageAvailable = availability;
    }
    //? }

    (function __constructor() {

        __localStorageAvailable = Browser.isLocalStorageSupported();
    })();

    return {

        //? if (DEBUG) {
        __type__: 'Cache',
        __keyPrefix: __keyPrefix,
        __localStorageAvailable: __localStorageAvailable,
        //? }

        //? if (TEST) {
        setLocalStorageAvailability: setLocalStorageAvailability,
        //? }

        deleteData: deleteData,
        getEntry: getEntry,
        getData: getData,
        setData: setData
    };
}

module.exports = Cache();