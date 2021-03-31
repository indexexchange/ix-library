'use strict';

var UserAgentMatcher = require('user-agent-matcher.js');

var API;

var BASE_URL = '//mid.rkdms.com/idsv2';

var BASE_4CITE_URL = '//id.sv.rkdms.com/identity/';

var AUTHORIZATION_TOKEN = '17c1789b-e660-493b-aa74-3c8fb990dc5f';

var profile = {
    partnerId: 'MerkleIp',
    statsId: 'MRKL',
    version: '1.4.2',
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

function makeAPICall(reqData, endpoint) {
    var entrypoints = [];

    API.Utilities.ajax({
        url: API.Utilities.getProtocol() + endpoint,
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

                if (rsp.c && rsp.c.value) {
                    localStorage.setItem('_svsid',rsp.c.value);
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

function retrieve() {
    var _svsid = '';
    var reqData = {};
    var SVSID_KEY = '_svsid';

    if (!API.configs.enable4CiteTag) {
        reqData.ptk = AUTHORIZATION_TOKEN;
        reqData.pubid = API.configs.pubid;
        makeAPICall(reqData, BASE_URL);
    } else {
        if (localStorage.getItem('__svsid')) localStorage.removeItem('__svsid');
        _svsid = localStorage.getItem(SVSID_KEY) ? localStorage.getItem(SVSID_KEY) : null ;
        reqData.vendor = 'idsv2';
        reqData.sv_cid = '5274_04512';
        reqData.sv_pubid = API.configs.pubid;
        reqData.sv_domain = document.location.hostname;
        if (_svsid) {
            reqData.sv_session = _svsid
        }
        makeAPICall(reqData, BASE_4CITE_URL);
    }
}

function main(apiObject) {
    API = apiObject;
    API.onRetrieve(retrieve);
}

module.exports = {
    //? if (TEST) {
    test: {
        get makeAPICall() {
            return makeAPICall;
        },
        set makeAPICall(fn) {
            makeAPICall = fn;
        }
    },
    //? }
    type: 'identity',
    api: '1',
    main: main,
    profile: profile
};
