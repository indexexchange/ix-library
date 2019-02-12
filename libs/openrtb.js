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
            id: Number(System.generateUniqueId(8, 'NUM')),
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

    BidRequest.prototype.getId = function () {
        return this.__bidRequest.id;
    };

    BidRequest.prototype.addImp = function (banner, ext, bidFloor, bidFloorCur) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'object',
            properties: {
                banner: {
                    type: 'object',
                    properties: {
                        h: {
                            type: 'integer',
                            gte: Constants.MIN_BANNER_DIMENSION
                        },
                        w: {
                            type: 'integer',
                            gte: Constants.MIN_BANNER_DIMENSION
                        },
                        topframe: {
                            optional: true,
                            type: 'integer',
                            eq: [0, 1]
                        }
                    }
                },
                ext: {
                    type: 'object',
                    properties: {
                        sid: {
                            optional: true,
                            type: 'string',
                            minLength: 1
                        },
                        siteID: {
                            optional: true,
                            type: 'string',
                            minLength: 1
                        }
                    }
                },
                bidFloor: {
                    optional: true,
                    type: 'number',
                    gte: Constants.MIN_BID_FLOOR
                },
                bidFloorCur: {
                    optional: true,
                    type: 'string',
                    minLength: 1
                }
            }
        }, {
            banner: banner,
            ext: ext,
            bidFloor: bidFloor,
            bidFloorCur: bidFloorCur
        });
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        var id = String(++this.__impCount);

        this.__bidRequest.imp.push({
            banner: banner,
            ext: ext,
            id: id,
            bidfloor: bidFloor,
            bidfloorcur: bidFloorCur
        });

        return id;
    };

    BidRequest.prototype.addUserEid = function (data) {
        //? if (DEBUG) {
        var result = Inspector.validate({
            type: 'object',
            strict: true,
            properties: {
                source: {
                    type: 'string',
                    minlength: 1
                },
                uids: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                minLength: 1
                            }
                        }
                    }
                }
            }
        }, data);
        if (!result.valid) {
            throw Whoopsie('INVALID_ARGUMENT', result.format());
        }
        //? }

        this.__bidRequest.user = this.__bidRequest.user || {};
        this.__bidRequest.user.eids = this.__bidRequest.user.eids || [];
        this.__bidRequest.user.eids.push(data);
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

        try {
            this.__bidResponse = bidResponse;
        } catch (ex) {
            throw Whoopsie('INTERNAL_ERROR', 'cannot parse `bidResponse`');
        }
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

    BidResponse.prototype.getExt = function () {
        return this.__bidResponse.ext;
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
        __type__: 'OpenRtb',
        //? }

        BidRequest: BidRequest,
        BidResponse: BidResponse
    };
}

module.exports = OpenRtb();
