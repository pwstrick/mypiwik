/************************************************************
 * Private data 私有变量
 ************************************************************/
var expireDateTime,
  /* plugins */
  plugins = {},
  eventHandlers = {},
  /* alias frequently used globals for added minification */
  documentAlias = document,
  navigatorAlias = navigator,
  screenAlias = screen,
  windowAlias = window,
  /* performance timing */
  performanceAlias =
  windowAlias.performance ||
  windowAlias.mozPerformance ||
  windowAlias.msPerformance ||
  windowAlias.webkitPerformance,
  /* encode */
  encodeWrapper = windowAlias.encodeURIComponent,
  /* decode */
  decodeWrapper = windowAlias.decodeURIComponent,
  /* urldecode */
  urldecode = unescape,
  /* asynchronous tracker */
  asyncTrackers = [],
  /* iterator */
  iterator,
  /* local Piwik */
  Piwik,
  missedPluginTrackerCalls = [],
  coreConsentCounter = 0,
  isPageUnloading = false;

/************************************************************
 * Private methods 私有函数
 ************************************************************/

/**
 * See https://github.com/piwik/piwik/issues/8413
 * To prevent Javascript Error: Uncaught URIError: URI malformed when encoding is not UTF-8. Use this method
 * instead of decodeWrapper if a text could contain any non UTF-8 encoded characters eg
 * a URL like http://apache.piwik/test.html?%F6%E4%FC or a link like
 * <a href="test-with-%F6%E4%FC/story/0">(encoded iso-8859-1 URL)</a>
 */
function safeDecodeWrapper(url) {
  try {
    return decodeWrapper(url);
  } catch (e) {
    return unescape(url);
  }
}

/*
 * Is property defined?
 */
function isDefined(property) {
  // workaround https://github.com/douglascrockford/JSLint/commit/24f63ada2f9d7ad65afc90e6d949f631935c2480
  var propertyType = typeof property;

  return propertyType !== "undefined";
}

/*
 * Is property a function?
 */
function isFunction(property) {
  return typeof property === "function";
}

/*
 * Is property an object?
 *
 * @return bool Returns true if property is null, an Object, or subclass of Object (i.e., an instanceof String, Date, etc.)
 */
function isObject(property) {
  return typeof property === "object";
}

/*
 * Is property a string?
 */
function isString(property) {
  return typeof property === "string" || property instanceof String;
}

function isObjectEmpty(property) {
  if (!property) {
    return true;
  }

  var i;
  var isEmpty = true;
  for (i in property) {
    if (Object.prototype.hasOwnProperty.call(property, i)) {
      isEmpty = false;
    }
  }

  return isEmpty;
}

/**
 * Logs an error in the console.
 *  Note: it does not generate a JavaScript error, so make sure to also generate an error if needed.
 * @param message
 */
function logConsoleError(message) {
  // needed to write it this way for jslint
  var consoleType = typeof console;
  if (consoleType !== "undefined" && console && console.error) {
    console.error(message);
  }
}

/*
 * apply wrapper
 *
 * @param array parameterArray An array comprising either:
 *      [ 'methodName', optional_parameters ]
 * or:
 *      [ functionObject, optional_parameters ]
 */
