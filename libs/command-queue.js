'use strict';

var Utilities = require('utilities.js');

//? if (DEBUG) {
var Scribe = require('scribe.js');
//? }

function CommandQueue(queue) {

    function push(fn) {
        if (!Utilities.isFunction(fn)) {
            //? if (DEBUG) {
            Scribe.warn('Pushed a non-function into the command queue.');
            //? }

            return;
        }

        try {
            fn();
        } catch (ex) {
            //? if (DEBUG) {
            Scribe.error('Error occurred while running the command queue.');
            Scribe.error(ex.stack);
            //? }
        }
    }

    (function __constructor() {
        if (!Utilities.isArray(queue)) {
            //? if (DEBUG) {
            Scribe.warn('Queue passed in is not an array.');
            //? }

            return;
        }

        for (var i = 0; i < queue.length; i++) {
            try {
                queue[i]();
            } catch (ex) {
                //? if (DEBUG) {
                Scribe.error('Error occurred while running the command queue.');
                Scribe.error(ex.stack);
                //? }
            }
        }
    })();

    return {

        //? if (DEBUG) {
        __type__: 'CommandQueue',
        //? }

        push: push
    };
}

module.exports = CommandQueue;