/*!
 * jQuery Browser Plugin 0.1.0
 * https://github.com/gabceb/jquery-browser-plugin
 *
 * Original jquery-browser code Copyright 2005, 2015 jQuery Foundation, Inc. and other contributors
 * http://jquery.org/license
 *
 * Modifications Copyright 2015 Gabriel Cebrian
 * https://github.com/gabceb
 *
 * Released under the MIT license
 *
 * Date: 05-07-2015
 */

'use strict';

function uaMatch(ua) {
    ua = ua.toLowerCase();

    var match = /(edge)\/([\w.]+)/.exec(ua) ||
        /(opr)[\/]([\w.]+)/.exec(ua) ||
        /(chrome)[ \/]([\w.]+)/.exec(ua) ||
        /(iemobile)[\/]([\w.]+)/.exec(ua) ||
        /(version)(applewebkit)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.exec(ua) ||
        /(webkit)[ \/]([\w.]+).*(version)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.exec(ua) ||
        /(webkit)[ \/]([\w.]+)/.exec(ua) ||
        /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
        /(msie) ([\w.]+)/.exec(ua) ||
        ua.indexOf('trident') >= 0 && /(rv)(?::| )([\w.]+)/.exec(ua) ||
        ua.indexOf('compatible') < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [];

    var browser = {};

    var matched = {
        browser: match[5] || match[3] || match[1] || '',
        version: match[2] || match[4] || '0',
        versionNumber: match[4] || match[2] || '0'
    };

    if (matched.browser) {
        browser[matched.browser] = true;
        browser.version = matched.version;
        browser.versionNumber = parseInt(matched.versionNumber, 10);
    }

    // IE11 has a new token so we will assign it msie to avoid breaking changes
    if (browser.rv || browser.iemobile) {
        var ie = 'msie';

        matched.browser = ie;
        browser[ie] = true;
    }

    // Edge is officially known as Microsoft Edge, so rewrite the key to match
    if (browser.edge) {
        delete browser.edge;
        var msedge = 'msedge';

        matched.browser = msedge;
        browser[msedge] = true;
    }

    // Opera 15+ are identified as opr
    if (browser.opr) {
        var opera = 'opera';

        matched.browser = opera;
        browser[opera] = true;
    }

    // Stock Android browsers are marked as Safari on Android.
    if (browser.safari && browser.android) {
        var android = 'android';

        matched.browser = android;
        browser[android] = true;
    }

    // Kindle browsers are marked as Safari on Kindle
    if (browser.safari && browser.kindle) {
        var kindle = 'kindle';

        matched.browser = kindle;
        browser[kindle] = true;
    }

    // Kindle Silk browsers are marked as Safari on Kindle
    if (browser.safari && browser.silk) {
        var silk = 'silk';

        matched.browser = silk;
        browser[silk] = true;
    }

    // Assign the name
    browser.name = matched.browser;
    return browser;
}

module.exports = uaMatch(window.navigator.userAgent);
