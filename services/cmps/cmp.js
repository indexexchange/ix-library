'use strict';

var Prms = require('prms.js');
var Utilities = require('utilities.js');
var Browser = require('browser.js');

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function Cmp() {

    var __retrievers;

    var _postMessageId;

    var _defer;

    var _dataModel;

    var _cleanup;

    var _customFunction;

    var _obtainedConsent;

    function _getDataModelValue(propertyName, dataModel) {

        dataModel = dataModel || this._dataModel;

        if (dataModel.hasOwnProperty(propertyName)) {
            if (dataModel[propertyName].hasOwnProperty('value')) {
                return dataModel[propertyName].value;
            } else if (dataModel[propertyName].hasOwnProperty('default')) {
                return dataModel[propertyName].default;
            }
        }

        return null;
    }

    function retrieve() {
        var calledSomehow = false;
        var successfulRetriever;

        for (var r = 0; r < __retrievers.length; r++) {
            if (__retrievers[r].retrieve()) {
                calledSomehow = true;
                successfulRetriever = r;

                break;
            }
        }

        if (!calledSomehow) {
            _defer.resolve();
        } else {
            __retrievers = __retrievers.splice(successfulRetriever, 1);
        }

        return calledSomehow;
    }

    function _addRetriever(retrieverFunction, name) {
        __retrievers.push({

            name: name || __retrievers.length,
            retrieve: retrieverFunction
        });
    }

    function _removeRetriever(name) {

        for (var r = __retrievers.length - 1; r >= 0; r--) {
            if (__retrievers[r].name === name) {
                __retrievers.splice(r, 1);
            }
        }
    }

    function _interpretResultObject(result) {
        var self = this;
        var model = self._dataModel;
        var properties = Object.keys(model);

        properties.forEach(function (property) {
            var propertyRules = model[property];

            var expectedType = 'string';
            var resultProperties = [];

            switch (Utilities.getType(propertyRules)) {
                case 'object':

                    if (propertyRules.hasOwnProperty('type')) {
                        expectedType = propertyRules.type;
                    } else {

                        return;
                    }

                    break;
                case 'string':

                    expectedType = model[property];

                    break;
                default:

                    break;
            }

            if (Utilities.getType(propertyRules) === 'object' && propertyRules.hasOwnProperty('properties')) {
                switch (Utilities.getType(propertyRules.properties)) {
                    case 'array':

                        resultProperties = propertyRules.properties;

                        break;

                    case 'object':

                        var versions = Object.keys(propertyRules.properties);
                        versions.sort().reverse()
                            .forEach(function (key) {
                                resultProperties.push(propertyRules.properties[key]);
                            });

                        break;

                    default:

                        return;
                }
            } else {

                resultProperties = [property];
            }

            resultProperties.some(function (resultProperty) {
                if (result.hasOwnProperty(resultProperty) && Utilities.getType(result[resultProperty]) === expectedType) {
                    self._dataModel[property].value = result[resultProperty];

                    return true;
                }
            });
        });
    }

    function _callCustomFunction(callback) {
        return function () {
            if (_customFunction !== null) {
                try {
                    _customFunction(callback);

                    return true;
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error('Custom function error:');
                    Scribe.error(ex);
                    //? }
                }
            }

            return false;
        };
    }

    function _callInWindow(windowFunction, command, argument, callback) {
        return function () {
            if (window[windowFunction] && Utilities.getType(window[windowFunction]) === 'function') {
                try {
                    window[windowFunction](command, argument, callback);

                    return true;
                } catch (ex) {
                    //? if (DEBUG) {
                    Scribe.error(windowFunction + ' function error:');
                    Scribe.error(ex);
                    //? }
                }
            }

            return false;
        };
    }

    function _messageListener(event, checkProperty, callback, listener) {
        try {
            var dataObj;

            if (Utilities.getType(event.data) === 'string') {
                dataObj = JSON.parse(event.data);
            } else {
                dataObj = event.data;
            }

            if (!dataObj.hasOwnProperty(checkProperty) || Utilities.getType(dataObj[checkProperty]) !== 'object') {
                return;
            }

            var retVal = dataObj[checkProperty];

            if (retVal.callId === this._postMessageId) {
                window.removeEventListener('message', listener, false);

                return callback(retVal.returnValue, retVal.success);
            }
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while handling CMP inter-frame message: ', ex.stack);
            //? }
        }
    }

    function _callInFrame(contextSearch, message, listener) {
        return function () {

            //? if (DEBUG) {
            Scribe.info('Looking for ancestor frame.');
            //? }

            var frame = Browser.traverseContextTree(function (context) {
                var childElements = [];
                if (context) {
                    childElements = context.document.getElementsByName(contextSearch);
                }

                if ((context && context[contextSearch]) || (childElements.length > 0 && childElements[0].tagName.toLowerCase() === 'iframe')) {
                    return context;
                }

                return null;
            });

            if (frame) {
                window.addEventListener('message', listener, false);
                frame.postMessage(message, '*');

                return true;
            }

            return false;
        };
    }

    function _registerCustomFunction(configFunction) {
        if (configFunction) {
            _customFunction = configFunction;

            try {
                _customFunction = eval(configFunction);
                if (Utilities.getType(_customFunction) !== 'function') {
                    //? if (DEBUG) {
                    Scribe.error('Error: custom function must have type function and doesn\'t');
                    //? }
                    _customFunction = null;
                }
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error evaluating custom function:');
                Scribe.error(ex);
                //? }
                _customFunction = null;
            }
        } else {
            _customFunction = null;
        }
    }

    function getConsent(dataModel) {
        var outputObject = {};
        Object.keys(dataModel).forEach(function (property) {
            outputObject[property] = _getDataModelValue(property, dataModel);
        });

        return outputObject;
    }

    function hasObtainedConsent() {
        return false;
    }

    function getPromise() {
        return {};
    }

    function runCleanup() {
        return _cleanup();
    }

    (function __constructor() {
        __retrievers = [];
        _dataModel = {};
        _defer = Prms.defer();
        _cleanup = function () { };
        _customFunction = null;
        _obtainedConsent = false;
    })();

    return {

        __type__: 'Cmp',

        _dataModel: _dataModel,
        _defer: _defer,
        _cleanup: _cleanup,
        _obtainedConsent: _obtainedConsent,
        _postMessageId: _postMessageId,

        retrieve: retrieve,
        getPromise: getPromise,
        getConsent: getConsent,
        hasObtainedConsent: hasObtainedConsent,
        runCleanup: runCleanup,
        _addRetriever: _addRetriever,
        _removeRetriever: _removeRetriever,
        _interpretResultObject: _interpretResultObject,
        _registerCustomFunction: _registerCustomFunction,
        _callInWindow: _callInWindow,
        _callCustomFunction: _callCustomFunction,
        _callInFrame: _callInFrame,
        _messageListener: _messageListener,
        _getDataModelValue: _getDataModelValue
    };
}

module.exports = Cmp;