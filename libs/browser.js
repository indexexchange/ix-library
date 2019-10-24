'use strict';

var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function Browser() {

    var topWindow;

    function getProtocol(httpValue, httpsValue) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                httpValue: {
                    type: 'string',
                    optional: true
                },
                httpsValue: {
                    type: 'string',
                    optional: true
                }
            }
        }, {
            httpValue: httpValue,
            httpsValue: httpsValue
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        httpValue = httpValue || 'http:';
        httpsValue = httpsValue || 'https:';

        return document.location.protocol === 'https:' ? httpsValue : httpValue;
    }

    function getViewportWidth() {

        var elementRef = 'CSS1Compat' === topWindow.document.compatMode ? topWindow.document.documentElement : topWindow.document.body;

        return elementRef.clientWidth;
    }

    function getViewportHeight() {

        var elementRef = 'CSS1Compat' === topWindow.document.compatMode ? topWindow.document.documentElement : topWindow.document.body;

        return elementRef.clientHeight;
    }

    function getScreenWidth() {
        return topWindow.screen.width;
    }

    function getScreenHeight() {
        return topWindow.screen.height;
    }

    function getReferrer() {
        return document.referrer;
    }

    function getHostname() {
        return topWindow.location.hostname;
    }

    function getUserAgent() {
        return navigator.userAgent;
    }

    function getLanguage() {
        return navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage;
    }

    function getPathname() {
        return topWindow.location.pathname;
    }

    function isTopFrame() {
        try {
            return window.top === window.self;
        } catch (ex) {

            return false;
        }
    }

    function getPageUrl() {
        return isTopFrame() ? location.href : document.referrer || location.href;
    }

    function isLocalStorageSupported() {

        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');

            return true;
        } catch (ex) {
            return false;
        }
    }

    function traverseContextTree(perContextFn, topContextFn, startLevel, maxLevel) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                perContextFn: {
                    type: ['function', 'null'],
                    optional: true
                },
                topContextFn: {
                    type: ['function', 'null'],
                    optional: true
                }
            }
        }, {
            perContextFn: perContextFn,
            topContextFn: topContextFn
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        try {
            var context = window;
            var level = 0;

            var value;
            while (true) {
                if (startLevel && (level < startLevel)) {
                    continue;
                }

                if (maxLevel && (level > maxLevel)) {
                    break;
                }

                if (perContextFn) {
                    value = perContextFn(context);

                    if (value) {
                        return value;
                    }
                }

                var frameElement;
                try {
                    frameElement = context.frameElement;
                } catch (ex) {
                    frameElement = null;
                }

                if (frameElement === null) {

                    if (topContextFn) {
                        value = topContextFn(context);

                        if (value) {
                            return value;
                        }
                    }

                    break;
                }

                context = context.parent;
                level++;
            }
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while running either the perContextFn or topContextFn.');
            Scribe.error(ex.stack);
            //? }
        }

        return null;
    }

    function getNearestEntity(entityName) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string',
            minLength: 1
        }, entityName);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        return traverseContextTree(function (context) {
            if (context.hasOwnProperty(entityName)) {
                return context[entityName];
            }

            return null;
        });
    }

    function createHiddenIFrame(srcUrl, scope) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                srcUrl: {
                    type: ['string', 'null'],
                    minLength: 1,
                    optional: true
                }
            }
        }, {
            srcUrl: srcUrl
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var w = scope || topWindow;
        var iframe = w.document.createElement('iframe');
        if (srcUrl) {
            iframe.src = srcUrl;
        }

        iframe.width = 0;
        iframe.height = 0;
        iframe.scrolling = 'no';
        iframe.marginWidth = 0;
        iframe.marginHeight = 0;
        iframe.frameBorder = 0;

        iframe.setAttribute('style', 'border: 0px; vertical-align: bottom; visibility: hidden; display: none;');

        w.document.body.appendChild(iframe);

        return iframe;
    }

    function readCookie(name) {
        var nameEquals = name + '=';
        var cookies = topWindow.document.cookie.split(';');

        for (var cookieName in cookies) {
            if (!cookies.hasOwnProperty(cookieName)) {
                continue;
            }

            var cookie = cookies[cookieName];

            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1, cookie.length);
            }

            if (cookie.indexOf(nameEquals) === 0) {
                return cookie.substring(nameEquals.length, cookie.length);
            }
        }

        return null;
    }

    function isFlashSupported() {
        var hasFlash = false;
        try {

            if (new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash')) {
                hasFlash = true;
            }
        } catch (ex) {

            if (navigator.mimeTypes
                && navigator.mimeTypes['application/x-shockwave-flash'] !== undefined
                && navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
                hasFlash = true;
            }
        }

        return hasFlash;
    }

    (function __constructor() {
        topWindow = traverseContextTree(null, function (context) {
            return context;
        });
    })();

    return {

        //? if (DEBUG) {
        __type__: 'Browser',
        //? }

        topWindow: topWindow,

        getProtocol: getProtocol,
        isLocalStorageSupported: isLocalStorageSupported,
        getViewportWidth: getViewportWidth,
        getViewportHeight: getViewportHeight,
        isTopFrame: isTopFrame,
        getScreenWidth: getScreenWidth,
        getScreenHeight: getScreenHeight,
        getReferrer: getReferrer,
        getPageUrl: getPageUrl,
        getHostname: getHostname,
        getUserAgent: getUserAgent,
        getLanguage: getLanguage,
        getPathname: getPathname,
        getNearestEntity: getNearestEntity,
        traverseContextTree: traverseContextTree,
        createHiddenIFrame: createHiddenIFrame,
        readCookie: readCookie,
        isFlashSupported: isFlashSupported
    };
}

module.exports = Browser();
