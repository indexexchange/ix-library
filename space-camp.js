'use strict';

var SpaceCamp = {

    //? writeln('NAMESPACE: \'' + __NAMESPACE__ + '\',');

    //? writeln('PRODUCT: \'' + PRODUCT + '\',');

    services: {},

    //? if (PRODUCT !== 'IdentityLibrary') {
    htSlots: [],

    htSlotsMap: {},
    //? }
    DeviceTypeChecker: {},

    initQueue: [],

    globalTimeout: null,

    instanceId: null,

    version: '2.22.0'
};

module.exports = SpaceCamp;
