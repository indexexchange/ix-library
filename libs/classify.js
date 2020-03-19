'use strict';

var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function Classify() {

    function __removeProtectedMembers(theClass) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                theClass: {
                    type: 'object',
                    properties: {
                        __type__: {
                            type: 'string'
                        }
                    }
                }
            }
        }, {
            theClass: theClass
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        for (var member in theClass) {
            if (!theClass.hasOwnProperty(member)) {
                continue;
            }

            if (member[0] === '_' && member.slice(0, 2) !== '__') {
                delete theClass[member];
            }
        }

        return theClass;
    }

    function derive(base, derived) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                base: {
                    type: 'object',
                    properties: {
                        __type__: {
                            type: 'string',
                            minLength: 1
                        }
                    }
                },
                derived: {
                    type: 'object',
                    properties: {
                        __type__: {
                            type: 'string',
                            minLength: 1
                        }
                    }
                }
            }
        }, {
            base: base,
            derived: derived
        });

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        var theClass = {};

        var member;

        for (member in base) {
            if (!base.hasOwnProperty(member)) {
                continue;
            }

            theClass[member] = base[member];
        }

        for (member in derived) {
            if (!derived.hasOwnProperty(member)) {
                continue;
            }

            theClass[member] = derived[member];
        }

        return __removeProtectedMembers(theClass);
    }

    return {

        //? if (DEBUG) {
        __type__: 'Classify',
        //? }

        //? if (TEST) {
        __removeProtectedMembers: __removeProtectedMembers,
        //? }

        derive: derive
    };
}

module.exports = Classify();