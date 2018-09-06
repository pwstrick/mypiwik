/*!
 * Piwik - free/libre analytics platform
 *
 * JavaScript tracking client
 *
 * @link https://piwik.org
 * @source https://github.com/piwik/piwik/blob/master/js/piwik.js
 * @license https://piwik.org/free-software/bsd/ BSD-3 Clause (also in js/LICENSE.txt)
 * @license magnet:?xt=urn:btih:c80d50af7d3db9be66a4d0a86db0286e4fd33292&dn=bsd-3-clause.txt BSD-3-Clause
 */
// NOTE: if you change this above Piwik comment block, you must also change `$byteStart` in js/tracker.php

// Refer to README.md for build instructions when minifying this file for distribution.

/*
 * Browser [In]Compatibility
 * - minimum required ECMAScript: ECMA-262, edition 3
 *
 * Incompatible with these (and earlier) versions of:
 * - IE4 - try..catch and for..in introduced in IE5
 * - IE5 - named anonymous functions, array.push, encodeURIComponent, decodeURIComponent, and getElementsByTagName introduced in IE5.5
 * - Firefox 1.0 and Netscape 8.x - FF1.5 adds array.indexOf, among other things
 * - Mozilla 1.7 and Netscape 6.x-7.x
 * - Netscape 4.8
 * - Opera 6 - Error object (and Presto) introduced in Opera 7
 * - Opera 7
 */


