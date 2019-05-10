'use strict';

var Constants = {
    DEFAULT_UID_LENGTH: 8,
    MIN_BANNER_DIMENSION: 1,
    MIN_BID_FLOOR: 0,
    MIN_SITE_ID: 0,
    DEFAULT_UID_CHARSET: 'ALPHANUM',
    SESSION_ID_LENGTH: 8,
    PUBKIT_AD_ID_LENGTH: 16,
    RENDER_SERVICE_EXPIRY_SWEEP_TIMER: 30000,
    DEFAULT_PARTNER_PRIORITY: 1,
    LineItemTypes: {
        ID_AND_SIZE: 1,
        ID_AND_PRICE: 2,
        CUSTOM: 3
    },
    DeviceTypeMethods: {
        USER_AGENT: 1,
        REFERENCE: 2,
        SIZE_MAPPING: 3
    },
    RequestArchitectures: {
        MRA: 1,
        SRA: 2
    },
    InitialLoadStates: {
        DISABLED: 1,
        ENABLED: 2
    },
    MediationLevels: {
        NONE: 1,
        HT_SLOT: 2,
        PARTNER: 3
    }
};

module.exports = Constants;
