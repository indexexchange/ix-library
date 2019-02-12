'use strict';

var SpaceCamp = {

    //? writeln('NAMESPACE: \'' + __NAMESPACE__ + '\',');

    //? writeln('PRODUCT: \'' + PRODUCT + '\',');

    services: {},

    htSlots: [],

    htSlotsMap: {},

    DeviceTypeChecker: {},

    initQueue: [],

    globalTimeout: null,

    instanceId: null,

    version: '2.9.8'
};

module.exports = SpaceCamp;