/* startjslint */
/*jslint browser:true, plusplus:true, vars:true, nomen:true, evil:true, regexp: false, bitwise: true, white: true */
/*global JSON_PIWIK */
/*global window */
/*global unescape */
/*global ActiveXObject */
/*global Blob */
/*members Piwik, encodeURIComponent, decodeURIComponent, getElementsByTagName,
    shift, unshift, piwikAsyncInit, piwikPluginAsyncInit, frameElement, self, hasFocus,
    createElement, appendChild, characterSet, charset, all,
    addEventListener, attachEvent, removeEventListener, detachEvent, disableCookies,
    cookie, domain, readyState, documentElement, doScroll, title, text,
    location, top, onerror, document, referrer, parent, links, href, protocol, name, GearsFactory,
    performance, mozPerformance, msPerformance, webkitPerformance, timing, requestStart,
    responseEnd, event, which, button, srcElement, type, target,
    parentNode, tagName, hostname, className,
    userAgent, cookieEnabled, sendBeacon, platform, mimeTypes, enabledPlugin, javaEnabled,
    XMLHttpRequest, ActiveXObject, open, setRequestHeader, onreadystatechange, send, readyState, status,
    getTime, getTimeAlias, setTime, toGMTString, getHours, getMinutes, getSeconds,
    toLowerCase, toUpperCase, charAt, indexOf, lastIndexOf, split, slice,
    onload, src,
    min, round, random, floor,
    exec,
    res, width, height,
    pdf, qt, realp, wma, dir, fla, java, gears, ag,
    initialized, hook, getHook, resetUserId, getVisitorId, getVisitorInfo, setUserId, getUserId, setSiteId, getSiteId, setTrackerUrl, getTrackerUrl, appendToTrackingUrl, getRequest, addPlugin,
    getAttributionInfo, getAttributionCampaignName, getAttributionCampaignKeyword,
    getAttributionReferrerTimestamp, getAttributionReferrerUrl,
    setCustomData, getCustomData,
    setCustomRequestProcessing,
    setCustomVariable, getCustomVariable, deleteCustomVariable, storeCustomVariablesInCookie, setCustomDimension, getCustomDimension,
    deleteCustomVariables, deleteCustomDimension, setDownloadExtensions, addDownloadExtensions, removeDownloadExtensions,
    setDomains, setIgnoreClasses, setRequestMethod, setRequestContentType,
    setReferrerUrl, setCustomUrl, setAPIUrl, setDocumentTitle, getPiwikUrl, getCurrentUrl,
    setDownloadClasses, setLinkClasses,
    setCampaignNameKey, setCampaignKeywordKey,
    getConsentRequestsQueue, requireConsent, getRememberedConsent, hasRememberedConsent, setConsentGiven,
    rememberConsentGiven, forgetConsentGiven, unload, hasConsent,
    discardHashTag,
    setCookieNamePrefix, setCookieDomain, setCookiePath, setSecureCookie, setVisitorIdCookie, getCookieDomain, hasCookies, setSessionCookie,
    setVisitorCookieTimeout, setSessionCookieTimeout, setReferralCookieTimeout, getCookie, getCookiePath, getSessionCookieTimeout,
    setConversionAttributionFirstReferrer, tracker, request,
    disablePerformanceTracking, setGenerationTimeMs,
    doNotTrack, setDoNotTrack, msDoNotTrack, getValuesFromVisitorIdCookie,
    enableCrossDomainLinking, disableCrossDomainLinking, isCrossDomainLinkingEnabled, setCrossDomainLinkingTimeout, getCrossDomainLinkingUrlParameter,
    addListener, enableLinkTracking, enableJSErrorTracking, setLinkTrackingTimer, getLinkTrackingTimer,
    enableHeartBeatTimer, disableHeartBeatTimer, killFrame, redirectFile, setCountPreRendered,
    trackGoal, trackLink, trackPageView, getNumTrackedPageViews, trackRequest, trackSiteSearch, trackEvent,
    setEcommerceView, addEcommerceItem, removeEcommerceItem, clearEcommerceCart, trackEcommerceOrder, trackEcommerceCartUpdate,
    deleteCookie, deleteCookies, offsetTop, offsetLeft, offsetHeight, offsetWidth, nodeType, defaultView,
    innerHTML, scrollLeft, scrollTop, currentStyle, getComputedStyle, querySelectorAll, splice,
    getAttribute, hasAttribute, attributes, nodeName, findContentNodes, findContentNodes, findContentNodesWithinNode,
    findPieceNode, findTargetNodeNoDefault, findTargetNode, findContentPiece, children, hasNodeCssClass,
    getAttributeValueFromNode, hasNodeAttributeWithValue, hasNodeAttribute, findNodesByTagName, findMultiple,
    makeNodesUnique, concat, find, htmlCollectionToArray, offsetParent, value, nodeValue, findNodesHavingAttribute,
    findFirstNodeHavingAttribute, findFirstNodeHavingAttributeWithValue, getElementsByClassName,
    findNodesHavingCssClass, findFirstNodeHavingClass, isLinkElement, findParentContentNode, removeDomainIfIsInLink,
    findContentName, findMediaUrlInNode, toAbsoluteUrl, findContentTarget, getLocation, origin, host, isSameDomain,
    search, trim, getBoundingClientRect, bottom, right, left, innerWidth, innerHeight, clientWidth, clientHeight,
    isOrWasNodeInViewport, isNodeVisible, buildInteractionRequestParams, buildImpressionRequestParams,
    shouldIgnoreInteraction, setHrefAttribute, setAttribute, buildContentBlock, collectContent, setLocation,
    CONTENT_ATTR, CONTENT_CLASS, CONTENT_NAME_ATTR, CONTENT_PIECE_ATTR, CONTENT_PIECE_CLASS,
    CONTENT_TARGET_ATTR, CONTENT_TARGET_CLASS, CONTENT_IGNOREINTERACTION_ATTR, CONTENT_IGNOREINTERACTION_CLASS,
    trackCallbackOnLoad, trackCallbackOnReady, buildContentImpressionsRequests, wasContentImpressionAlreadyTracked,
    getQuery, getContent, setVisitorId, getContentImpressionsRequestsFromNodes, buildContentInteractionTrackingRedirectUrl,
    buildContentInteractionRequestNode, buildContentInteractionRequest, buildContentImpressionRequest,
    appendContentInteractionToRequestIfPossible, setupInteractionsTracking, trackContentImpressionClickInteraction,
    internalIsNodeVisible, clearTrackedContentImpressions, getTrackerUrl, trackAllContentImpressions,
    getTrackedContentImpressions, getCurrentlyVisibleContentImpressionsRequestsIfNotTrackedYet,
    contentInteractionTrackingSetupDone, contains, match, pathname, piece, trackContentInteractionNode,
    trackContentInteractionNode, trackContentImpressionsWithinNode, trackContentImpression,
    enableTrackOnlyVisibleContent, trackContentInteraction, clearEnableTrackOnlyVisibleContent, logAllContentBlocksOnPage,
    trackVisibleContentImpressions, isTrackOnlyVisibleContentEnabled, port, isUrlToCurrentDomain, piwikTrackers,
    isNodeAuthorizedToTriggerInteraction, replaceHrefIfInternalLink, getConfigDownloadExtensions, disableLinkTracking,
    substr, setAnyAttribute, wasContentTargetAttrReplaced, max, abs, childNodes, compareDocumentPosition, body,
    getConfigVisitorCookieTimeout, getRemainingVisitorCookieTimeout, getDomains, getConfigCookiePath,
    getConfigIdPageView, newVisitor, uuid, createTs, visitCount, currentVisitTs, lastVisitTs, lastEcommerceOrderTs,
     "", "\b", "\t", "\n", "\f", "\r", "\"", "\\", apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join, lastIndex, length, parse, prototype, push, replace,
    sort, slice, stringify, test, toJSON, toString, valueOf, objectToJSON, addTracker, removeAllAsyncTrackersButFirst,
    optUserOut, forgetUserOptOut, isUserOptedOut
 */
