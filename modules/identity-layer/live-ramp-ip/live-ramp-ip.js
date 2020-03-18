'use strict';

var API;

var BASE_URL = '//api.rlcdn.com/api/identity',

var PARTNER_ID = 2;

var CONSENT_TCF_KEY = 'ct';
var CONSENT_TCF_VERSION = 1;

var profile = {
    partnerId: 'LiveRampIp',
    statsId: 'LVRAMP',
    version: '1.3.0',
    source: 'liveramp.com',
    cacheExpiry: {

        match: 86400000,

        pass: 86400000,

        error: 86400000
    },
    consent: {
        gdpr: 'cv'
    },
    targetingKeys: {
        exchangeBidding: 'ixpid_3'
    }
};

function retrieve() {
    var reqData = {
        pid: PARTNER_ID,
        rt: 'envelope'
    };

    var consent = API.Utilities.getConsent('gdpr');
    if (consent && consent.consentString) {
        reqData[profile.consent.gdpr] = consent.consentString;

        reqData[CONSENT_TCF_KEY] = CONSENT_TCF_VERSION;
    }

    var entrypoints = [];

    API.Utilities.ajax({
        url: API.Utilities.getProtocol() + BASE_URL,
        method: 'GET',
        data: reqData,
        onSuccess: function (data) {
            try {
                var rsp = JSON.parse(data);
                var matchData;

                if (!API.Utilities.isObject(rsp)) {
                    API.registerError('invalid response');

                    return;
                }

                if (API.Utilities.isEmpty(rsp)) {
                    API.registerPass();

                    return;
                }

                if (!rsp.hasOwnProperty('envelope')) {
                    API.registerError('invalid envelope object');

                    return;
                }

                if (API.Utilities.isEmpty(rsp.envelope)) {
                    API.registerPass();

                    return;
                }

                matchData = {
                    source: profile.source,
                    uids: [
                        {
                            id: rsp.envelope,
                            ext: {
                                rtiPartner: 'idl'
                            }
                        }
                    ]
                };

                API.registerMatch(matchData);
            } catch (e) {
                API.registerError('response is not valid JSON');
            }
        },
        onFailure: function (statusCode) {
            if (statusCode === 204) {
                API.registerPass();
            } else {
                API.registerError('API returned error response ' + statusCode);
            }
        }
    });
}

function main(apiObject) {
    API = apiObject;
    API.onRetrieve(retrieve);
}

module.exports = {
    type: 'identity',
    api: '1',
    main: main,
    profile: profile
};