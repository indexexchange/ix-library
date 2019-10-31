'use strict';

var UserAgentMatcher = require('user-agent-matcher.js');

var API;

var BASE_URL = '//mid.rkdms.com/idsv2';

var AUTHORIZATION_TOKEN = '17c1789b-e660-493b-aa74-3c8fb990dc5f';

var profile = {
    partnerId: 'MerkleIp',
    statsId: 'MRKL',
    version: '1.3.1',
    source: 'merkleinc.com',
    cacheExpiry: {

        match: 604800000,

        pass: 86400000,

        error: 86400000
    },
    targetingKeys: {
        exchangeBidding: 'ixpid_4'
    }
};

function retrieve() {
    var reqData = {};

    reqData.ptk = AUTHORIZATION_TOKEN;
    reqData.pubid = API.configs.pubid;

    API.Utilities.ajax({
        url: API.Utilities.getProtocol() + BASE_URL,
        method: 'GET',
        data: reqData,
        onSuccess: function (data) {
            try {
                var matchData;
                var rsp = JSON.parse(data);

                if (!API.Utilities.isObject(rsp)) {
                    API.registerError('invalid response');

                    return;
                }

                var uids = [];
                if (rsp.ppid) {
                    if (!rsp.ppid.id) {
                        API.registerError('invalid ppid object');

                        return;
                    }

                    uids.push({
                        id: rsp.ppid.id,
                        ext: {
                            enc: 0
                        }
                    });
                }

                if (rsp.pam_id && !UserAgentMatcher.msie) {
                    if (!rsp.pam_id.id || !rsp.pam_id.keyID) {
                        API.registerError('invalid pam_id object');

                        return;
                    }

                    uids.push({
                        id: rsp.pam_id.id,
                        ext: {
                            keyID: rsp.pam_id.keyID,
                            enc: 1
                        }
                    });
                }

                if (uids.length) {
                    matchData = {
                        source: profile.source,
                        uids: uids
                    };

                    API.registerMatch(matchData);
                } else {
                    API.registerPass();
                }
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
