// Device.js
// (c) 2014 Matthew Hudson
// Device.js is freely distributable under the MIT license.
// For all details and documentation:
// http://matthewhudson.me/projects/device.js/

'use strict';

var device,
    find,
    userAgent;

device = {};

// The client user agent string.
// Lowercase, so we can use the more efficient indexOf(), instead of Regex
userAgent = window.navigator.userAgent.toLowerCase();

// Main functions
// --------------

device.ios = function () {
    return device.iphone() || device.ipod() || device.ipad();
};

device.iphone = function () {
    return !device.windows() && find('iphone');
};

device.ipod = function () {
    return find('ipod');
};

device.ipad = function () {
    return find('ipad');
};

device.android = function () {
    return !device.windows() && find('android');
};

device.androidPhone = function () {
    return device.android() && find('mobile');
};

device.androidTablet = function () {
    return device.android() && !find('mobile');
};

device.blackberry = function () {
    return find('blackberry') || find('bb10') || find('rim');
};

device.blackberryPhone = function () {
    return device.blackberry() && !find('tablet');
};

device.blackberryTablet = function () {
    return device.blackberry() && find('tablet');
};

device.windows = function () {
    return find('windows');
};

device.windowsPhone = function () {
    return device.windows() && find('phone');
};

device.windowsTablet = function () {
    return device.windows() && (find('touch') && !device.windowsPhone());
};

device.fxos = function () {
    return (find('(mobile;') || find('(tablet;')) && find('; rv:');
};

device.fxosPhone = function () {
    return device.fxos() && find('mobile');
};

device.fxosTablet = function () {
    return device.fxos() && find('tablet');
};

device.meego = function () {
    return find('meego');
};

device.mobile = function () {
    return device.androidPhone() || device.iphone() || device.ipod() || device.windowsPhone() || device.blackberryPhone() || device.fxosPhone() || device.meego();
};

device.tablet = function () {
    return device.ipad() || device.androidTablet() || device.blackberryTablet() || device.windowsTablet() || device.fxosTablet();
};

device.desktop = function () {
    return !device.tablet() && !device.mobile();
};

// Private Utility Functions
// -------------------------

// Simple UA string search
find = function (needle) {
    return userAgent.indexOf(needle) !== -1;
};

module.exports = device;