/*global _paq:true */
/*members push */
/*global Piwik:true */
/*members addPlugin, getTracker, getAsyncTracker, getAsyncTrackers, addTracker, trigger, on, off, retryMissedPluginCalls,
          DOM, onLoad, onReady, isNodeVisible, isOrWasNodeVisible, JSON */
/*global Piwik_Overlay_Client */
/*global AnalyticsTracker:true */
/*members initialize */
/*global define */
/*global console */
/*members amd */
/*members error */
/*members log */

// asynchronous tracker (or proxy)
if (typeof _paq !== 'object') {
    _paq = [];
}

// Piwik singleton and namespace
if (typeof window.Piwik !== 'object') {
    window.Piwik = (function () {
        'use strict';
		
		/*将private.js、query.js、content-overlay.js、tracker.js移出，便于分析*/

        function TrackerProxy() {
            return {
                push: apply
            };
        }

        /**
         * Applies the given methods in the given order if they are present in paq.
         *
         * @param {Array} paq
         * @param {Array} methodsToApply an array containing method names in the order that they should be applied
         *                 eg ['setSiteId', 'setTrackerUrl']
         * @returns {Array} the modified paq array with the methods that were already applied set to undefined
         */
        function applyMethodsInOrder(paq, methodsToApply)
        {
            var appliedMethods = {};
            var index, iterator;

            for (index = 0; index < methodsToApply.length; index++) {
                var methodNameToApply = methodsToApply[index];
                appliedMethods[methodNameToApply] = 1;

                for (iterator = 0; iterator < paq.length; iterator++) {
                    if (paq[iterator] && paq[iterator][0]) {
                        var methodName = paq[iterator][0];

                        if (methodNameToApply === methodName) {
                            apply(paq[iterator]);
                            delete paq[iterator];

                            if (appliedMethods[methodName] > 1
                                && methodName !== "addTracker") {
                                logConsoleError('The method ' + methodName + ' is registered more than once in "_paq" variable. Only the last call has an effect. Please have a look at the multiple Piwik trackers documentation: https://developer.piwik.org/guides/tracking-javascript-guide#multiple-piwik-trackers');
                            }

                            appliedMethods[methodName]++;
                        }
                    }
                }
            }

            return paq;
        }

        /************************************************************
         * Constructor
         ************************************************************/

        var applyFirst = ['addTracker', 'disableCookies', 'setTrackerUrl', 'setAPIUrl', 'enableCrossDomainLinking', 'setCrossDomainLinkingTimeout', 'setSecureCookie', 'setCookiePath', 'setCookieDomain', 'setDomains', 'setUserId', 'setSiteId', 'enableLinkTracking', 'requireConsent', 'setConsentGiven'];

		//创建第一个跟踪器
        function createFirstTracker(piwikUrl, siteId)
        {
            var tracker = new Tracker(piwikUrl, siteId);
            asyncTrackers.push(tracker);

            _paq = applyMethodsInOrder(_paq, applyFirst);

            // apply the queue of actions
            for (iterator = 0; iterator < _paq.length; iterator++) {
                if (_paq[iterator]) {
                    apply(_paq[iterator]);
                }
            }

            // 用代理对象替换初始化数组
            _paq = new TrackerProxy();

            return tracker;
        }

        /************************************************************
         * Proxy object
         * - this allows the caller to continue push()'ing to _paq
         *   after the Tracker has been initialized and loaded
         ************************************************************/

        // initialize the Piwik singleton
        addEventListener(windowAlias, 'beforeunload', beforeUnloadHandler, false);

        Date.prototype.getTimeAlias = Date.prototype.getTime;

        /************************************************************
         * Public data and methods
         ************************************************************/

        Piwik = {
            initialized: false,

            JSON: JSON_PIWIK,

            /**
             * DOM Document related methods
             */
            DOM: {
                /**
                 * Adds an event listener to the given element.
                 * @param element
                 * @param eventType
                 * @param eventHandler
                 * @param useCapture  Optional
                 */
                addEventListener: function (element, eventType, eventHandler, useCapture) {
                    var captureType = typeof useCapture;
                    if (captureType === 'undefined') {
                        useCapture = false;
                    }

                    addEventListener(element, eventType, eventHandler, useCapture);
                },
                /**
                 * Specify a function to execute when the DOM is fully loaded.
                 *
                 * If the DOM is already loaded, the function will be executed immediately.
                 *
                 * @param function callback
                 */
                onLoad: trackCallbackOnLoad,

                /**
                 * Specify a function to execute when the DOM is ready.
                 *
                 * If the DOM is already ready, the function will be executed immediately.
                 *
                 * @param function callback
                 */
                onReady: trackCallbackOnReady,

                /**
                 * Detect whether a node is visible right now.
                 */
                isNodeVisible: isVisible,

                /**
                 * Detect whether a node has been visible at some point
                 */
                isOrWasNodeVisible: content.isNodeVisible
            },

            /**
             * Listen to an event and invoke the handler when a the event is triggered.
             *
             * @param string event
             * @param function handler
             */
            on: function (event, handler) {
                if (!eventHandlers[event]) {
                    eventHandlers[event] = [];
                }

                eventHandlers[event].push(handler);
            },

            /**
             * Remove a handler to no longer listen to the event. Must pass the same handler that was used when
             * attaching the event via ".on".
             * @param string event
             * @param function handler
             */
            off: function (event, handler) {
                if (!eventHandlers[event]) {
                    return;
                }

                var i = 0;
                for (i; i < eventHandlers[event].length; i++) {
                    if (eventHandlers[event][i] === handler) {
                        eventHandlers[event].splice(i, 1);
                    }
                }
            },

            /**
             * Triggers the given event and passes the parameters to all handlers.
             *
             * @param string event
             * @param Array extraParameters
             * @param Object context  If given the handler will be executed in this context
             */
            trigger: function (event, extraParameters, context) {
                if (!eventHandlers[event]) {
                    return;
                }

                var i = 0;
                for (i; i < eventHandlers[event].length; i++) {
                    eventHandlers[event][i].apply(context || windowAlias, extraParameters);
                }
            },

            /**
             * Add plugin
             *
             * @param string pluginName
             * @param Object pluginObj
             */
            addPlugin: function (pluginName, pluginObj) {
                plugins[pluginName] = pluginObj;
            },

            /**
             * Get Tracker (factory method)
             *
             * @param string piwikUrl
             * @param int|string siteId
             * @return Tracker
             */
            getTracker: function (piwikUrl, siteId) {
                if (!isDefined(siteId)) {
                    siteId = this.getAsyncTracker().getSiteId();
                }
                if (!isDefined(piwikUrl)) {
                    piwikUrl = this.getAsyncTracker().getTrackerUrl();
                }

                return new Tracker(piwikUrl, siteId);
            },

            /**
             * Get all created async trackers
             *
             * @return Tracker[]
             */
            getAsyncTrackers: function () {
                return asyncTrackers;
            },

            /**
             * Adds a new tracker. All sent requests will be also sent to the given siteId and piwikUrl.
             * If piwikUrl is not set, current url will be used.
             *
             * @param null|string piwikUrl  If null, will reuse the same tracker URL of the current tracker instance
             * @param int|string siteId
             * @return Tracker
             */
            addTracker: function (piwikUrl, siteId) {
                var tracker;
                if (!asyncTrackers.length) {
                    tracker = createFirstTracker(piwikUrl, siteId);
                } else {
                    tracker = asyncTrackers[0].addTracker(piwikUrl, siteId);
                }
                return tracker;
            },

            /**
             * Get internal asynchronous tracker object.
             *
             * If no parameters are given, it returns the internal asynchronous tracker object. If a piwikUrl and idSite
             * is given, it will try to find an optional
             *
             * @param string piwikUrl
             * @param int|string siteId
             * @return Tracker
             */
            getAsyncTracker: function (piwikUrl, siteId) {

                var firstTracker;
                if (asyncTrackers && asyncTrackers.length && asyncTrackers[0]) {
                    firstTracker = asyncTrackers[0];
                } else {
                    return createFirstTracker(piwikUrl, siteId);
                }

                if (!siteId && !piwikUrl) {
                    // for BC and by default we just return the initially created tracker
                    return firstTracker;
                }

                // we look for another tracker created via `addTracker` method
                if ((!isDefined(siteId) || null === siteId) && firstTracker) {
                    siteId = firstTracker.getSiteId();
                }

                if ((!isDefined(piwikUrl) || null === piwikUrl) && firstTracker) {
                    piwikUrl = firstTracker.getTrackerUrl();
                }

                var tracker, i = 0;
                for (i; i < asyncTrackers.length; i++) {
                    tracker = asyncTrackers[i];
                    if (tracker
                        && String(tracker.getSiteId()) === String(siteId)
                        && tracker.getTrackerUrl() === piwikUrl) {

                        return tracker;
                    }
                }
            },

            /**
             * When calling plugin methods via "_paq.push(['...'])" and the plugin is loaded separately because
             * piwik.js is not writable then there is a chance that first piwik.js is loaded and later the plugin.
             * In this case we would have already executed all "_paq.push" methods and they would not have succeeded
             * because the plugin will be loaded only later. In this case, once a plugin is loaded, it should call
             * "Piwik.retryMissedPluginCalls()" so they will be executed after all.
             *
             * @param string piwikUrl
             * @param int|string siteId
             * @return Tracker
             */
            retryMissedPluginCalls: function () {
                var missedCalls = missedPluginTrackerCalls;
                missedPluginTrackerCalls = [];
                var i = 0;
                for (i; i < missedCalls.length; i++) {
                    apply(missedCalls[i]);
                }
            }
        };

        // Expose Piwik as an AMD module
        if (typeof define === 'function' && define.amd) {
            define('piwik', [], function () { return Piwik; });
        }

        return Piwik;
    }());
}

