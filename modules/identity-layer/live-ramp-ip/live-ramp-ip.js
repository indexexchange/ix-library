'use strict';

var API;

var BASE_URL = '//api.rlcdn.com/api/identity';

var PARTNER_ID = 2;

var profile = {
    partnerId: 'LiveRampIp',
    statsId: 'LVRAMP',
    version: '1.2.0',
    source: 'liveramp.com',
    cacheExpiry: {

        match: 86400000,

        pass: 86400000,

        error: 86400000
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
    API.Utilities.ajax({
        url: API.Utilities.getProtocol() + BASE_URL,
        method: 'GET',
        data: reqData,
        onSuccess: function (data) {
            try {
                var rsp = JSON.parse(data);

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

                API.registerMatch({
                    source: profile.source,
                    uids: [
                        {
                            id: rsp.envelope,
                            ext: {
                                rtiPartner: 'idl'
                            }
                        }
                    ]
                });
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
