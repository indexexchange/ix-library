'use strict';

var API;
var BASE_URL = '//match.adsrvr.org/track/rid';
var TTD_PID = 'casale';
var FORMAT = 'json';

var profile = {
    partnerId: 'AdserverOrgIp',
    statsId: 'ADSORG',
    version: '1.3.0',
    source: 'adserver.org',
    cacheExpiry: {
        match: 604800000,
        pass: 86400000,
        error: 86400000
    },
    targetingKeys: {
        exchangeBidding: 'ixpid_1'
    }
};

function retrieve() {
    var reqData = {
        ttd_pid: TTD_PID,
        fmt: FORMAT,
        p: API.configs.publisherId
    };

    var consent = API.Utilities.getConsent('gdpr');
    if (consent) {
        if ( consent.applies == true ) {
            reqData["gdpr"] = 1;
    } else if ( consent.applies == false ) {
            reqData["gdpr"] = 0;
        }

        if ( consent.consentString ) {
            reqData["gdpr_consent"] = consent.consentString;
        }
    }

    API.Utilities.ajax({
        url: API.Utilities.getProtocol() + BASE_URL,
        method: 'GET',
        data: reqData,
        onSuccess: function (data) {
            try {
                var rsp = JSON.parse(data);

                if (!rsp.TDID) {
                    API.registerError('response does not contain TDID');

                    return;
                }

                var uids = [];
                for (var sourceId in rsp) {
                    if (!rsp.hasOwnProperty(sourceId)) {
                        continue;
                    }

                    uids.push({
                        id: rsp[sourceId],
                        ext: {
                            rtiPartner: sourceId
                        }
                    });
                }

                API.registerMatch({
                    source: profile.source,
                    uids: uids
                });
            } catch (e) {
                API.registerError('response is not valid JSON');
            }
        },
        onFailure: function (statusCode) {
            API.registerError('API returned error response ' + statusCode);
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