/*!! pluginTrackerHook */

(function () {
    'use strict';

    function hasPaqConfiguration()
    {
        if ('object' !== typeof _paq) {
            return false;
        }
        // needed to write it this way for jslint
        var lengthType = typeof _paq.length;
        if ('undefined' === lengthType) {
            return false;
        }

        return !!_paq.length;
    }

    if (window
        && 'object' === typeof window.piwikPluginAsyncInit
        && window.piwikPluginAsyncInit.length) {
        var i = 0;
        for (i; i < window.piwikPluginAsyncInit.length; i++) {
            if (typeof window.piwikPluginAsyncInit[i] === 'function') {
                window.piwikPluginAsyncInit[i]();
            }
        }
    }

    if (window && window.piwikAsyncInit) {
        window.piwikAsyncInit();
    }

    if (!window.Piwik.getAsyncTrackers().length) {
        // 我们只在piwikAsyncInit()中尚未创建其他异步跟踪器时创建初始跟踪器
        if (hasPaqConfiguration()) {
            // 如果通过_paq有配置，我们只创建一个初始跟踪器。 除此以外
            // Piwik.getAsyncTrackers()将返回未配置的跟踪器
            window.Piwik.addTracker();
        } else {
            _paq = {push: function (args) {
                    // needed to write it this way for jslint
                    var consoleType = typeof console;
                    if (consoleType !== 'undefined' && console && console.error) {
                        console.error('_paq.push() was used but Piwik tracker was not initialized before the piwik.js file was loaded. Make sure to configure the tracker via _paq.push before loading piwik.js. Alternatively, you can create a tracker via Piwik.addTracker() manually and then use _paq.push but it may not fully work as tracker methods may not be executed in the correct order.', args);
                    }
                }};
        }
    }

    window.Piwik.trigger('PiwikInitialized', []);
    window.Piwik.initialized = true;
}());


