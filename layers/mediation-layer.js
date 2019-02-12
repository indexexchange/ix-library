'use strict';

var Classify = require('classify.js');
var Layer = require('layer.js');
var Constants = require('constants.js');
var Utilities = require('utilities.js');
var Whoopsie = require('whoopsie.js');
var SpaceCamp = require('space-camp.js');

var EventsService;

//? if (DEBUG) {
var ConfigValidators = require('config-validators.js');
var Scribe = require('scribe.js');
//? }

function MediationLayer(configs) {
    var __baseClass;

    var __mediationLevel;

    function __executor(sessionId, inParcels) {
        return __baseClass._executeNext(sessionId, inParcels).then(function (receivedParcels) {
            //? if (DEBUG) {
            Scribe.info('Mediating the following bids for session ' + sessionId);
            Scribe.info(JSON.stringify(receivedParcels.map(function (parcel) {
                if (!parcel.htSlot) {
                    return;
                }

                return {
                    htSlotName: parcel.htSlot.getName(),
                    partnerId: parcel.partnerId,
                    price: Utilities.isNumber(parcel.price) ? parcel.price : 'pass'
                };
            }), null, 4));
            //? }

            var htSlotNameToHighestParcel = {
                slot: {},
                partner: {}
            };
            var returnParcels = [];
            var originalParcels = receivedParcels.slice();

            while (receivedParcels.length) {
                var currentParcel = Utilities.randomSplice(receivedParcels);

                if (!currentParcel.htSlot) {
                    continue;
                }

                var currentHtSlotName = currentParcel.htSlot.getName();

                if (currentParcel.pass) {
                    continue;
                }

                if (!currentParcel.hasOwnProperty('price') || !Utilities.isNumber(currentParcel.price)) {
                    //? if (DEBUG) {
                    Scribe.warn('Parcel from "' + currentParcel.partnerId + '" does not contain a numeric price.');
                    //? }
                    if (__mediationLevel === Constants.MediationLevels.PARTNER) {
                        returnParcels.push(currentParcel);
                    }
                } else {
                    if (!htSlotNameToHighestParcel.slot.hasOwnProperty(currentHtSlotName)) {
                        htSlotNameToHighestParcel.slot[currentHtSlotName] = currentParcel;
                    } else {
                        if (htSlotNameToHighestParcel.slot[currentHtSlotName].price < currentParcel.price) {
                            htSlotNameToHighestParcel.slot[currentHtSlotName] = currentParcel;
                        }
                    }

                    if (__mediationLevel === Constants.MediationLevels.PARTNER) {
                        htSlotNameToHighestParcel.partner[currentHtSlotName] = htSlotNameToHighestParcel.partner[currentHtSlotName] || {};
                        if (!htSlotNameToHighestParcel.partner[currentHtSlotName].hasOwnProperty(currentParcel.partnerId)) {
                            htSlotNameToHighestParcel.partner[currentHtSlotName][currentParcel.partnerId] = currentParcel;
                        } else if (htSlotNameToHighestParcel.partner[currentHtSlotName][currentParcel.partnerId].price < currentParcel.price) {
                            htSlotNameToHighestParcel.partner[currentHtSlotName][currentParcel.partnerId] = currentParcel;
                        }
                    }
                    //? if (DEBUG) {
                    Scribe.info('Parcel from "' + currentParcel.partnerId + '" has price "' + currentParcel.price + '".');
                    //? }
                }
            }

            for (var htSlotName in htSlotNameToHighestParcel.slot) {
                if (!htSlotNameToHighestParcel.slot.hasOwnProperty(htSlotName)) {
                    continue;
                }

                var highestParcel = htSlotNameToHighestParcel.slot[htSlotName];

                //? if (DEBUG) {
                Scribe.info('Overall winner for htSlot "' + htSlotName + '":');
                Scribe.info(JSON.stringify({
                    htSlotName: highestParcel.htSlot.getName(),
                    partnerId: highestParcel.partnerId,
                    price: highestParcel.price
                }, null, 4));
                //? }

                EventsService.emit('hs_slot_highest_bid', {
                    sessionId: sessionId,
                    statsId: highestParcel.partnerStatsId,
                    htSlotId: highestParcel.htSlot.getId(),
                    requestId: highestParcel.requestId,
                    xSlotNames: [highestParcel.xSlotName]
                });

                if (__mediationLevel === Constants.MediationLevels.HT_SLOT) {
                    returnParcels.push(highestParcel);
                } else if (__mediationLevel === Constants.MediationLevels.PARTNER) {
                    //? if (DEBUG) {
                    if (!htSlotNameToHighestParcel.partner.hasOwnProperty(htSlotName)) {
                        Scribe.error('htSlotNameToHighestParcel should have `' + htSlotName + '` in partner object.');
                    }
                    //? }

                    for (var partnerId in htSlotNameToHighestParcel.partner[htSlotName]) {
                        if (!htSlotNameToHighestParcel.partner[htSlotName].hasOwnProperty(partnerId)) {
                            continue;
                        }

                        //? if (DEBUG) {
                        Scribe.info('The highest price for "' + htSlotName + '" from "' + partnerId + '" is:');

                        var highestPartnerParcel = htSlotNameToHighestParcel.partner[htSlotName][partnerId];
                        Scribe.info(JSON.stringify({
                            htSlotName: highestPartnerParcel.htSlot.getName(),
                            partnerId: highestPartnerParcel.partnerId,
                            price: highestPartnerParcel.price
                        }, null, 4));
                        //? }

                        returnParcels.push(htSlotNameToHighestParcel.partner[htSlotName][partnerId]);
                    }
                }
            }

            if (__mediationLevel === Constants.MediationLevels.NONE) {
                return originalParcels;
            }

            return returnParcels;
        });
    }

    (function __constructor() {
        EventsService = SpaceCamp.services.EventsService;
        //? if (DEBUG) {
        var results = ConfigValidators.MediationLayer(configs);

        if (results) {
            throw Whoopsie('INVALID_CONFIG', results);
        }
        //? }
        __baseClass = Layer();
        __baseClass._setExecutor(__executor);
        __mediationLevel = Constants.MediationLevels[configs.mediationLevel];
    })();

    return Classify.derive(__baseClass, {

        //? if (DEBUG) {
        __type__: 'MediationLayer',
        //? }

        //? if (TEST) {
        __executor: __executor
        //? }
    });
}

module.exports = MediationLayer;
