'use strict';

var SpaceCamp = require('space-camp.js');
var System = require('system.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');
var UserAgentMatcher = require('user-agent-matcher.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
var Scribe = require('scribe.js');
//? }

function Network() {
    var __xhrSupported;

    function isXhrSupported() {
        return __xhrSupported;
    }

    function objToQueryString(obj) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object'
        }, obj);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var queryString = '';

        for (var param in obj) {
            if (!obj.hasOwnProperty(param)) {
                continue;
            }

            if (Utilities.isObject(obj[param])) {
                for (var prop in obj[param]) {
                    if (!obj[param].hasOwnProperty(prop)) {
                        continue;
                    }

                    queryString += param + '%5B' + prop + '%5D=' + encodeURIComponent(obj[param][prop]) + '&';
                }
            } else if (Utilities.isArray(obj[param])) {
                for (var i = 0; i < obj[param].length; i++) {
                    queryString += param + '%5B%5D=' + encodeURIComponent(obj[param][i]) + '&';
                }
            } else {
                queryString += param + '=' + encodeURIComponent(obj[param]) + '&';
            }
        }

        return queryString.slice(0, -1);
    }

    function buildUrl(base, path, query) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                base: {
                    type: 'string',
                    pattern: 'url'
                },
                path: {
                    type: ['array', 'null'],
                    items: {
                        type: 'string'
                    },
                    optional: true
                },
                query: {
                    type: ['string', 'object'],
                    optional: true
                }
            }
        }, {
            base: base,
            path: path,
            query: query
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (base[base.length - 1] !== '/' && path) {
            base += '/';
        }

        path = path || [];

        if (Utilities.isObject(query)) {
            query = objToQueryString(query);
        }
        query = query ? '?' + query : '';

        return base + path.join('/') + query;
    }

    function jsonp(args) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                async: {
                    type: 'boolean',
                    optional: true
                },
                continueAfterTimeout: {
                    type: 'boolean',
                    optional: true
                },
                data: {
                    type: ['object', 'string', 'array'],
                    optional: true
                },
                onSuccess: {
                    type: 'function',
                    optional: true
                },
                onFailure: {
                    type: 'function',
                    optional: true
                },
                onTimeout: {
                    type: 'function',
                    optional: true
                },
                useImgTag: {
                    type: 'boolean',
                    optional: true
                },
                initiatorId: {
                    type: 'string',
                    optional: true
                },
                scope: {
                    type: 'any',
                    optional: true
                },
                sessionId: {
                    type: 'string',
                    optional: true
                },
                timeout: {
                    type: 'integer',
                    gte: 0,
                    optional: true
                },
                globalTimeout: {
                    optional: 'true',
                    type: 'boolean'
                },
                url: {
                    type: 'string',
                    pattern: 'url'
                }
            }
        }, args);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        //? if (DEBUG) {
        var requestIdentifier = args.initiatorId + '-' + args.sessionId + ' => ';
        //? }

        var startTime = null;

        var scope = args.scope || window;

        var script;

        if (args.useImgTag) {
            script = scope.document.createElement('img');
        } else {
            script = scope.document.createElement('script');
            script.type = 'text/javascript';

            var async = true;
            if (args.hasOwnProperty('async')) {
                async = args.async;
            }
            script.async = async;
        }

        var url = args.url;

        if (args.data) {
            var qs;

            if (Utilities.isString(args.data)) {
                qs = args.data;
            } else {
                qs = objToQueryString(args.data);
            }

            url = buildUrl(args.url, null, qs);
        }

        var timer;

        var timedOut = false;

        var onTimeout = function () {
            try {
                if (timedOut) {
                    return;
                }

                timedOut = true;

                if (args.onTimeout) {
                    args.onTimeout();
                }

                if (!args.useImgTag && !args.continueAfterTimeout) {
                    script.parentNode.removeChild(script);
                }
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error(requestIdentifier + 'JSONP request timed out.');
                Scribe.error(ex.stack);
                //? }
            }
        };

        if (args.globalTimeout) {
            SpaceCamp.services.TimerService.addTimerCallback(args.sessionId, onTimeout);
        }

        if (args.timeout) {
            timer = setTimeout(onTimeout, args.timeout);
        }

        var onSuccess = function () {
            try {
                if (!timedOut) {
                    clearTimeout(timer);
                } else {
                    if (!args.continueAfterTimeout) {
                        return;
                    }
                }

                if (args.onSuccess) {
                    args.onSuccess(null, System.now(), timedOut);
                }

                timedOut = true;

                if (!args.useImgTag) {
                    script.parentNode.removeChild(script);
                }
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('"onSuccess" callback threw an error.');
                Scribe.error(ex.stack);
                //? }
            }
        };

        if (script.onload === null) {
            script.onload = onSuccess;
        } else {
            script.onreadystatechange = function () {
                if (script.readyState === 'loaded' || script.readyState === 'complete') {
                    script.onreadystatechange = null;
                    onSuccess();
                }
            };
        }

        var onFailure = function () {
            try {
                if (!timedOut) {
                    clearTimeout(timer);
                    timedOut = true;
                } else {
                    if (!args.continueAfterTimeout) {
                        return;
                    }
                }

                if (args.onFailure) {
                    args.onFailure();
                }

                if (!args.useImgTag) {
                    script.parentNode.removeChild(script);
                }
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('"onFailure" callback threw an error.');
                Scribe.error(ex.stack);
                //? }
            }
        };

        script.onerror = onFailure;

        startTime = System.now();

        script.src = url;

        if (!args.useImgTag) {
            var node = scope.document.getElementsByTagName('script')[0];

            if (!node) {
                if (UserAgentMatcher.msie || UserAgentMatcher.msedge || UserAgentMatcher.mozilla) {
                    scope.onload = function () {
                        scope.document.body.appendChild(script);
                    };
                } else {
                    scope.document.body.appendChild(script);
                }
            } else {
                node.parentNode.insertBefore(script, node);
            }
        }

        return startTime;
    }

    function ajax(args) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                async: {
                    type: 'boolean',
                    optional: true
                },
                contentType: {
                    type: ['string', 'boolean'],
                    optional: true
                },
                continueAfterTimeout: {
                    type: 'boolean',
                    optional: true
                },
                data: {
                    type: ['object', 'string'],
                    optional: true
                },
                headers: {
                    type: 'object',
                    optional: true
                },
                jsonp: {
                    type: 'boolean',
                    optional: true
                },
                method: {
                    type: 'string',
                    pattern: /(GET|POST)/
                },
                onFailure: {
                    type: 'function',
                    optional: true
                },
                onSuccess: {
                    type: 'function',
                    optional: true
                },
                onTimeout: {
                    type: 'function',
                    optional: true
                },
                initiatorId: {
                    type: 'string',
                    optional: true
                },
                scope: {
                    type: 'object',
                    optional: true
                },
                sessionId: {
                    type: 'string',
                    optional: true
                },
                timeout: {
                    type: 'integer',
                    gte: 0,
                    optional: true
                },
                globalTimeout: {
                    optional: 'true',
                    type: 'boolean'
                },
                url: {
                    type: 'string',
                    pattern: 'url'
                },
                withCredentials: {
                    type: 'boolean',
                    optional: true
                }
            }
        }, args);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        if (!isXhrSupported()) {
            if (args.jsonp && args.method === 'GET') {
                return jsonp(args);
            }

            throw Whoopsie('INTERNAL_ERROR', 'XHR is not supported in this browser.');
        }

        //? if (DEBUG) {
        var requestIdentifier = args.initiatorId + '-' + args.sessionId + ' => ';
        //? }

        var startTime = null;

        var scope = args.scope || window;

        var xhr = new scope.XMLHttpRequest();

        var url = args.url;

        var data = null;
        if (args.data) {
            if (args.method === 'GET') {
                var qs;

                if (Utilities.isString(args.data)) {
                    qs = args.data;
                } else {
                    qs = objToQueryString(args.data);
                }

                url = buildUrl(args.url, null, qs);
            } else if (args.method === 'POST') {
                if (Utilities.isString(args.data)) {
                    data = args.data;
                } else {
                    data = JSON.stringify(args.data);
                }
            }
        }

        var async = true;
        if (args.hasOwnProperty('async')) {
            async = args.async;
        }

        xhr.open(args.method, url, async);

        var contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
        if (args.contentType !== undefined) {
            contentType = args.contentType;
        }

        if (contentType) {
            xhr.setRequestHeader('Content-Type', contentType);
        }

        if (args.headers) {
            if (!args.headers.hasOwnProperty('X-Request-With')) {
                xhr.setRequestHeader('X-Request-With', 'XMLHttpRequest');
            }

            for (var field in args.headers) {
                if (!args.headers.hasOwnProperty(field)) {
                    continue;
                }

                xhr.setRequestHeader(field, args.headers[field]);
            }
        }

        if (args.withCredentials) {
            xhr.withCredentials = true;
        }

        var timer;
        var timedOut = false;

        var onTimeout = function () {
            try {
                if (timedOut) {
                    return;
                }

                timedOut = true;

                if (args.onTimeout) {
                    args.onTimeout();
                }
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error(requestIdentifier + ' "onTimeout" callback threw an error.');
                Scribe.error(ex.stack);
                //? }
            }
        };

        if (args.globalTimeout) {
            SpaceCamp.services.TimerService.addTimerCallback(args.sessionId, onTimeout);
        }

        if (args.timeout) {
            if (args.continueAfterTimeout) {
                timer = setTimeout(onTimeout, args.timeout);
            } else {
                xhr.timeout = args.timeout;
                xhr.ontimeout = onTimeout;
            }
        }

        if (args.onSuccess || args.onFailure) {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (!timedOut) {
                        clearTimeout(timer);
                        xhr.ontimeout = null;
                    } else {
                        if (!args.continueAfterTimeout) {
                            return;
                        }
                    }

                    //? if (DEBUG) {
                    Scribe.info(requestIdentifier + 'XHR request responded with status "' + xhr.statusText + '".');
                    //? }

                    if (xhr.status === 200) {
                        if (args.onSuccess) {
                            try {
                                args.onSuccess(xhr.responseText, System.now(), timedOut);
                            } catch (ex) {
                                //? if (DEBUG) {
                                Scribe.error(requestIdentifier + '"onSuccess" callback threw an error.');
                                Scribe.error(ex.stack);
                                //? }
                            }
                        }
                    } else {
                        if (args.onFailure) {
                            try {
                                args.onFailure(xhr.status);
                            } catch (ex) {
                                //? if (DEBUG) {
                                Scribe.error(requestIdentifier + '"onFailure" callback threw an error.');
                                Scribe.error(ex.stack);
                                //? }
                            }
                        }
                    }

                    timedOut = true;
                }
            };
        }

        startTime = System.now();
        xhr.send(data);

        return startTime;
    }

    function img(args) {
        args.useImgTag = true;

        return jsonp(args);
    }

    (function __constructor() {
        __xhrSupported = window.XMLHttpRequest && typeof (new XMLHttpRequest()).responseType === 'string';
    })();

    return {

        //? if (DEBUG) {
        __type__: 'Network',
        //? }

        ajax: ajax,
        jsonp: jsonp,
        img: img,
        buildUrl: buildUrl,
        objToQueryString: objToQueryString,
        isXhrSupported: isXhrSupported
    };
}

module.exports = Network();