/*jslint sloppy: true */
(function () {
    var jsTrackerType = (typeof AnalyticsTracker);
    if (jsTrackerType === 'undefined') {
        AnalyticsTracker = window.Piwik;
    }
}());
/*jslint sloppy: false */

/************************************************************
 * Deprecated functionality below
 * Legacy piwik.js compatibility ftw
 ************************************************************/

/*
 * Piwik globals
 *
 *   var piwik_install_tracker, piwik_tracker_pause, piwik_download_extensions, piwik_hosts_alias, piwik_ignore_classes;
 */
/*global piwik_log:true */
/*global piwik_track:true */

/**
 * Track page visit
 *
 * @param string documentTitle
 * @param int|string siteId
 * @param string piwikUrl
 * @param mixed customData
 */
if (typeof piwik_log !== 'function') {
    piwik_log = function (documentTitle, siteId, piwikUrl, customData) {
        'use strict';

        function getOption(optionName) {
            try {
                if (window['piwik_' + optionName]) {
                    return window['piwik_' + optionName];
                }
            } catch (ignore) { }

            return; // undefined
        }

        // instantiate the tracker
        var option,
            piwikTracker = window.Piwik.getTracker(piwikUrl, siteId);

        // initialize tracker
        piwikTracker.setDocumentTitle(documentTitle);
        piwikTracker.setCustomData(customData);

        // handle Piwik globals
        option = getOption('tracker_pause');

        if (option) {
            piwikTracker.setLinkTrackingTimer(option);
        }

        option = getOption('download_extensions');

        if (option) {
            piwikTracker.setDownloadExtensions(option);
        }

        option = getOption('hosts_alias');

        if (option) {
            piwikTracker.setDomains(option);
        }

        option = getOption('ignore_classes');

        if (option) {
            piwikTracker.setIgnoreClasses(option);
        }

        // track this page view
        piwikTracker.trackPageView();

        // default is to install the link tracker
        if (getOption('install_tracker')) {

            /**
             * Track click manually (function is defined below)
             *
             * @param string sourceUrl
             * @param int|string siteId
             * @param string piwikUrl
             * @param string linkType
             */
            piwik_track = function (sourceUrl, siteId, piwikUrl, linkType) {
                piwikTracker.setSiteId(siteId);
                piwikTracker.setTrackerUrl(piwikUrl);
                piwikTracker.trackLink(sourceUrl, linkType);
            };

            // set-up link tracking
            piwikTracker.enableLinkTracking();
        }
    };
}

/*! @license-end */