function apply() {
  var i, j, f, parameterArray, trackerCall;

  for (i = 0; i < arguments.length; i += 1) {
    trackerCall = null;
    if (arguments[i] && arguments[i].slice) {
      trackerCall = arguments[i].slice();
    }
    parameterArray = arguments[i];
    f = parameterArray.shift();

    var fParts, context;

    var isStaticPluginCall = isString(f) && f.indexOf("::") > 0;
    if (isStaticPluginCall) {
      // a static method will not be called on a tracker and is not dependent on the existence of a
      // tracker etc
      fParts = f.split("::");
      context = fParts[0];
      f = fParts[1];

      if (
        "object" === typeof Piwik[context] &&
        "function" === typeof Piwik[context][f]
      ) {
        Piwik[context][f].apply(Piwik[context], parameterArray);
      } else if (trackerCall) {
        // we try to call that method again later as the plugin might not be loaded yet
        // a plugin can call "Piwik.retryMissedPluginCalls();" once it has been loaded and then the
        // method call to "Piwik[context][f]" may be executed
        missedPluginTrackerCalls.push(trackerCall);
      }
    } else {
      for (j = 0; j < asyncTrackers.length; j++) {
        if (isString(f)) {
          context = asyncTrackers[j];

          var isPluginTrackerCall = f.indexOf(".") > 0;

          if (isPluginTrackerCall) {
            fParts = f.split(".");
            if (context && "object" === typeof context[fParts[0]]) {
              context = context[fParts[0]];
              f = fParts[1];
            } else if (trackerCall) {
              // we try to call that method again later as the plugin might not be loaded yet
              missedPluginTrackerCalls.push(trackerCall);
              break;
            }
          }

          if (context[f]) {
            context[f].apply(context, parameterArray);
          } else {
            var message =
              "The method '" +
              f +
              '\' was not found in "_paq" variable.  Please have a look at the Piwik tracker documentation: https://developer.piwik.org/api-reference/tracking-javascript';
            logConsoleError(message);

            if (!isPluginTrackerCall) {
              // do not trigger an error if it is a call to a plugin as the plugin may just not be
              // loaded yet etc
              throw new TypeError(message);
            }
          }

          if (f === "addTracker") {
            // addTracker adds an entry to asyncTrackers and would otherwise result in an endless loop
            break;
          }

          if (f === "setTrackerUrl" || f === "setSiteId") {
            // these two methods should be only executed on the first tracker
            break;
          }
        } else {
          f.apply(asyncTrackers[j], parameterArray);
        }
      }
    }
  }
}

/*
 * Cross-browser helper function to add event handler
 */
function addEventListener(element, eventType, eventHandler, useCapture) {
  if (element.addEventListener) {
    element.addEventListener(eventType, eventHandler, useCapture);

    return true;
  }

  if (element.attachEvent) {
    return element.attachEvent("on" + eventType, eventHandler);
  }

  element["on" + eventType] = eventHandler;
}

function trackCallbackOnLoad(callback) {
  if (documentAlias.readyState === "complete") {
    callback();
  } else if (windowAlias.addEventListener) {
    windowAlias.addEventListener("load", callback, false);
  } else if (windowAlias.attachEvent) {
    windowAlias.attachEvent("onload", callback);
  }
}

function trackCallbackOnReady(callback) {
  var loaded = false;

  if (documentAlias.attachEvent) {
    loaded = documentAlias.readyState === "complete";
  } else {
    loaded = documentAlias.readyState !== "loading";
  }

  if (loaded) {
    callback();
    return;
  }

  var _timer;

  if (documentAlias.addEventListener) {
    addEventListener(documentAlias, "DOMContentLoaded", function ready() {
      documentAlias.removeEventListener("DOMContentLoaded", ready, false);
      if (!loaded) {
        loaded = true;
        callback();
      }
    });
  } else if (documentAlias.attachEvent) {
    documentAlias.attachEvent("onreadystatechange", function ready() {
      if (documentAlias.readyState === "complete") {
        documentAlias.detachEvent("onreadystatechange", ready);
        if (!loaded) {
          loaded = true;
          callback();
        }
      }
    });

    if (
      documentAlias.documentElement.doScroll &&
      windowAlias === windowAlias.top
    ) {
      (function ready() {
        if (!loaded) {
          try {
            documentAlias.documentElement.doScroll("left");
          } catch (error) {
            setTimeout(ready, 0);

            return;
          }
          loaded = true;
          callback();
        }
      })();
    }
  }

  // fallback
  addEventListener(
    windowAlias,
    "load",
    function () {
      if (!loaded) {
        loaded = true;
        callback();
      }
    },
    false
  );
}

/*
 * Call plugin hook methods
 */
