/* global phantom */
var defaultsDeep = require('lodash/defaultsDeep');
var system = require('system');
var page = require('webpage').create();
var urlUtil = require('url');

var url = system.args[1];
var options = JSON.parse(system.args[2]);

page.settings.loadImages = false;
page.settings.localToRemoteUrlAccessEnabled = true;
page.settings.resourceTimeout = 15000;

function returnResult(html) {
    console.log(html.trim());
    phantom.exit();
}

page.onInitialized = function() {
    page.injectJs('../node_modules/core-js/client/core.js');

    // CAPTURE WHEN AN EVENT FIRES ON THE DOCUMENT
    if (options.captureAfterDocumentEvent) {
        page.onCallback = returnResult;
        page.evaluate(function(eventName) {
            document.addEventListener(eventName, function() {
                var doctype = new window.XMLSerializer().serializeToString(document.doctype);
                var outerHTML = document.documentElement.outerHTML;
                window.callPhantom(doctype + outerHTML);
            });
        }, options.captureAfterDocumentEvent);
    }
};

page.onResourceRequested = function(requestData, request) {
    if (/\.css$/i.test(requestData.url)) {
        return request.abort();
    }
    if (requestData.url.indexOf(options.cdnPrefix) === 0) {
        var urlInfo = urlUtil.parse(page.url);
        var newUrl = requestData.url.replace(options.cdnPrefix, urlInfo.protocol + '//' + urlInfo.host);
        request.setHeader('Host', urlInfo.host);
        request.changeUrl(newUrl);
    }
};

page.onError = function(message, trace) {
    if (options.ignoreJSErrors) return;
    var pathname = url.replace(/http:\/\/localhost:\d+/, '');
    console.error('WARNING: JavaScript error while prerendering: ' + pathname + '\n' + message);
    phantom.exit(1);
};

// PREVENT <iframe> LOADS & UNWANTED NAVIGATION AWAY FROM PAGE
if (options.navigationLocked) {
    page.onLoadStarted = function() {
        page.navigationLocked = true;
    };
}

if (options.phantomPageSettings) {
    page.settings = defaultsDeep(options.phantomPageSettings, page.settings);
}

page.open(url, function(status) {
    if (status !== 'success') {
        throw new Error('FAIL to load: ' + url);
    } else {
        // CAPTURE ONCE A SPECIFC ELEMENT EXISTS
        if (options.captureAfterElementExists) {
            setInterval(function() {
                var html = page.evaluate(function(elementSelector) {
                    if (document.querySelector(elementSelector)) {
                        var doctype = new window.XMLSerializer().serializeToString(
                            document.doctype
                        );
                        var outerHTML = document.documentElement.outerHTML;
                        return doctype + outerHTML;
                    }
                }, options.captureAfterElementExists);
                if (html) returnResult(html);
            }, 100);
        }

        // CAPTURE AFTER A NUMBER OF MILLISECONDS
        if (options.captureAfterTime) {
            setTimeout(function() {
                var html = page.evaluate(function() {
                    var doctype = new window.XMLSerializer().serializeToString(document.doctype);
                    var outerHTML = document.documentElement.outerHTML;
                    return doctype + outerHTML;
                });
                returnResult(html);
            }, options.captureAfterTime);
        }

        // IF NO SPECIFIC CAPTURE HOOK IS SET, CAPTURE
        // IMMEDIATELY AFTER SCRIPTS EXECUTE
        if (
            !options.captureAfterDocumentEvent &&
            !options.captureAfterElementExists &&
            !options.captureAfterTime
        ) {
            var html = page.evaluate(function() {
                var doctype = new window.XMLSerializer().serializeToString(document.doctype);
                var outerHTML = document.documentElement.outerHTML;
                return doctype + outerHTML;
            });
            returnResult(html);
        }
    }

});
