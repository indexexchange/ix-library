'use strict';

var Constants = require('constants.js');
var System = require('system.js');
var Whoopsie = require('whoopsie.js');

//? if (DEBUG) {
var Inspector = require('schema-inspector.js');
//? }

function OpenRtb() {

    function BidRequest() {

        if (!(this instanceof BidRequest)) {
            return new BidRequest();
        }

        //? if (DEBUG) {
        this.__type__ = 'BidRequest';
        //? }

        this.__bidRequest = {
            id: System.generateUniqueId(8, 'NUM'),
            site: {
                page: ''
            },
            imp: []
        };

        this.__impCount = 0;
    }

    BidRequest.prototype.setPage = function (page) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string',
            minLength: 1
        }, page);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.site.page = page;
    };

    BidRequest.prototype.setRef = function (ref) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string',
            minLength: 1
        }, ref);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.site.ref = ref;
    };

    BidRequest.prototype.setSiteId = function (id) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'string',
            minLength: 1
        }, id);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.site.id = id;
    };

    BidRequest.prototype.setPublisher = function (publisher) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    minLength: 1,
                    optional: true
                },
                name: {
                    type: 'string',
                    minLength: 1,
                    optional: true
                },
                cat: {
                    type: 'array',
                    items: {
                        type: 'string'
                    },
                    optional: true
                },
                domain: {
                    type: 'string',
                    minLength: 1,
                    optional: true
                },
                ext: {
                    type: 'object',
                    optional: true
                }
            }
        }, publisher);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.site.publisher = publisher;
    };

    BidRequest.prototype.setSiteExt = function (ext) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object'
        }, ext);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.site.ext = ext;
    };

    BidRequest.prototype.deviceTypeMapping = {
        desktop: 2,
        mobile: 4,
        tablet: 5
    };
    BidRequest.prototype.setDeviceType = function (deviceType) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: ['string', 'number'],
            eq: [
                'desktop',
                'mobile',
                'tablet',
                1,
                2,
                3,
                4,
                5,
                6,
                7
            ]
        }, deviceType);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.device = this.__bidRequest.device || {};
        this.__bidRequest.device.devicetype = this.deviceTypeMapping[deviceType] ? this.deviceTypeMapping[deviceType] : deviceType;
    };

    BidRequest.prototype.setSource = function (source) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object',
            properties: {
                fd: {
                    type: 'number',

                    eq: [0, 1],

                    optional: true
                },
                tid: {
                    type: 'string',
                    minLength: 1,
                    optional: true
                },
                pchain: {
                    type: 'string',
                    minLength: 1,
                    optional: true
                },
                ext: {
                    type: 'object',
                    optional: true
                }
            }
        }, source);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.source = source;
    };

    BidRequest.prototype.setTmax = function (tmax) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'number',
            gt: 0
        }, tmax);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.tmax = tmax;
    };

    BidRequest.prototype.setAuctionType = function (at) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'number',

            eq: [1, 2]
        }, at);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.at = at;
    };

    BidRequest.prototype.setExt = function (ext) {
        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object'
        }, ext);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidRequest.ext = ext;
    };

    BidRequest.prototype.setTest = function () {

        this.__bidRequest.test = 1;
    };

    BidRequest.prototype.getId = function () {
        return this.__bidRequest.id;
    };

    //? if (DEBUG) {
    var impObjectInspectorSchema = {
        type: 'object',
        properties: {
            id: {
                type: 'string',
                minLength: 1,
                optional: true
            },
            tagid: {
                type: 'string',
                minLength: 1,
                optional: true
            },
            banner: {
                type: 'object',
                properties: {
                    format: {
                        type: 'array',
                        minLength: 1,
                        items: {
                            type: 'object',
                            properties: {
                                w: {
                                    type: 'integer',
                                    gte: Constants.MIN_BANNER_DIMENSION
                                },
                                h: {
                                    type: 'integer',
                                    gte: Constants.MIN_BANNER_DIMENSION
                                },
                                ext: {
                                    type: 'object',
                                    optional: true
                                }
                            }
                        },
                        optional: true
                    },
                    pos: {
                        type: 'number',

                        eq: [
                            0,
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7
                        ]
                    },
                    ext: {
                        type: 'object',
                        optional: true
                    }
                },
                optional: true
            }
        }
    };
    //? }

    BidRequest.prototype.addImp = function (imp) {
        //? if (DEBUG) {
        var result = Inspector.validate(impObjectInspectorSchema, imp);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        if (!imp.id) {
            imp.id = String(++this.__impCount);
        }

        this.__bidRequest.imp.push(imp);

        return imp.id;
    };

    BidRequest.prototype.setImps = function (imps) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'array',
            items: impObjectInspectorSchema
        }, imps);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }
        this.__bidRequest.imp = imps;
    };

    BidRequest.prototype.setGdprConsent = function (gdprApplies, gdprConsentString) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                gdprApplies: {
                    type: 'boolean'
                },
                gdprConsentString: {
                    type: 'string'
                }
            }
        }, {
            gdprApplies: gdprApplies,
            gdprConsentString: gdprConsentString
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        this.__bidRequest.regs = this.__bidRequest.regs || {};
        this.__bidRequest.regs.ext = this.__bidRequest.regs.ext || {};
        this.__bidRequest.regs.ext.gdpr = gdprApplies ? 1 : 0;

        this.__bidRequest.user = this.__bidRequest.user || {};
        this.__bidRequest.user.ext = this.__bidRequest.user.ext || {};
        this.__bidRequest.user.ext.consent = gdprConsentString || '';
    };

    BidRequest.prototype.setGdprAddtlConsent = function (addtlConsent) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'string',
            strict: true
        }, addtlConsent);

        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        if (addtlConsent !== '') {

            this.__bidRequest.user.ext.consented_providers_settings
                = this.__bidRequest.user.ext.consented_providers_settings || {};

            this.__bidRequest.user.ext.consented_providers_settings.consented_providers
                = addtlConsent || '';
        }
    };

    BidRequest.prototype.stringify = function () {
        return JSON.stringify(this.__bidRequest);
    };

    function BidResponse(bidResponse) {

        if (!(this instanceof BidResponse)) {
            return new BidResponse(bidResponse);
        }

        //? if (DEBUG) {
        this.__type__ = 'BidResponse';
        //? }

        //? if (DEBUG) {
        var results = Inspector.validate({
            type: 'object'
        }, bidResponse);

        if (!results.valid) {
            throw Whoopsie('INVALID_ARGUMENT', results.format());
        }
        //? }

        this.__bidResponse = bidResponse;
    }

    BidResponse.prototype.__parseBid = function (rawBid, bids) {
        var bid = {};

        if (rawBid.hasOwnProperty('impid')) {
            bid.impid = rawBid.impid;
        }

        if (rawBid.hasOwnProperty('price')) {
            bid.price = rawBid.price;
        }

        if (rawBid.hasOwnProperty('adm')) {
            bid.adm = rawBid.adm;
        }

        if (rawBid.hasOwnProperty('ext')) {
            bid.ext = rawBid.ext;
        }

        if (rawBid.hasOwnProperty('dealid')) {
            bid.dealid = rawBid.dealid;
        }

        if (rawBid.hasOwnProperty('nurl')) {
            bid.nurl = rawBid.nurl;
        }

        if (rawBid.hasOwnProperty('nbr')) {
            bid.nbr = rawBid.nbr;
        }

        if (rawBid.hasOwnProperty('w')) {
            bid.w = rawBid.w;
        }

        if (rawBid.hasOwnProperty('h')) {
            bid.h = rawBid.h;
        }

        bids.push(bid);
    };

    BidResponse.prototype.getId = function () {
        return this.__bidResponse.id;
    };

    BidResponse.prototype.getCur = function () {
        return this.__bidResponse.cur || 'USD';
    };

    BidResponse.prototype.getBids = function () {
        var bids = [];
        var innerBids;
        var seatbid;

        if (!this.__bidResponse.hasOwnProperty('seatbid')) {
            return bids;
        }

        seatbid = this.__bidResponse.seatbid;
        for (var i = 0; i < seatbid.length; i++) {
            if (!seatbid[i].hasOwnProperty('bid')) {
                continue;
            }

            innerBids = seatbid[i].bid;
            for (var j = 0; j < innerBids.length; j++) {
                this.__parseBid(innerBids[j], bids);
            }
        }

        return bids;
    };

    return {

        //? if (DEBUG) {
        __type__: 'OpenRtb2.5',
        //? }

        BidRequest: BidRequest,
        BidResponse: BidResponse
    };
}

module.exports = OpenRtb();