function executePluginMethod(methodName, params, callback) {
  if (!methodName) {
    return "";
  }

  var result = "",
    i,
    pluginMethod,
    value,
    isFunction;

  for (i in plugins) {
    if (Object.prototype.hasOwnProperty.call(plugins, i)) {
      isFunction = plugins[i] && "function" === typeof plugins[i][methodName];

      if (isFunction) {
        pluginMethod = plugins[i][methodName];
        value = pluginMethod(params || {}, callback);

        if (value) {
          result += value;
        }
      }
    }
  }

  return result;
}

/*
 * Handle beforeunload event
 *
 * Subject to Safari's "Runaway JavaScript Timer" and
 * Chrome V8 extension that terminates JS that exhibits
 * "slow unload", i.e., calling getTime() > 1000 times
 */
function beforeUnloadHandler() {
  var now;
  isPageUnloading = true;

  executePluginMethod("unload");
  /*
   * Delay/pause (blocks UI)
   */
  if (expireDateTime) {
    // the things we do for backwards compatibility...
    // in ECMA-262 5th ed., we could simply use:
    //     while (Date.now() < expireDateTime) { }
    do {
      now = new Date();
    } while (now.getTimeAlias() < expireDateTime);
  }
}

/*
 * Load JavaScript file (asynchronously)
 */
function loadScript(src, onLoad) {
  var script = documentAlias.createElement("script");

  script.type = "text/javascript";
  script.src = src;

  if (script.readyState) {
    script.onreadystatechange = function () {
      var state = this.readyState;

      if (state === "loaded" || state === "complete") {
        script.onreadystatechange = null;
        onLoad();
      }
    };
  } else {
    script.onload = onLoad;
  }

  documentAlias.getElementsByTagName("head")[0].appendChild(script);
}

/*
 * Get page referrer
 */
function getReferrer() {
  var referrer = "";

  try {
    referrer = windowAlias.top.document.referrer;
  } catch (e) {
    if (windowAlias.parent) {
      try {
        referrer = windowAlias.parent.document.referrer;
      } catch (e2) {
        referrer = "";
      }
    }
  }

  if (referrer === "") {
    referrer = documentAlias.referrer;
  }

  return referrer;
}

/*
 * Extract scheme/protocol from URL
 */
function getProtocolScheme(url) {
  var e = new RegExp("^([a-z]+):"),
    matches = e.exec(url);

  return matches ? matches[1] : null;
}

/*
 * Extract hostname from URL
 */
function getHostName(url) {
  // scheme : // [username [: password] @] hostame [: port] [/ [path] [? query] [# fragment]]
  var e = new RegExp("^(?:(?:https?|ftp):)/*(?:[^@]+@)?([^:/#]+)"),
    matches = e.exec(url);

  return matches ? matches[1] : url;
}

function stringStartsWith(str, prefix) {
  str = String(str);
  return str.lastIndexOf(prefix, 0) === 0;
}

