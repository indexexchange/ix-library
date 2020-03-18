'use strict';

var UserAgentMatcher = require('user-agent-matcher.js');

var API;

var TRADE_DESK_ID = '44489';

var FPC_KEY = '_li_duid';

var BASE_URL = '

var profile = {
    partnerId: 'LiveIntentIp',
    statsId: 'LVINT',
    version: '1.1.1',
    source: 'liveintent.com',
    cacheExpiry: {

        match: 259200000,

        pass: 86400000,

        error: 86400000
    },
    targetingKeys: {
        exchangeBidding: 'ixpid_5'
    }
};

function getFpc() {
    try {
        return localStorage.getItem(FPC_KEY);
    } catch (e) {
        return null;
    }
}

function getTtdid() {
    var adsvrData = API.Utilities.getIdentityResultFrom('AdserverOrgIp');
    if (adsvrData) {

        if (adsvrData.TDID) {

            return adsvrData.TDID;
        } else if (adsvrData.uids) {

            var tdidElement = adsvrData.uids.find(function (e) {
                return e.id && e.ext && e.ext.rtiPartner === 'TDID';
            });

            if (tdidElement) {
                return tdidElement.id;
            }
        }
    }

    return null;
}

function retrieve() {

    if (UserAgentMatcher.msie) {
        API.registerError('Encrypted pid not supported in Internet Explorer');

        return;
    }

    var reqData = {};

    var fpc = getFpc();
    if (fpc) {
        reqData.duid = fpc;
    }

    var ttdid = getTtdid();
    if (ttdid) {
        reqData[TRADE_DESK_ID] = ttdid;
    }

    API.Utilities.ajax({
        url: API.Utilities.getProtocol() + BASE_URL,
        method: 'GET',
        data: reqData,
        onSuccess: function (data) {
            try {
                var rsp = JSON.parse(data);

                if (rsp && rsp.unifiedId) {
                    if (rsp.unifiedId.id && rsp.unifiedId.keyID) {
                        API.registerMatch({
                            source: profile.source,
                            uids: [
                                {
                                    id: rsp.unifiedId.id,
                                    ext: {
                                        keyID: rsp.unifiedId.keyID,
                                        rtiPartner: 'LDID',
                                        enc: 1
                                    }
                                }
                            ]
                        });
                    } else {
                        API.registerError('response missing id and/or keyID');
                    }
                } else {
                    API.registerError('response missing unifiedId object');
                }
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
    //? if (TEST) {
    test: {
        get getFpc() {
            return getFpc;
        },
        set getFpc(fn) {
            getFpc = fn;
        },
        get getTtdid() {
            return getTtdid;
        },
        set getTtdid(fn) {
            getTtdid = fn;
        }
    },
    //? }
    type: 'identity',
    api: '1',
    main: main,
    profile: profile
};