function stringEndsWith(str, suffix) {
  str = String(str);
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function stringContains(str, needle) {
  str = String(str);
  return str.indexOf(needle) !== -1;
}

function removeCharactersFromEndOfString(str, numCharactersToRemove) {
  str = String(str);
  return str.substr(0, str.length - numCharactersToRemove);
}

/**
 * We do not check whether URL contains already url parameter, please use removeUrlParameter() if needed
 * before calling this method.
 * This method makes sure to append URL parameters before a possible hash. Will escape (encode URI component)
 * the set name and value
 */
function addUrlParameter(url, name, value) {
  url = String(url);

  if (!value) {
    value = "";
  }

  var hashPos = url.indexOf("#");
  var urlLength = url.length;

  if (hashPos === -1) {
    hashPos = urlLength;
  }

  var baseUrl = url.substr(0, hashPos);
  var urlHash = url.substr(hashPos, urlLength - hashPos);

  if (baseUrl.indexOf("?") === -1) {
    baseUrl += "?";
  } else if (!stringEndsWith(baseUrl, "?")) {
    baseUrl += "&";
  }
  // nothing to if ends with ?

  return baseUrl + encodeWrapper(name) + "=" + encodeWrapper(value) + urlHash;
}

function removeUrlParameter(url, name) {
  url = String(url);

  if (
    url.indexOf("?" + name + "=") === -1 &&
    url.indexOf("&" + name + "=") === -1
  ) {
    // nothing to remove, url does not contain this parameter
    return url;
  }

  var searchPos = url.indexOf("?");
  if (searchPos === -1) {
    // nothing to remove, no query parameters
    return url;
  }

  var queryString = url.substr(searchPos + 1);
  var baseUrl = url.substr(0, searchPos);

  if (queryString) {
    var urlHash = "";
    var hashPos = queryString.indexOf("#");
    if (hashPos !== -1) {
      urlHash = queryString.substr(hashPos + 1);
      queryString = queryString.substr(0, hashPos);
    }

    var param;
    var paramsArr = queryString.split("&");
    var i = paramsArr.length - 1;

    for (i; i >= 0; i--) {
      param = paramsArr[i].split("=")[0];
      if (param === name) {
        paramsArr.splice(i, 1);
      }
    }

    var newQueryString = paramsArr.join("&");

    if (newQueryString) {
      baseUrl = baseUrl + "?" + newQueryString;
    }

    if (urlHash) {
      baseUrl += "#" + urlHash;
    }
  }

  return baseUrl;
}

/*
 * Extract parameter from URL
 */
function getUrlParameter(url, name) {
  var regexSearch = "[\\?&#]" + name + "=([^&#]*)";
  var regex = new RegExp(regexSearch);
  var results = regex.exec(url);
  return results ? decodeWrapper(results[1]) : "";
}

function trim(text) {
  if (text && String(text) === text) {
    return text.replace(/^\s+|\s+$/g, "");
  }

  return text;
}

/*
 * UTF-8 encoding
 */
function utf8_encode(argString) {
  return unescape(encodeWrapper(argString));
}

/************************************************************
 * sha1
 * - based on sha1 from http://phpjs.org/functions/sha1:512 (MIT / GPL v2)
 ************************************************************/

function sha1(str) {
  // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
  // + namespaced by: Michael White (http://getsprink.com)
  // +      input by: Brett Zamir (http://brett-zamir.me)
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   jslinted by: Anthon Pang (http://piwik.org)

  var rotate_left = function (n, s) {
      return (n << s) | (n >>> (32 - s));
    },
    cvt_hex = function (val) {
      var strout = "",
        i,
        v;

      for (i = 7; i >= 0; i--) {
        v = (val >>> (i * 4)) & 0x0f;
        strout += v.toString(16);
      }

      return strout;
    },
    blockstart,
    i,
    j,
    W = [],
    H0 = 0x67452301,
    H1 = 0xefcdab89,
    H2 = 0x98badcfe,
    H3 = 0x10325476,
    H4 = 0xc3d2e1f0,
    A,
    B,
    C,
    D,
    E,
    temp,
    str_len,
    word_array = [];

  str = utf8_encode(str);
  str_len = str.length;

  for (i = 0; i < str_len - 3; i += 4) {
    j =
      (str.charCodeAt(i) << 24) |
      (str.charCodeAt(i + 1) << 16) |
      (str.charCodeAt(i + 2) << 8) |
      str.charCodeAt(i + 3);
    word_array.push(j);
  }

  switch (str_len & 3) {
  case 0:
    i = 0x080000000;
    break;
  case 1:
    i = (str.charCodeAt(str_len - 1) << 24) | 0x0800000;
    break;
  case 2:
    i =
      (str.charCodeAt(str_len - 2) << 24) |
      (str.charCodeAt(str_len - 1) << 16) |
      0x08000;
    break;
  case 3:
    i =
      (str.charCodeAt(str_len - 3) << 24) |
      (str.charCodeAt(str_len - 2) << 16) |
      (str.charCodeAt(str_len - 1) << 8) |
      0x80;
    break;
  }

  word_array.push(i);

  while ((word_array.length & 15) !== 14) {
    word_array.push(0);
  }

  word_array.push(str_len >>> 29);
  word_array.push((str_len << 3) & 0x0ffffffff);

  for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
    for (i = 0; i < 16; i++) {
      W[i] = word_array[blockstart + i];
    }

    for (i = 16; i <= 79; i++) {
      W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
    }

    A = H0;
    B = H1;
    C = H2;
    D = H3;
    E = H4;

    for (i = 0; i <= 19; i++) {
      temp =
        (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5a827999) &
        0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 20; i <= 39; i++) {
      temp =
        (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ed9eba1) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 40; i <= 59; i++) {
      temp =
        (rotate_left(A, 5) +
          ((B & C) | (B & D) | (C & D)) +
          E +
          W[i] +
          0x8f1bbcdc) &
        0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    for (i = 60; i <= 79; i++) {
      temp =
        (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xca62c1d6) & 0x0ffffffff;
      E = D;
      D = C;
      C = rotate_left(B, 30);
      B = A;
      A = temp;
    }

    H0 = (H0 + A) & 0x0ffffffff;
    H1 = (H1 + B) & 0x0ffffffff;
    H2 = (H2 + C) & 0x0ffffffff;
    H3 = (H3 + D) & 0x0ffffffff;
    H4 = (H4 + E) & 0x0ffffffff;
  }

  temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

  return temp.toLowerCase();
}

/************************************************************
 * end sha1
 ************************************************************/

/*
 * Fix-up URL when page rendered from search engine cache or translated page
 */
function urlFixup(hostName, href, referrer) {
  if (!hostName) {
    hostName = "";
  }

  if (!href) {
    href = "";
  }

  if (hostName === "translate.googleusercontent.com") {
    // Google
    if (referrer === "") {
      referrer = href;
    }

    href = getUrlParameter(href, "u");
    hostName = getHostName(href);
  } else if (
    hostName === "cc.bingj.com" || // Bing
    hostName === "webcache.googleusercontent.com" || // Google
    hostName.slice(0, 5) === "74.6."
  ) {
    // Yahoo (via Inktomi 74.6.0.0/16)
    href = documentAlias.links[0].href;
    hostName = getHostName(href);
  }

  return [hostName, href, referrer];
}

/*
 * Fix-up domain
 */
function domainFixup(domain) {
  var dl = domain.length;

  // remove trailing '.'
  if (domain.charAt(--dl) === ".") {
    domain = domain.slice(0, dl);
  }

  // remove leading '*'
  if (domain.slice(0, 2) === "*.") {
    domain = domain.slice(1);
  }

  if (domain.indexOf("/") !== -1) {
    domain = domain.substr(0, domain.indexOf("/"));
  }

  return domain;
}

/*
 * Title fixup
 */
function titleFixup(title) {
  title = title && title.text ? title.text : title;

  if (!isString(title)) {
    var tmp = documentAlias.getElementsByTagName("title");

    if (tmp && isDefined(tmp[0])) {
      title = tmp[0].text;
    }
  }

  return title;
}

function getChildrenFromNode(node) {
  if (!node) {
    return [];
  }

  if (!isDefined(node.children) && isDefined(node.childNodes)) {
    return node.children;
  }

  if (isDefined(node.children)) {
    return node.children;
  }

  return [];
}

function containsNodeElement(node, containedNode) {
  if (!node || !containedNode) {
    return false;
  }

  if (node.contains) {
    return node.contains(containedNode);
  }

  if (node === containedNode) {
    return true;
  }

  if (node.compareDocumentPosition) {
    return !!(node.compareDocumentPosition(containedNode) & 16);
  }

  return false;
}

// Polyfill for IndexOf for IE6-IE8
function indexOfArray(theArray, searchElement) {
  if (theArray && theArray.indexOf) {
    return theArray.indexOf(searchElement);
  }

  // 1. Let O be the result of calling ToObject passing
  //    the this value as the argument.
  if (!isDefined(theArray) || theArray === null) {
    return -1;
  }

  if (!theArray.length) {
    return -1;
  }

  var len = theArray.length;

  if (len === 0) {
    return -1;
  }

  var k = 0;

  // 9. Repeat, while k < len
  while (k < len) {
    // a. Let Pk be ToString(k).
    //   This is implicit for LHS operands of the in operator
    // b. Let kPresent be the result of calling the
    //    HasProperty internal method of O with argument Pk.
    //   This step can be combined with c
    // c. If kPresent is true, then
    //    i.  Let elementK be the result of calling the Get
    //        internal method of O with the argument ToString(k).
    //   ii.  Let same be the result of applying the
    //        Strict Equality Comparison Algorithm to
    //        searchElement and elementK.
    //  iii.  If same is true, return k.
    if (theArray[k] === searchElement) {
      return k;
    }
    k++;
  }
  return -1;
}

/************************************************************
 * Element Visiblility
 ************************************************************/

/**
 * Author: Jason Farrell
 * Author URI: http://useallfive.com/
 *
 * Description: Checks if a DOM element is truly visible.
 * Package URL: https://github.com/UseAllFive/true-visibility
 * License: MIT (https://github.com/UseAllFive/true-visibility/blob/master/LICENSE.txt)
 */
function isVisible(node) {
  if (!node) {
    return false;
  }

  //-- Cross browser method to get style properties:
  function _getStyle(el, property) {
    if (windowAlias.getComputedStyle) {
      return documentAlias.defaultView.getComputedStyle(el, null)[property];
    }
    if (el.currentStyle) {
      return el.currentStyle[property];
    }
  }

  function _elementInDocument(element) {
    element = element.parentNode;

    while (element) {
      if (element === documentAlias) {
        return true;
      }
      element = element.parentNode;
    }
    return false;
  }

  /**
   * Checks if a DOM element is visible. Takes into
   * consideration its parents and overflow.
   *
   * @param (el)      the DOM element to check if is visible
   *
   * These params are optional that are sent in recursively,
   * you typically won't use these:
   *
   * @param (t)       Top corner position number
   * @param (r)       Right corner position number
   * @param (b)       Bottom corner position number
   * @param (l)       Left corner position number
   * @param (w)       Element width number
   * @param (h)       Element height number
   */
  function _isVisible(el, t, r, b, l, w, h) {
    var p = el.parentNode,
      VISIBLE_PADDING = 1; // has to be visible at least one px of the element

    if (!_elementInDocument(el)) {
      return false;
    }

    //-- Return true for document node
    if (9 === p.nodeType) {
      return true;
    }

    //-- Return false if our element is invisible
    if (
      "0" === _getStyle(el, "opacity") ||
      "none" === _getStyle(el, "display") ||
      "hidden" === _getStyle(el, "visibility")
    ) {
      return false;
    }

    if (!isDefined(t) ||
      !isDefined(r) ||
      !isDefined(b) ||
      !isDefined(l) ||
      !isDefined(w) ||
      !isDefined(h)
    ) {
      t = el.offsetTop;
      l = el.offsetLeft;
      b = t + el.offsetHeight;
      r = l + el.offsetWidth;
      w = el.offsetWidth;
      h = el.offsetHeight;
    }

    if (
      node === el &&
      (0 === h || 0 === w) &&
      "hidden" === _getStyle(el, "overflow")
    ) {
      return false;
    }

    //-- If we have a parent, let's continue:
    if (p) {
      //-- Check if the parent can hide its children.
      if (
        "hidden" === _getStyle(p, "overflow") ||
        "scroll" === _getStyle(p, "overflow")
      ) {
        //-- Only check if the offset is different for the parent
        if (
          //-- If the target element is to the right of the parent elm
          l + VISIBLE_PADDING > p.offsetWidth + p.scrollLeft ||
          //-- If the target element is to the left of the parent elm
          l + w - VISIBLE_PADDING < p.scrollLeft ||
          //-- If the target element is under the parent elm
          t + VISIBLE_PADDING > p.offsetHeight + p.scrollTop ||
          //-- If the target element is above the parent elm
          t + h - VISIBLE_PADDING < p.scrollTop
        ) {
          //-- Our target element is out of bounds:
          return false;
        }
      }
      //-- Add the offset parent's left/top coords to our element's offset:
      if (el.offsetParent === p) {
        l += p.offsetLeft;
        t += p.offsetTop;
      }
      //-- Let's recursively check upwards:
      return _isVisible(p, t, r, b, l, w, h);
    }
    return true;
  }

  return _isVisible(node);
}