/*
 * Piwik Tracker class
 *
 * trackerUrl and trackerSiteId are optional arguments to the constructor
 *
 * See: Tracker.setTrackerUrl() and Tracker.setSiteId()
 */
function Tracker(trackerUrl, siteId) {
  /************************************************************
   * Private members
   ************************************************************/

  var
	/*<DEBUG>*/
	/*
	* registered test hooks
	*/
    registeredHooks = {},
    /*</DEBUG>*/

    trackerInstance = this,
    // constants
    CONSENT_COOKIE_NAME = "mtm_consent",
    CONSENT_REMOVED_COOKIE_NAME = "mtm_consent_removed",
    // Current URL and Referrer URL
    locationArray = urlFixup(
      documentAlias.domain,
      windowAlias.location.href,
      getReferrer()
    ),
    domainAlias = domainFixup(locationArray[0]),
    locationHrefAlias = safeDecodeWrapper(locationArray[1]),
    configReferrerUrl = safeDecodeWrapper(locationArray[2]),
    enableJSErrorTracking = false,
    defaultRequestMethod = "GET",
    // Request method (GET or POST)
    configRequestMethod = defaultRequestMethod,
    defaultRequestContentType =
    "application/x-www-form-urlencoded; charset=UTF-8",
    // Request Content-Type header value; applicable when POST request method is used for submitting tracking events
    configRequestContentType = defaultRequestContentType,
    // Tracker URL
    configTrackerUrl = trackerUrl || "",
    // API URL (only set if it differs from the Tracker URL)
    configApiUrl = "",
    // This string is appended to the Tracker URL Request (eg. to send data that is not handled by the existing setters/getters)
    configAppendToTrackingUrl = "",
    // Site ID
    configTrackerSiteId = siteId || "",
    // User ID
    configUserId = "",
    // Visitor UUID
    visitorUUID = "",
    // Document URL
    configCustomUrl,
    // Document title
    configTitle = "",
    // Extensions to be treated as download links
    configDownloadExtensions = [
      "7z",
      "aac",
      "apk",
      "arc",
      "arj",
      "asf",
      "asx",
      "avi",
      "azw3",
      "bin",
      "csv",
      "deb",
      "dmg",
      "doc",
      "docx",
      "epub",
      "exe",
      "flv",
      "gif",
      "gz",
      "gzip",
      "hqx",
      "ibooks",
      "jar",
      "jpg",
      "jpeg",
      "js",
      "mobi",
      "mp2",
      "mp3",
      "mp4",
      "mpg",
      "mpeg",
      "mov",
      "movie",
      "msi",
      "msp",
      "odb",
      "odf",
      "odg",
      "ods",
      "odt",
      "ogg",
      "ogv",
      "pdf",
      "phps",
      "png",
      "ppt",
      "pptx",
      "qt",
      "qtm",
      "ra",
      "ram",
      "rar",
      "rpm",
      "sea",
      "sit",
      "tar",
      "tbz",
      "tbz2",
      "bz",
      "bz2",
      "tgz",
      "torrent",
      "txt",
      "wav",
      "wma",
      "wmv",
      "wpd",
      "xls",
      "xlsx",
      "xml",
      "z",
      "zip"
    ],
    // Hosts or alias(es) to not treat as outlinks
    configHostsAlias = [domainAlias],
    // HTML anchor element classes to not track
    configIgnoreClasses = [],
    // HTML anchor element classes to treat as downloads
    configDownloadClasses = [],
    // HTML anchor element classes to treat at outlinks
    configLinkClasses = [],
    // Maximum delay to wait for web bug image to be fetched (in milliseconds)
    configTrackerPause = 500,
    // Minimum visit time after initial page view (in milliseconds)
    configMinimumVisitTime,
    // Recurring heart beat after initial ping (in milliseconds)
    configHeartBeatDelay,
    // alias to circumvent circular function dependency (JSLint requires this)
    heartBeatPingIfActivityAlias,
    // Disallow hash tags in URL
    configDiscardHashTag,
    // Custom data
    configCustomData,
    // Campaign names
    configCampaignNameParameters = [
      "pk_campaign",
      "piwik_campaign",
      "utm_campaign",
      "utm_source",
      "utm_medium"
    ],
    // Campaign keywords
    configCampaignKeywordParameters = ["pk_kwd", "piwik_kwd", "utm_term"],
    // First-party cookie name prefix
    configCookieNamePrefix = "_pk_",
    // the URL parameter that will store the visitorId if cross domain linking is enabled
    // pk_vid = visitor ID
    // first part of this URL parameter will be 16 char visitor Id.
    // The second part is the 10 char current timestamp and the third and last part will be a 6 characters deviceId
    // timestamp is needed to prevent reusing the visitorId when the URL is shared. The visitorId will be
    // only reused if the timestamp is less than 45 seconds old.
    // deviceId parameter is needed to prevent reusing the visitorId when the URL is shared. The visitorId
    // will be only reused if the device is still the same when opening the link.
    // VDI = visitor device identifier
    configVisitorIdUrlParameter = "pk_vid",
    // Cross domain linking, the visitor ID is transmitted only in the 180 seconds following the click.
    configVisitorIdUrlParameterTimeoutInSeconds = 180,
    // First-party cookie domain
    // User agent defaults to origin hostname
    configCookieDomain,
    // First-party cookie path
    // Default is user agent defined.
    configCookiePath,
    // Whether to use "Secure" cookies that only work over SSL
    configCookieIsSecure = false,
    // First-party cookies are disabled
    configCookiesDisabled = false,
    // Do Not Track
    configDoNotTrack,
    // Count sites which are pre-rendered
    configCountPreRendered,
    // Do we attribute the conversion to the first referrer or the most recent referrer?
    configConversionAttributionFirstReferrer,
    // Life of the visitor cookie (in milliseconds)
    configVisitorCookieTimeout = 33955200000, // 13 months (365 days + 28days)
    // Life of the session cookie (in milliseconds)
    configSessionCookieTimeout = 1800000, // 30 minutes
    // Life of the referral cookie (in milliseconds)
    configReferralCookieTimeout = 15768000000, // 6 months
    // Is performance tracking enabled
    configPerformanceTrackingEnabled = true,
    // Generation time set from the server
    configPerformanceGenerationTime = 0,
    // Whether Custom Variables scope "visit" should be stored in a cookie during the time of the visit
    configStoreCustomVariablesInCookie = false,
    // Custom Variables read from cookie, scope "visit"
    customVariables = false,
    configCustomRequestContentProcessing,
    // Custom Variables, scope "page"
    customVariablesPage = {},
    // Custom Variables, scope "event"
    customVariablesEvent = {},
    // Custom Dimensions (can be any scope)
    customDimensions = {},
    // Custom Variables names and values are each truncated before being sent in the request or recorded in the cookie
    customVariableMaximumLength = 200,
    // Ecommerce items
    ecommerceItems = {},
    // Browser features via client-side data collection
    browserFeatures = {},
    // Keeps track of previously tracked content impressions
    trackedContentImpressions = [],
    isTrackOnlyVisibleContentEnabled = false,
    // Guard to prevent empty visits see #6415. If there is a new visitor and the first 2 (or 3 or 4)
    // tracking requests are at nearly same time (eg trackPageView and trackContentImpression) 2 or more
    // visits will be created
    timeNextTrackingRequestCanBeExecutedImmediately = false,
    // Guard against installing the link tracker more than once per Tracker instance
    linkTrackingInstalled = false,
    linkTrackingEnabled = false,
    crossDomainTrackingEnabled = false,
    // Guard against installing the activity tracker more than once per Tracker instance
    heartBeatSetUp = false,
    // bool used to detect whether this browser window had focus at least once. So far we cannot really
    // detect this 100% correct for an iframe so whenever Piwik is loaded inside an iframe we presume
    // the window had focus at least once.
    hadWindowFocusAtLeastOnce = isInsideAnIframe(),
    // Timestamp of last tracker request sent to Piwik
    lastTrackerRequestTime = null,
    // Handle to the current heart beat timeout
    heartBeatTimeout,
    // Internal state of the pseudo click handler
    lastButton,
    lastTarget,
    // Hash function
    hash = sha1,
    // Domain hash value
    domainHash,
    configIdPageView,
    // we measure how many pageviews have been tracked so plugins can use it to eg detect if a
    // pageview was already tracked or not
    numTrackedPageviews = 0,
    configCookiesToDelete = ["id", "ses", "cvar", "ref"],
    // whether requireConsent() was called or not
    configConsentRequired = false,
    // we always have the concept of consent. by default consent is assumed unless the end user removes it,
    // or unless a matomo user explicitly requires consent (via requireConsent())
    configHasConsent = null, // initialized below
    // holds all pending tracking requests that have not been tracked because we need consent
    consentRequestsQueue = [];

  // Document title
  try {
    configTitle = documentAlias.title;
  } catch (e) {
    configTitle = "";
  }

  /*
   * Set cookie value
   */
  function setCookie(cookieName, value, msToExpire, path, domain, isSecure) {
    if (configCookiesDisabled) {
      return;
    }

    var expiryDate;

    // relative time to expire in milliseconds
    if (msToExpire) {
      expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + msToExpire);
    }

    documentAlias.cookie =
      cookieName +
      "=" +
      encodeWrapper(value) +
      (msToExpire ? ";expires=" + expiryDate.toGMTString() : "") +
      ";path=" +
      (path || "/") +
      (domain ? ";domain=" + domain : "") +
      (isSecure ? ";secure" : "");
  }

  /*
   * Get cookie value
   */
  function getCookie(cookieName) {
    if (configCookiesDisabled) {
      return 0;
    }

    var cookiePattern = new RegExp("(^|;)[ ]*" + cookieName + "=([^;]*)"),
      cookieMatch = cookiePattern.exec(documentAlias.cookie);

    return cookieMatch ? decodeWrapper(cookieMatch[2]) : 0;
  }

  configHasConsent = !getCookie(CONSENT_REMOVED_COOKIE_NAME);

  /*
   * Removes hash tag from the URL
   *
   * URLs are purified before being recorded in the cookie,
   * or before being sent as GET parameters
   */
  function purify(url) {
    var targetPattern;

    // we need to remove this parameter here, they wouldn't be removed in Piwik tracker otherwise eg
    // for outlinks or referrers
    url = removeUrlParameter(url, configVisitorIdUrlParameter);

    if (configDiscardHashTag) {
      targetPattern = new RegExp("#.*");

      return url.replace(targetPattern, "");
    }

    return url;
  }

  /*
   * Resolve relative reference
   *
   * Note: not as described in rfc3986 section 5.2
   */
  function resolveRelativeReference(baseUrl, url) {
    var protocol = getProtocolScheme(url),
      i;

    if (protocol) {
      return url;
    }

    if (url.slice(0, 1) === "/") {
      return getProtocolScheme(baseUrl) + "://" + getHostName(baseUrl) + url;
    }

    baseUrl = purify(baseUrl);

    i = baseUrl.indexOf("?");
    if (i >= 0) {
      baseUrl = baseUrl.slice(0, i);
    }

    i = baseUrl.lastIndexOf("/");
    if (i !== baseUrl.length - 1) {
      baseUrl = baseUrl.slice(0, i + 1);
    }

    return baseUrl + url;
  }

  function isSameHost(hostName, alias) {
    var offset;

    hostName = String(hostName).toLowerCase();
    alias = String(alias).toLowerCase();

    if (hostName === alias) {
      return true;
    }

    if (alias.slice(0, 1) === ".") {
      if (hostName === alias.slice(1)) {
        return true;
      }

      offset = hostName.length - alias.length;

      if (offset > 0 && hostName.slice(offset) === alias) {
        return true;
      }
    }

    return false;
  }

  /*
   * Extract pathname from URL. element.pathname is actually supported by pretty much all browsers including
   * IE6 apart from some rare very old ones
   */
  function getPathName(url) {
    var parser = document.createElement("a");
    if (url.indexOf("//") !== 0 && url.indexOf("http") !== 0) {
      if (url.indexOf("*") === 0) {
        url = url.substr(1);
      }
      if (url.indexOf(".") === 0) {
        url = url.substr(1);
      }
      url = "http://" + url;
    }

    parser.href = content.toAbsoluteUrl(url);

    if (parser.pathname) {
      return parser.pathname;
    }

    return "";
  }

  function isSitePath(path, pathAlias) {
    if (!stringStartsWith(pathAlias, "/")) {
      pathAlias = "/" + pathAlias;
    }

    if (!stringStartsWith(path, "/")) {
      path = "/" + path;
    }

    var matchesAnyPath = pathAlias === "/" || pathAlias === "/*";

    if (matchesAnyPath) {
      return true;
    }

    if (path === pathAlias) {
      return true;
    }

    pathAlias = String(pathAlias).toLowerCase();
    path = String(path).toLowerCase();

    // wildcard path support
    if (stringEndsWith(pathAlias, "*")) {
      // remove the final '*' before comparing
      pathAlias = pathAlias.slice(0, -1);

      // Note: this is almost duplicated from just few lines above
      matchesAnyPath = !pathAlias || pathAlias === "/";

      if (matchesAnyPath) {
        return true;
      }

      if (path === pathAlias) {
        return true;
      }

      // wildcard match
      return path.indexOf(pathAlias) === 0;
    }

    // we need to append slashes so /foobarbaz won't match a site /foobar
    if (!stringEndsWith(path, "/")) {
      path += "/";
    }

    if (!stringEndsWith(pathAlias, "/")) {
      pathAlias += "/";
    }

    return path.indexOf(pathAlias) === 0;
  }

  /**
   * Whether the specified domain name and path belong to any of the alias domains (eg. set via setDomains).
   *
   * Note: this function is used to determine whether a click on a URL will be considered an "Outlink".
   *
   * @param host
   * @param path
   * @returns {boolean}
   */
  function isSiteHostPath(host, path) {
    var i, alias, configAlias, aliasHost, aliasPath;

    for (i = 0; i < configHostsAlias.length; i++) {
      aliasHost = domainFixup(configHostsAlias[i]);
      aliasPath = getPathName(configHostsAlias[i]);

      if (isSameHost(host, aliasHost) && isSitePath(path, aliasPath)) {
        return true;
      }
    }

    return false;
  }

  /*
   * Is the host local? (i.e., not an outlink)
   */
  function isSiteHostName(hostName) {
    var i, alias, offset;

    for (i = 0; i < configHostsAlias.length; i++) {
      alias = domainFixup(configHostsAlias[i].toLowerCase());

      if (hostName === alias) {
        return true;
      }

      if (alias.slice(0, 1) === ".") {
        if (hostName === alias.slice(1)) {
          return true;
        }

        offset = hostName.length - alias.length;

        if (offset > 0 && hostName.slice(offset) === alias) {
          return true;
        }
      }
    }

    return false;
  }

  /*
   * Send image request to Piwik server using GET.
   * The infamous web bug (or beacon) is a transparent, single pixel (1x1) image
   */
  function getImage(request, callback) {
    // make sure to actually load an image so callback gets invoked
    request = request.replace("send_image=0", "send_image=1");

    var image = new Image(1, 1);
    image.onload = function () {
      iterator = 0; // To avoid JSLint warning of empty block
      if (typeof callback === "function") {
        callback();
      }
    };
    image.src =
      configTrackerUrl +
      (configTrackerUrl.indexOf("?") < 0 ? "?" : "&") +
      request;
  }

  function sendPostRequestViaSendBeacon(request) {
    var supportsSendBeacon =
      "object" === typeof navigatorAlias &&
      "function" === typeof navigatorAlias.sendBeacon &&
      "function" === typeof Blob;

    if (!supportsSendBeacon) {
      return false;
    }

    var headers = {
      type: "application/x-www-form-urlencoded; charset=UTF-8"
    };
    var success = false;

    try {
      var blob = new Blob([request], headers);
      success = navigatorAlias.sendBeacon(configTrackerUrl, blob);
      // returns true if the user agent is able to successfully queue the data for transfer,
      // Otherwise it returns false and we need to try the regular way
    } catch (e) {
      return false;
    }

    return success;
  }

  /*
   * POST request to Piwik server using XMLHttpRequest.
   */
  function sendXmlHttpRequest(request, callback, fallbackToGet) {
    if (!isDefined(fallbackToGet) || null === fallbackToGet) {
      fallbackToGet = true;
    }

    if (isPageUnloading && sendPostRequestViaSendBeacon(request)) {
      return;
    }

    setTimeout(function () {
      // we execute it with a little delay in case the unload event occurred just after sending this request
      // this is to avoid the following behaviour: Eg on form submit a tracking request is sent via POST
      // in this method. Then a few ms later the browser wants to navigate to the new page and the unload
      // event occurrs and the browser cancels the just triggered POST request. This causes or fallback
      // method to be triggered and we execute the same request again (either as fallbackGet or sendBeacon).
      // The problem is that we do not know whether the inital POST request was already fully transferred
      // to the server or not when the onreadystatechange callback is executed and we might execute the
      // same request a second time. To avoid this, we delay the actual execution of this POST request just
      // by 50ms which gives it usually enough time to detect the unload event in most cases.

      if (isPageUnloading && sendPostRequestViaSendBeacon(request)) {
        return;
      }
      var sentViaBeacon;

      try {
        // we use the progid Microsoft.XMLHTTP because
        // IE5.5 included MSXML 2.5; the progid MSXML2.XMLHTTP
        // is pinned to MSXML2.XMLHTTP.3.0
        var xhr = windowAlias.XMLHttpRequest ? new windowAlias.XMLHttpRequest() : windowAlias.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : null;

        xhr.open("POST", configTrackerUrl, true);

        // fallback on error
        xhr.onreadystatechange = function () {
          if (
            this.readyState === 4 &&
            !(this.status >= 200 && this.status < 300)
          ) {
            var sentViaBeacon =
              isPageUnloading && sendPostRequestViaSendBeacon(request);

            if (!sentViaBeacon && fallbackToGet) {
              getImage(request, callback);
            }
          } else {
            if (this.readyState === 4 && typeof callback === "function") {
              callback();
            }
          }
        };

        xhr.setRequestHeader("Content-Type", configRequestContentType);

        xhr.send(request);
      } catch (e) {
        sentViaBeacon =
          isPageUnloading && sendPostRequestViaSendBeacon(request);
        if (!sentViaBeacon && fallbackToGet) {
          getImage(request, callback);
        }
      }
    }, 50);
  }

  function setExpireDateTime(delay) {
    var now = new Date();
    var time = now.getTime() + delay;

    if (!expireDateTime || time > expireDateTime) {
      expireDateTime = time;
    }
  }

  /*
   * Sets up the heart beat timeout.
   */
  function heartBeatUp(delay) {
    if (heartBeatTimeout || !configHeartBeatDelay || !configHasConsent) {
      return;
    }

    heartBeatTimeout = setTimeout(function heartBeat() {
      heartBeatTimeout = null;

      if (!hadWindowFocusAtLeastOnce) {
        // if browser does not support .hasFocus (eg IE5), we assume that the window has focus.
        hadWindowFocusAtLeastOnce = !documentAlias.hasFocus || documentAlias.hasFocus();
      }

      if (!hadWindowFocusAtLeastOnce) {
        // only send a ping if the tab actually had focus at least once. For example do not send a ping
        // if window was opened via "right click => open in new window" and never had focus see #9504
        heartBeatUp(configHeartBeatDelay);
        return;
      }

      if (heartBeatPingIfActivityAlias()) {
        return;
      }

      var now = new Date(),
        heartBeatDelay =
        configHeartBeatDelay - (now.getTime() - lastTrackerRequestTime);
      // sanity check
      heartBeatDelay = Math.min(configHeartBeatDelay, heartBeatDelay);
      heartBeatUp(heartBeatDelay);
    }, delay || configHeartBeatDelay);
  }

  /*
   * Removes the heart beat timeout.
   */
  function heartBeatDown() {
    if (!heartBeatTimeout) {
      return;
    }

    clearTimeout(heartBeatTimeout);
    heartBeatTimeout = null;
  }

  function heartBeatOnFocus() {
    hadWindowFocusAtLeastOnce = true;

    // since it's possible for a user to come back to a tab after several hours or more, we try to send
    // a ping if the page is active. (after the ping is sent, the heart beat timeout will be set)
    if (heartBeatPingIfActivityAlias()) {
      return;
    }

    heartBeatUp();
  }

  function heartBeatOnBlur() {
    heartBeatDown();
  }

  /*
   * Setup event handlers and timeout for initial heart beat.
   */
  function setUpHeartBeat() {
    if (heartBeatSetUp || !configHeartBeatDelay) {
      return;
    }

    heartBeatSetUp = true;

    addEventListener(windowAlias, "focus", heartBeatOnFocus);
    addEventListener(windowAlias, "blur", heartBeatOnBlur);

    heartBeatUp();
  }

  function makeSureThereIsAGapAfterFirstTrackingRequestToPreventMultipleVisitorCreation(
    callback
  ) {
    var now = new Date();
    var timeNow = now.getTime();

    lastTrackerRequestTime = timeNow;

    if (
      timeNextTrackingRequestCanBeExecutedImmediately &&
      timeNow < timeNextTrackingRequestCanBeExecutedImmediately
    ) {
      // we are in the time frame shortly after the first request. we have to delay this request a bit to make sure
      // a visitor has been created meanwhile.

      var timeToWait =
        timeNextTrackingRequestCanBeExecutedImmediately - timeNow;

      setTimeout(callback, timeToWait);
      setExpireDateTime(timeToWait + 50); // set timeout is not necessarily executed at timeToWait so delay a bit more
      timeNextTrackingRequestCanBeExecutedImmediately += 50; // delay next tracking request by further 50ms to next execute them at same time

      return;
    }

    if (timeNextTrackingRequestCanBeExecutedImmediately === false) {
      // it is the first request, we want to execute this one directly and delay all the next one(s) within a delay.
      // All requests after this delay can be executed as usual again
      var delayInMs = 800;
      timeNextTrackingRequestCanBeExecutedImmediately = timeNow + delayInMs;
    }

    callback();
  }

  /*
   * Send request
   */
  function sendRequest(request, delay, callback) {
    if (!configHasConsent) {
      consentRequestsQueue.push(request);
      return;
    }
    if (!configDoNotTrack && request) {
      if (configConsentRequired && configHasConsent) {
        // send a consent=1 when explicit consent is given for the apache logs
        request += "&consent=1";
      }

      makeSureThereIsAGapAfterFirstTrackingRequestToPreventMultipleVisitorCreation(
        function () {
          if (configRequestMethod === "POST" || String(request).length > 2000) {
            sendXmlHttpRequest(request, callback);
          } else {
            getImage(request, callback);
          }

          setExpireDateTime(delay);
        }
      );
    }
    if (!heartBeatSetUp) {
      setUpHeartBeat(); // setup window events too, but only once
    } else {
      heartBeatUp();
    }
  }

  function canSendBulkRequest(requests) {
    if (configDoNotTrack) {
      return false;
    }

    return requests && requests.length;
  }

  /*
   * Send requests using bulk
   */
  function sendBulkRequest(requests, delay) {
    if (!canSendBulkRequest(requests)) {
      return;
    }

    if (!configHasConsent) {
      consentRequestsQueue.push(requests);
      return;
    }

    var bulk = '{"requests":["?' + requests.join('","?') + '"]}';

    makeSureThereIsAGapAfterFirstTrackingRequestToPreventMultipleVisitorCreation(
      function () {
        sendXmlHttpRequest(bulk, null, false);
        setExpireDateTime(delay);
      }
    );
  }

  /*
   * Get cookie name with prefix and domain hash
   */
  function getCookieName(baseName) {
    // NOTE: If the cookie name is changed, we must also update the PiwikTracker.php which
    // will attempt to discover first party cookies. eg. See the PHP Client method getVisitorId()
    return (
      configCookieNamePrefix +
      baseName +
      "." +
      configTrackerSiteId +
      "." +
      domainHash
    );
  }

  /*
   * Does browser have cookies enabled (for this site)?
   */
  function hasCookies() {
    if (configCookiesDisabled) {
      return "0";
    }

    if (!isDefined(navigatorAlias.cookieEnabled)) {
      var testCookieName = getCookieName("testcookie");
      setCookie(testCookieName, "1");

      return getCookie(testCookieName) === "1" ? "1" : "0";
    }

    return navigatorAlias.cookieEnabled ? "1" : "0";
  }

  /*
   * Update domain hash
   */
  function updateDomainHash() {
    domainHash = hash(
      (configCookieDomain || domainAlias) + (configCookiePath || "/")
    ).slice(0, 4); // 4 hexits = 16 bits
  }

  /*
   * Inits the custom variables object
   */
  function getCustomVariablesFromCookie() {
    var cookieName = getCookieName("cvar"),
      cookie = getCookie(cookieName);

    if (cookie.length) {
      cookie = JSON_PIWIK.parse(cookie);

      if (isObject(cookie)) {
        return cookie;
      }
    }

    return {};
  }

  /*
   * Lazy loads the custom variables from the cookie, only once during this page view
   */
  function loadCustomVariables() {
    if (customVariables === false) {
      customVariables = getCustomVariablesFromCookie();
    }
  }

  /*
   * Generate a pseudo-unique ID to fingerprint this user
   * 16 hexits = 64 bits
   * note: this isn't a RFC4122-compliant UUID
   */
  function generateRandomUuid() {
    return hash(
      (navigatorAlias.userAgent || "") +
      (navigatorAlias.platform || "") +
      JSON_PIWIK.stringify(browserFeatures) +
      new Date().getTime() +
      Math.random()
    ).slice(0, 16);
  }

  function generateBrowserSpecificId() {
    return hash(
      (navigatorAlias.userAgent || "") +
      (navigatorAlias.platform || "") +
      JSON_PIWIK.stringify(browserFeatures)
    ).slice(0, 6);
  }

  function getCurrentTimestampInSeconds() {
    return Math.floor(new Date().getTime() / 1000);
  }

  function makeCrossDomainDeviceId() {
    var timestamp = getCurrentTimestampInSeconds();
    var browserId = generateBrowserSpecificId();
    var deviceId = String(timestamp) + browserId;

    return deviceId;
  }

  function isSameCrossDomainDevice(deviceIdFromUrl) {
    deviceIdFromUrl = String(deviceIdFromUrl);

    var thisBrowserId = generateBrowserSpecificId();
    var lengthBrowserId = thisBrowserId.length;

    var browserIdInUrl = deviceIdFromUrl.substr(-1 * lengthBrowserId,
      lengthBrowserId
    );
    var timestampInUrl = parseInt(
      deviceIdFromUrl.substr(0, deviceIdFromUrl.length - lengthBrowserId),
      10
    );

    if (timestampInUrl && browserIdInUrl && browserIdInUrl === thisBrowserId) {
      // we only reuse visitorId when used on same device / browser

      var currentTimestampInSeconds = getCurrentTimestampInSeconds();

      if (configVisitorIdUrlParameterTimeoutInSeconds <= 0) {
        return true;
      }
      if (
        currentTimestampInSeconds >= timestampInUrl &&
        currentTimestampInSeconds <=
        timestampInUrl + configVisitorIdUrlParameterTimeoutInSeconds
      ) {
        // we only use visitorId if it was generated max 180 seconds ago
        return true;
      }
    }

    return false;
  }

  function getVisitorIdFromUrl(url) {
    if (!crossDomainTrackingEnabled) {
      return "";
    }

    // problem different timezone or when the time on the computer is not set correctly it may re-use
    // the same visitorId again. therefore we also have a factor like hashed user agent to reduce possible
    // activation of a visitorId on other device
    var visitorIdParam = getUrlParameter(url, configVisitorIdUrlParameter);

    if (!visitorIdParam) {
      return "";
    }

    visitorIdParam = String(visitorIdParam);

    var pattern = new RegExp("^[a-zA-Z0-9]+$");

    if (visitorIdParam.length === 32 && pattern.test(visitorIdParam)) {
      var visitorDevice = visitorIdParam.substr(16, 32);

      if (isSameCrossDomainDevice(visitorDevice)) {
        var visitorId = visitorIdParam.substr(0, 16);
        return visitorId;
      }
    }

    return "";
  }

  /*
   * Load visitor ID cookie
   */
  function loadVisitorIdCookie() {
    if (!visitorUUID) {
      // we are using locationHrefAlias and not currentUrl on purpose to for sure get the passed URL parameters
      // from original URL
      visitorUUID = getVisitorIdFromUrl(locationHrefAlias);
    }

    var now = new Date(),
      nowTs = Math.round(now.getTime() / 1000),
      visitorIdCookieName = getCookieName("id"),
      id = getCookie(visitorIdCookieName),
      cookieValue,
      uuid;

    // Visitor ID cookie found
    if (id) {
      cookieValue = id.split(".");

      // returning visitor flag
      cookieValue.unshift("0");

      if (visitorUUID.length) {
        cookieValue[1] = visitorUUID;
      }
      return cookieValue;
    }

    if (visitorUUID.length) {
      uuid = visitorUUID;
    } else if ("0" === hasCookies()) {
      uuid = "";
    } else {
      uuid = generateRandomUuid();
    }

    // No visitor ID cookie, let's create a new one
    cookieValue = [
      // new visitor
      "1",

      // uuid
      uuid,

      // creation timestamp - seconds since Unix epoch
      nowTs,

      // visitCount - 0 = no previous visit
      0,

      // current visit timestamp
      nowTs,

      // last visit timestamp - blank = no previous visit
      "",

      // last ecommerce order timestamp
      ""
    ];

    return cookieValue;
  }

  /**
   * Loads the Visitor ID cookie and returns a named array of values
   */
  function getValuesFromVisitorIdCookie() {
    var cookieVisitorIdValue = loadVisitorIdCookie(),
      newVisitor = cookieVisitorIdValue[0],
      uuid = cookieVisitorIdValue[1],
      createTs = cookieVisitorIdValue[2],
      visitCount = cookieVisitorIdValue[3],
      currentVisitTs = cookieVisitorIdValue[4],
      lastVisitTs = cookieVisitorIdValue[5];

    // case migrating from pre-1.5 cookies
    if (!isDefined(cookieVisitorIdValue[6])) {
      cookieVisitorIdValue[6] = "";
    }

    var lastEcommerceOrderTs = cookieVisitorIdValue[6];

    return {
      newVisitor: newVisitor,
      uuid: uuid,
      createTs: createTs,
      visitCount: visitCount,
      currentVisitTs: currentVisitTs,
      lastVisitTs: lastVisitTs,
      lastEcommerceOrderTs: lastEcommerceOrderTs
    };
  }

  function getRemainingVisitorCookieTimeout() {
    var now = new Date(),
      nowTs = now.getTime(),
      cookieCreatedTs = getValuesFromVisitorIdCookie().createTs;

    var createTs = parseInt(cookieCreatedTs, 10);
    var originalTimeout = createTs * 1000 + configVisitorCookieTimeout - nowTs;
    return originalTimeout;
  }

  /*
   * Sets the Visitor ID cookie
   */
  function setVisitorIdCookie(visitorIdCookieValues) {
    if (!configTrackerSiteId) {
      // when called before Site ID was set
      return;
    }

    var now = new Date(),
      nowTs = Math.round(now.getTime() / 1000);

    if (!isDefined(visitorIdCookieValues)) {
      visitorIdCookieValues = getValuesFromVisitorIdCookie();
    }

    var cookieValue =
      visitorIdCookieValues.uuid +
      "." +
      visitorIdCookieValues.createTs +
      "." +
      visitorIdCookieValues.visitCount +
      "." +
      nowTs +
      "." +
      visitorIdCookieValues.lastVisitTs +
      "." +
      visitorIdCookieValues.lastEcommerceOrderTs;

    setCookie(
      getCookieName("id"),
      cookieValue,
      getRemainingVisitorCookieTimeout(),
      configCookiePath,
      configCookieDomain,
      configCookieIsSecure
    );
  }

  /*
   * Loads the referrer attribution information
   *
   * @returns array
   *  0: campaign name
   *  1: campaign keyword
   *  2: timestamp
   *  3: raw URL
   */
  function loadReferrerAttributionCookie() {
    // NOTE: if the format of the cookie changes,
    // we must also update JS tests, PHP tracker, System tests,
    // and notify other tracking clients (eg. Java) of the changes
    var cookie = getCookie(getCookieName("ref"));

    if (cookie.length) {
      try {
        cookie = JSON_PIWIK.parse(cookie);
        if (isObject(cookie)) {
          return cookie;
        }
      } catch (ignore) {
        // Pre 1.3, this cookie was not JSON encoded
      }
    }

    return ["", "", 0, ""];
  }

  function deleteCookie(cookieName, path, domain) {
    setCookie(cookieName, "", -86400, path, domain);
  }

  function isPossibleToSetCookieOnDomain(domainToTest) {
    var valueToSet = "testvalue";
    setCookie("test", valueToSet, 10000, null, domainToTest);

    if (getCookie("test") === valueToSet) {
      deleteCookie("test", null, domainToTest);

      return true;
    }

    return false;
  }

  function deleteCookies() {
    var savedConfigCookiesDisabled = configCookiesDisabled;

    // Temporarily allow cookies just to delete the existing ones
    configCookiesDisabled = false;

    var index, cookieName;

    for (index = 0; index < configCookiesToDelete.length; index++) {
      cookieName = getCookieName(configCookiesToDelete[index]);
      if (
        cookieName !== CONSENT_REMOVED_COOKIE_NAME &&
        cookieName !== CONSENT_COOKIE_NAME &&
        0 !== getCookie(cookieName)
      ) {
        deleteCookie(cookieName, configCookiePath, configCookieDomain);
      }
    }

    configCookiesDisabled = savedConfigCookiesDisabled;
  }

  function setSiteId(siteId) {
    configTrackerSiteId = siteId;
    setVisitorIdCookie();
  }

  function sortObjectByKeys(value) {
    if (!value || !isObject(value)) {
      return;
    }

    // Object.keys(value) is not supported by all browsers, we get the keys manually
    var keys = [];
    var key;

    for (key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        keys.push(key);
      }
    }

    var normalized = {};
    keys.sort();
    var len = keys.length;
    var i;

    for (i = 0; i < len; i++) {
      normalized[keys[i]] = value[keys[i]];
    }

    return normalized;
  }

  /**
   * Creates the session cookie
   */
  function setSessionCookie() {
    setCookie(
      getCookieName("ses"),
      "*",
      configSessionCookieTimeout,
      configCookiePath,
      configCookieDomain,
      configCookieIsSecure
    );
  }

  function generateUniqueId() {
    var id = "";
    var chars =
      "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var charLen = chars.length;
    var i;

    for (i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * charLen));
    }

    return id;
  }

  /**
   * Returns the URL to call piwik.php,
   * with the standard parameters (plugins, resolution, url, referrer, etc.).
   * Sends the pageview and browser settings with every request in case of race conditions.
   */
  function getRequest(
    request,
    customData,
    pluginMethod,
    currentEcommerceOrderTs
  ) {
    var i,
      now = new Date(),
      nowTs = Math.round(now.getTime() / 1000),
      referralTs,
      referralUrl,
      referralUrlMaxLength = 1024,
      currentReferrerHostName,
      originalReferrerHostName,
      customVariablesCopy = customVariables,
      cookieSessionName = getCookieName("ses"),
      cookieReferrerName = getCookieName("ref"),
      cookieCustomVariablesName = getCookieName("cvar"),
      cookieSessionValue = getCookie(cookieSessionName),
      attributionCookie = loadReferrerAttributionCookie(),
      currentUrl = configCustomUrl || locationHrefAlias,
      campaignNameDetected,
      campaignKeywordDetected;

    if (configCookiesDisabled) {
      deleteCookies();
    }

    if (configDoNotTrack) {
      return "";
    }

    var cookieVisitorIdValues = getValuesFromVisitorIdCookie();
    if (!isDefined(currentEcommerceOrderTs)) {
      currentEcommerceOrderTs = "";
    }

    // send charset if document charset is not utf-8. sometimes encoding
    // of urls will be the same as this and not utf-8, which will cause problems
    // do not send charset if it is utf8 since it's assumed by default in Piwik
    var charSet = documentAlias.characterSet || documentAlias.charset;

    if (!charSet || charSet.toLowerCase() === "utf-8") {
      charSet = null;
    }

    campaignNameDetected = attributionCookie[0];
    campaignKeywordDetected = attributionCookie[1];
    referralTs = attributionCookie[2];
    referralUrl = attributionCookie[3];

    if (!cookieSessionValue) {
      // cookie 'ses' was not found: we consider this the start of a 'session'

      // here we make sure that if 'ses' cookie is deleted few times within the visit
      // and so this code path is triggered many times for one visit,
      // we only increase visitCount once per Visit window (default 30min)
      var visitDuration = configSessionCookieTimeout / 1000;
      if (!cookieVisitorIdValues.lastVisitTs ||
        nowTs - cookieVisitorIdValues.lastVisitTs > visitDuration
      ) {
        cookieVisitorIdValues.visitCount++;
        cookieVisitorIdValues.lastVisitTs =
          cookieVisitorIdValues.currentVisitTs;
      }

      // Detect the campaign information from the current URL
      // Only if campaign wasn't previously set
      // Or if it was set but we must attribute to the most recent one
      // Note: we are working on the currentUrl before purify() since we can parse the campaign parameters in the hash tag
      if (!configConversionAttributionFirstReferrer ||
        !campaignNameDetected.length
      ) {
        for (i in configCampaignNameParameters) {
          if (
            Object.prototype.hasOwnProperty.call(
              configCampaignNameParameters,
              i
            )
          ) {
            campaignNameDetected = getUrlParameter(
              currentUrl,
              configCampaignNameParameters[i]
            );

            if (campaignNameDetected.length) {
              break;
            }
          }
        }

        for (i in configCampaignKeywordParameters) {
          if (
            Object.prototype.hasOwnProperty.call(
              configCampaignKeywordParameters,
              i
            )
          ) {
            campaignKeywordDetected = getUrlParameter(
              currentUrl,
              configCampaignKeywordParameters[i]
            );

            if (campaignKeywordDetected.length) {
              break;
            }
          }
        }
      }

      // Store the referrer URL and time in the cookie;
      // referral URL depends on the first or last referrer attribution
      currentReferrerHostName = getHostName(configReferrerUrl);
      originalReferrerHostName = referralUrl.length ? getHostName(referralUrl) : "";

      if (
        currentReferrerHostName.length && // there is a referrer
        !isSiteHostName(currentReferrerHostName) && // domain is not the current domain
        (!configConversionAttributionFirstReferrer || // attribute to last known referrer
          !originalReferrerHostName.length || // previously empty
          isSiteHostName(originalReferrerHostName))
      ) {
        // previously set but in current domain
        referralUrl = configReferrerUrl;
      }

      // Set the referral cookie if we have either a Referrer URL, or detected a Campaign (or both)
      if (referralUrl.length || campaignNameDetected.length) {
        referralTs = nowTs;
        attributionCookie = [
          campaignNameDetected,
          campaignKeywordDetected,
          referralTs,
          purify(referralUrl.slice(0, referralUrlMaxLength))
        ];

        setCookie(
          cookieReferrerName,
          JSON_PIWIK.stringify(attributionCookie),
          configReferralCookieTimeout,
          configCookiePath,
          configCookieDomain
        );
      }
    }

	/******
	 * idsite 网站ID
	 * rec 1（写死）
	 * r 随机码
	 * h 当前小时
	 * m 当前分钟
	 * s 当前秒数
	 * url 当前纯净地址，只留域名和协议
	 * _id UUID
	 * _idts 访问的时间戳
	 * _idvc 访问数
	 * _idn 新访客（目前尚未使用）
	 * _refts 访问来源的时间戳
	 * _viewts 上一次访问的时间戳
	 * cs 当前页面的字符编码
	 * send_image 是否用图像请求方式传输数据
	 * gt_ms 内容加载消耗的时间（响应结束时间减去请求开始时间）
	 * pv_id 唯一性标识
	 * 下面的字段都表示浏览器功能（navigator.mimeTypes、navigator.javaEnabled等）
	 * pdf 是否支持pdf文件类型
	 * qt 是否支持QuickTime Player播放器
	 * realp 是否支持RealPlayer播放器
	 * wma 是否支持MPlayer播放器
	 * dir 
	 * fla 是否支持Adobe FlashPlayer
	 * java 是否激活了Java
	 * gears 是否安装了Google Gears
	 * ag  是否安装了Microsoft Silverlight
	 * cookie 是否启用了Cookie
	 * res 屏幕的宽和高（未正确计算高清显示器）
	 ******/
    // build out the rest of the request
    request +=
      "&idsite=" +
      configTrackerSiteId +
      "&rec=1" +
      "&r=" +
      String(Math.random()).slice(2, 8) + // keep the string to a minimum
      "&h=" +
      now.getHours() +
      "&m=" +
      now.getMinutes() +
      "&s=" +
      now.getSeconds() +
      "&url=" +
      encodeWrapper(purify(currentUrl)) +
      (configReferrerUrl.length ? "&urlref=" + encodeWrapper(purify(configReferrerUrl)) : "") +
      (configUserId && configUserId.length ? "&uid=" + encodeWrapper(configUserId) : "") +
      "&_id=" +
      cookieVisitorIdValues.uuid +
      "&_idts=" +
      cookieVisitorIdValues.createTs +
      "&_idvc=" +
      cookieVisitorIdValues.visitCount +
      "&_idn=" +
      cookieVisitorIdValues.newVisitor + // currently unused
      (campaignNameDetected.length ? "&_rcn=" + encodeWrapper(campaignNameDetected) : "") +
      (campaignKeywordDetected.length ? "&_rck=" + encodeWrapper(campaignKeywordDetected) : "") +
      "&_refts=" +
      referralTs +
      "&_viewts=" +
      cookieVisitorIdValues.lastVisitTs +
      (String(cookieVisitorIdValues.lastEcommerceOrderTs).length ? "&_ects=" + cookieVisitorIdValues.lastEcommerceOrderTs : "") +
      (String(referralUrl).length ? "&_ref=" +
        encodeWrapper(purify(referralUrl.slice(0, referralUrlMaxLength))) : "") +
      (charSet ? "&cs=" + encodeWrapper(charSet) : "") +
      "&send_image=0";

    // browser features
    for (i in browserFeatures) {
      if (Object.prototype.hasOwnProperty.call(browserFeatures, i)) {
        request += "&" + i + "=" + browserFeatures[i];
      }
    }

    var customDimensionIdsAlreadyHandled = [];
    if (customData) {
      for (i in customData) {
        if (
          Object.prototype.hasOwnProperty.call(customData, i) &&
          /^dimension\d+$/.test(i)
        ) {
          var index = i.replace("dimension", "");
          customDimensionIdsAlreadyHandled.push(parseInt(index, 10));
          customDimensionIdsAlreadyHandled.push(String(index));
          request += "&" + i + "=" + customData[i];
          delete customData[i];
        }
      }
    }

    if (customData && isObjectEmpty(customData)) {
      customData = null;
      // we deleted all keys from custom data
    }

    // custom dimensions
    for (i in customDimensions) {
      if (Object.prototype.hasOwnProperty.call(customDimensions, i)) {
        var isNotSetYet = -1 === indexOfArray(customDimensionIdsAlreadyHandled, i);
        if (isNotSetYet) {
          request += "&dimension" + i + "=" + customDimensions[i];
        }
      }
    }

    // custom data
    if (customData) {
      request += "&data=" + encodeWrapper(JSON_PIWIK.stringify(customData));
    } else if (configCustomData) {
      request +=
        "&data=" + encodeWrapper(JSON_PIWIK.stringify(configCustomData));
    }

    // Custom Variables, scope "page"
    function appendCustomVariablesToRequest(customVariables, parameterName) {
      var customVariablesStringified = JSON_PIWIK.stringify(customVariables);
      if (customVariablesStringified.length > 2) {
        return (
          "&" + parameterName + "=" + encodeWrapper(customVariablesStringified)
        );
      }
      return "";
    }

    var sortedCustomVarPage = sortObjectByKeys(customVariablesPage);
    var sortedCustomVarEvent = sortObjectByKeys(customVariablesEvent);

    request += appendCustomVariablesToRequest(sortedCustomVarPage, "cvar");
    request += appendCustomVariablesToRequest(sortedCustomVarEvent, "e_cvar");

    // Custom Variables, scope "visit"
    if (customVariables) {
      request += appendCustomVariablesToRequest(customVariables, "_cvar");

      // Don't save deleted custom variables in the cookie
      for (i in customVariablesCopy) {
        if (Object.prototype.hasOwnProperty.call(customVariablesCopy, i)) {
          if (customVariables[i][0] === "" || customVariables[i][1] === "") {
            delete customVariables[i];
          }
        }
      }

      if (configStoreCustomVariablesInCookie) {
        setCookie(
          cookieCustomVariablesName,
          JSON_PIWIK.stringify(customVariables),
          configSessionCookieTimeout,
          configCookiePath,
          configCookieDomain
        );
      }
    }

    // performance tracking
    if (configPerformanceTrackingEnabled) {
      if (configPerformanceGenerationTime) {
        request += "&gt_ms=" + configPerformanceGenerationTime;
      } else if (
        performanceAlias &&
        performanceAlias.timing &&
        performanceAlias.timing.requestStart &&
        performanceAlias.timing.responseEnd
      ) {
        request +=
          "&gt_ms=" +
          (performanceAlias.timing.responseEnd -
            performanceAlias.timing.requestStart);
      }
    }

    if (configIdPageView) {
      request += "&pv_id=" + configIdPageView;
    }

    // update cookies
    cookieVisitorIdValues.lastEcommerceOrderTs =
      isDefined(currentEcommerceOrderTs) &&
      String(currentEcommerceOrderTs).length ? currentEcommerceOrderTs : cookieVisitorIdValues.lastEcommerceOrderTs;
    setVisitorIdCookie(cookieVisitorIdValues);
    setSessionCookie();

    // tracker plugin hook
    request += executePluginMethod(pluginMethod, {
      tracker: trackerInstance,
      request: request
    });

    if (configAppendToTrackingUrl.length) {
      request += "&" + configAppendToTrackingUrl;
    }

    if (isFunction(configCustomRequestContentProcessing)) {
      request = configCustomRequestContentProcessing(request);
    }

    return request;
  }

  /*
   * If there was user activity since the last check, and it's been configHeartBeatDelay seconds
   * since the last tracker, send a ping request (the heartbeat timeout will be reset by sendRequest).
   */
  heartBeatPingIfActivityAlias = function heartBeatPingIfActivity() {
    var now = new Date();
    if (lastTrackerRequestTime + configHeartBeatDelay <= now.getTime()) {
      var requestPing = getRequest("ping=1", null, "ping");
      sendRequest(requestPing, configTrackerPause);

      return true;
    }

    return false;
  };

  function logEcommerce(
    orderId,
    grandTotal,
    subTotal,
    tax,
    shipping,
    discount
  ) {
    var request = "idgoal=0",
      lastEcommerceOrderTs,
      now = new Date(),
      items = [],
      sku,
      isEcommerceOrder = String(orderId).length;

    if (isEcommerceOrder) {
      request += "&ec_id=" + encodeWrapper(orderId);
      // Record date of order in the visitor cookie
      lastEcommerceOrderTs = Math.round(now.getTime() / 1000);
    }

    request += "&revenue=" + grandTotal;

    if (String(subTotal).length) {
      request += "&ec_st=" + subTotal;
    }

    if (String(tax).length) {
      request += "&ec_tx=" + tax;
    }

    if (String(shipping).length) {
      request += "&ec_sh=" + shipping;
    }

    if (String(discount).length) {
      request += "&ec_dt=" + discount;
    }

    if (ecommerceItems) {
      // Removing the SKU index in the array before JSON encoding
      for (sku in ecommerceItems) {
        if (Object.prototype.hasOwnProperty.call(ecommerceItems, sku)) {
          // Ensure name and category default to healthy value
          if (!isDefined(ecommerceItems[sku][1])) {
            ecommerceItems[sku][1] = "";
          }

          if (!isDefined(ecommerceItems[sku][2])) {
            ecommerceItems[sku][2] = "";
          }

          // Set price to zero
          if (!isDefined(ecommerceItems[sku][3]) ||
            String(ecommerceItems[sku][3]).length === 0
          ) {
            ecommerceItems[sku][3] = 0;
          }

          // Set quantity to 1
          if (!isDefined(ecommerceItems[sku][4]) ||
            String(ecommerceItems[sku][4]).length === 0
          ) {
            ecommerceItems[sku][4] = 1;
          }

          items.push(ecommerceItems[sku]);
        }
      }
      request += "&ec_items=" + encodeWrapper(JSON_PIWIK.stringify(items));
    }
    request = getRequest(
      request,
      configCustomData,
      "ecommerce",
      lastEcommerceOrderTs
    );
    sendRequest(request, configTrackerPause);

    if (isEcommerceOrder) {
      ecommerceItems = {};
    }
  }

  function logEcommerceOrder(
    orderId,
    grandTotal,
    subTotal,
    tax,
    shipping,
    discount
  ) {
    if (String(orderId).length && isDefined(grandTotal)) {
      logEcommerce(orderId, grandTotal, subTotal, tax, shipping, discount);
    }
  }

  function logEcommerceCartUpdate(grandTotal) {
    if (isDefined(grandTotal)) {
      logEcommerce("", grandTotal, "", "", "", "");
    }
  }

  /*
   * Log the page view / visit
   */
  function logPageView(customTitle, customData, callback) {
    configIdPageView = generateUniqueId();

    var request = getRequest(
      "action_name=" + encodeWrapper(titleFixup(customTitle || configTitle)),
      customData,
      "log"
    );

    sendRequest(request, configTrackerPause, callback);
  }

  /*
   * Construct regular expression of classes
   */
  function getClassesRegExp(configClasses, defaultClass) {
    var i,
      classesRegExp = "(^| )(piwik[_-]" + defaultClass;

    if (configClasses) {
      for (i = 0; i < configClasses.length; i++) {
        classesRegExp += "|" + configClasses[i];
      }
    }

    classesRegExp += ")( |$)";

    return new RegExp(classesRegExp);
  }

  function startsUrlWithTrackerUrl(url) {
    return (
      configTrackerUrl && url && 0 === String(url).indexOf(configTrackerUrl)
    );
  }

  /*
   * Link or Download?
   */
  function getLinkType(className, href, isInLink, hasDownloadAttribute) {
    if (startsUrlWithTrackerUrl(href)) {
      return 0;
    }

    // does class indicate whether it is an (explicit/forced) outlink or a download?
    var downloadPattern = getClassesRegExp(configDownloadClasses, "download"),
      linkPattern = getClassesRegExp(configLinkClasses, "link"),
      // does file extension indicate that it is a download?
      downloadExtensionsPattern = new RegExp(
        "\\.(" + configDownloadExtensions.join("|") + ")([?&#]|$)",
        "i"
      );

    if (linkPattern.test(className)) {
      return "link";
    }

    if (
      hasDownloadAttribute ||
      downloadPattern.test(className) ||
      downloadExtensionsPattern.test(href)
    ) {
      return "download";
    }

    if (isInLink) {
      return 0;
    }

    return "link";
  }

  function getSourceElement(sourceElement) {
    var parentElement;

    parentElement = sourceElement.parentNode;
    while (
      parentElement !== null &&
      /* buggy IE5.5 */
      isDefined(parentElement)
    ) {
      if (query.isLinkElement(sourceElement)) {
        break;
      }
      sourceElement = parentElement;
      parentElement = sourceElement.parentNode;
    }

    return sourceElement;
  }

  function getLinkIfShouldBeProcessed(sourceElement) {
    sourceElement = getSourceElement(sourceElement);

    if (!query.hasNodeAttribute(sourceElement, "href")) {
      return;
    }

    if (!isDefined(sourceElement.href)) {
      return;
    }

    var href = query.getAttributeValueFromNode(sourceElement, "href");

    if (startsUrlWithTrackerUrl(href)) {
      return;
    }

    var originalSourcePath =
      sourceElement.pathname || getPathName(sourceElement.href);

    // browsers, such as Safari, don't downcase hostname and href
    var originalSourceHostName =
      sourceElement.hostname || getHostName(sourceElement.href);
    var sourceHostName = originalSourceHostName.toLowerCase();
    var sourceHref = sourceElement.href.replace(
      originalSourceHostName,
      sourceHostName
    );

    // browsers, such as Safari, don't downcase hostname and href
    var scriptProtocol = new RegExp(
      "^(javascript|vbscript|jscript|mocha|livescript|ecmascript|mailto|tel):",
      "i"
    );

    if (!scriptProtocol.test(sourceHref)) {
      // track outlinks and all downloads
      var linkType = getLinkType(
        sourceElement.className,
        sourceHref,
        isSiteHostPath(sourceHostName, originalSourcePath),
        query.hasNodeAttribute(sourceElement, "download")
      );

      if (linkType) {
        return {
          type: linkType,
          href: sourceHref
        };
      }
    }
  }

  function buildContentInteractionRequest(interaction, name, piece, target) {
    var params = content.buildInteractionRequestParams(
      interaction,
      name,
      piece,
      target
    );

    if (!params) {
      return;
    }

    return getRequest(params, null, "contentInteraction");
  }

  function buildContentInteractionTrackingRedirectUrl(
    url,
    contentInteraction,
    contentName,
    contentPiece,
    contentTarget
  ) {
    if (!isDefined(url)) {
      return;
    }

    if (startsUrlWithTrackerUrl(url)) {
      return url;
    }

    var redirectUrl = content.toAbsoluteUrl(url);
    var request = "redirecturl=" + encodeWrapper(redirectUrl) + "&";
    request += buildContentInteractionRequest(
      contentInteraction,
      contentName,
      contentPiece,
      contentTarget || url
    );

    var separator = "&";
    if (configTrackerUrl.indexOf("?") < 0) {
      separator = "?";
    }

    return configTrackerUrl + separator + request;
  }

  function isNodeAuthorizedToTriggerInteraction(contentNode, interactedNode) {
    if (!contentNode || !interactedNode) {
      return false;
    }

    var targetNode = content.findTargetNode(contentNode);

    if (content.shouldIgnoreInteraction(targetNode)) {
      // interaction should be ignored
      return false;
    }

    targetNode = content.findTargetNodeNoDefault(contentNode);
    if (targetNode && !containsNodeElement(targetNode, interactedNode)) {
      /**
       * There is a target node defined but the clicked element is not within the target node. example:
       * <div data-track-content><a href="Y" data-content-target>Y</a><img src=""/><a href="Z">Z</a></div>
       *
       * The user clicked in this case on link Z and not on target Y
       */
      return false;
    }

    return true;
  }

  function getContentInteractionToRequestIfPossible(
    anyNode,
    interaction,
    fallbackTarget
  ) {
    if (!anyNode) {
      return;
    }

    var contentNode = content.findParentContentNode(anyNode);

    if (!contentNode) {
      // we are not within a content block
      return;
    }

    if (!isNodeAuthorizedToTriggerInteraction(contentNode, anyNode)) {
      return;
    }

    var contentBlock = content.buildContentBlock(contentNode);

    if (!contentBlock) {
      return;
    }

    if (!contentBlock.target && fallbackTarget) {
      contentBlock.target = fallbackTarget;
    }

    return content.buildInteractionRequestParams(
      interaction,
      contentBlock.name,
      contentBlock.piece,
      contentBlock.target
    );
  }

  function wasContentImpressionAlreadyTracked(contentBlock) {
    if (!trackedContentImpressions || !trackedContentImpressions.length) {
      return false;
    }

    var index, trackedContent;

    for (index = 0; index < trackedContentImpressions.length; index++) {
      trackedContent = trackedContentImpressions[index];

      if (
        trackedContent &&
        trackedContent.name === contentBlock.name &&
        trackedContent.piece === contentBlock.piece &&
        trackedContent.target === contentBlock.target
      ) {
        return true;
      }
    }

    return false;
  }

  function replaceHrefIfInternalLink(contentBlock) {
    if (!contentBlock) {
      return false;
    }

    var targetNode = content.findTargetNode(contentBlock);

    if (!targetNode || content.shouldIgnoreInteraction(targetNode)) {
      return false;
    }

    var link = getLinkIfShouldBeProcessed(targetNode);

    if (linkTrackingEnabled && link && link.type) {
      return false; // will be handled via outlink or download.
    }

    if (
      query.isLinkElement(targetNode) &&
      query.hasNodeAttributeWithValue(targetNode, "href")
    ) {
      var url = String(query.getAttributeValueFromNode(targetNode, "href"));

      if (0 === url.indexOf("#")) {
        return false;
      }

      if (startsUrlWithTrackerUrl(url)) {
        return true;
      }

      if (!content.isUrlToCurrentDomain(url)) {
        return false;
      }

      var block = content.buildContentBlock(contentBlock);

      if (!block) {
        return;
      }

      var contentName = block.name;
      var contentPiece = block.piece;
      var contentTarget = block.target;

      if (!query.hasNodeAttributeWithValue(
          targetNode,
          content.CONTENT_TARGET_ATTR
        ) ||
        targetNode.wasContentTargetAttrReplaced
      ) {
        // make sure we still track the correct content target when an interaction is happening
        targetNode.wasContentTargetAttrReplaced = true;
        contentTarget = content.toAbsoluteUrl(url);
        query.setAnyAttribute(
          targetNode,
          content.CONTENT_TARGET_ATTR,
          contentTarget
        );
      }

      var targetUrl = buildContentInteractionTrackingRedirectUrl(
        url,
        "click",
        contentName,
        contentPiece,
        contentTarget
      );

      // location.href does not respect target=_blank so we prefer to use this
      content.setHrefAttribute(targetNode, targetUrl);

      return true;
    }

    return false;
  }

  function replaceHrefsIfInternalLink(contentNodes) {
    if (!contentNodes || !contentNodes.length) {
      return;
    }

    var index;
    for (index = 0; index < contentNodes.length; index++) {
      replaceHrefIfInternalLink(contentNodes[index]);
    }
  }

  function trackContentImpressionClickInteraction(targetNode) {
    return function (event) {
      if (!targetNode) {
        return;
      }

      var contentBlock = content.findParentContentNode(targetNode);

      var interactedElement;
      if (event) {
        interactedElement = event.target || event.srcElement;
      }
      if (!interactedElement) {
        interactedElement = targetNode;
      }

      if (!isNodeAuthorizedToTriggerInteraction(contentBlock, interactedElement)) {
        return;
      }

      setExpireDateTime(configTrackerPause);

      if (
        query.isLinkElement(targetNode) &&
        query.hasNodeAttributeWithValue(targetNode, "href") &&
        query.hasNodeAttributeWithValue(targetNode, content.CONTENT_TARGET_ATTR)
      ) {
        // there is a href attribute, the link was replaced with piwik.php but later the href was changed again by the application.
        var href = query.getAttributeValueFromNode(targetNode, "href");
        if (!startsUrlWithTrackerUrl(href) &&
          targetNode.wasContentTargetAttrReplaced
        ) {
          query.setAnyAttribute(targetNode, content.CONTENT_TARGET_ATTR, "");
        }
      }

      var link = getLinkIfShouldBeProcessed(targetNode);

      if (linkTrackingInstalled && link && link.type) {
        // click ignore, will be tracked via processClick, we do not want to track it twice

        return link.type;
      }

      if (replaceHrefIfInternalLink(contentBlock)) {
        return "href";
      }

      var block = content.buildContentBlock(contentBlock);

      if (!block) {
        return;
      }

      var contentName = block.name;
      var contentPiece = block.piece;
      var contentTarget = block.target;

      // click on any non link element, or on a link element that has not an href attribute or on an anchor
      var request = buildContentInteractionRequest(
        "click",
        contentName,
        contentPiece,
        contentTarget
      );
      sendRequest(request, configTrackerPause);

      return request;
    };
  }

  function setupInteractionsTracking(contentNodes) {
    if (!contentNodes || !contentNodes.length) {
      return;
    }

    var index, targetNode;
    for (index = 0; index < contentNodes.length; index++) {
      targetNode = content.findTargetNode(contentNodes[index]);

      if (targetNode && !targetNode.contentInteractionTrackingSetupDone) {
        targetNode.contentInteractionTrackingSetupDone = true;

        addEventListener(
          targetNode,
          "click",
          trackContentImpressionClickInteraction(targetNode)
        );
      }
    }
  }

  /*
   * Log all content pieces
   */
  function buildContentImpressionsRequests(contents, contentNodes) {
    if (!contents || !contents.length) {
      return [];
    }

    var index, request;

    for (index = 0; index < contents.length; index++) {
      if (wasContentImpressionAlreadyTracked(contents[index])) {
        contents.splice(index, 1);
        index--;
      } else {
        trackedContentImpressions.push(contents[index]);
      }
    }

    if (!contents || !contents.length) {
      return [];
    }

    replaceHrefsIfInternalLink(contentNodes);
    setupInteractionsTracking(contentNodes);

    var requests = [];

    for (index = 0; index < contents.length; index++) {
      request = getRequest(
        content.buildImpressionRequestParams(
          contents[index].name,
          contents[index].piece,
          contents[index].target
        ),
        undefined,
        "contentImpressions"
      );

      if (request) {
        requests.push(request);
      }
    }

    return requests;
  }

  /*
   * Log all content pieces
   */
  function getContentImpressionsRequestsFromNodes(contentNodes) {
    var contents = content.collectContent(contentNodes);

    return buildContentImpressionsRequests(contents, contentNodes);
  }

  /*
   * Log currently visible content pieces
   */
  function getCurrentlyVisibleContentImpressionsRequestsIfNotTrackedYet(
    contentNodes
  ) {
    if (!contentNodes || !contentNodes.length) {
      return [];
    }

    var index;

    for (index = 0; index < contentNodes.length; index++) {
      if (!content.isNodeVisible(contentNodes[index])) {
        contentNodes.splice(index, 1);
        index--;
      }
    }

    if (!contentNodes || !contentNodes.length) {
      return [];
    }

    return getContentImpressionsRequestsFromNodes(contentNodes);
  }

  function buildContentImpressionRequest(
    contentName,
    contentPiece,
    contentTarget
  ) {
    var params = content.buildImpressionRequestParams(
      contentName,
      contentPiece,
      contentTarget
    );

    return getRequest(params, null, "contentImpression");
  }

  function buildContentInteractionRequestNode(node, contentInteraction) {
    if (!node) {
      return;
    }

    var contentNode = content.findParentContentNode(node);
    var contentBlock = content.buildContentBlock(contentNode);

    if (!contentBlock) {
      return;
    }

    if (!contentInteraction) {
      contentInteraction = "Unknown";
    }

    return buildContentInteractionRequest(
      contentInteraction,
      contentBlock.name,
      contentBlock.piece,
      contentBlock.target
    );
  }

  function buildEventRequest(category, action, name, value) {
    return (
      "e_c=" +
      encodeWrapper(category) +
      "&e_a=" +
      encodeWrapper(action) +
      (isDefined(name) ? "&e_n=" + encodeWrapper(name) : "") +
      (isDefined(value) ? "&e_v=" + encodeWrapper(value) : "")
    );
  }

  /*
   * Log the event
   */
  function logEvent(category, action, name, value, customData, callback) {
    // Category and Action are required parameters
    if (
      trim(String(category)).length === 0 ||
      trim(String(action)).length === 0
    ) {
      logConsoleError(
        "Error while logging event: Parameters `category` and `action` must not be empty or filled with whitespaces"
      );
      return false;
    }
    var request = getRequest(
      buildEventRequest(category, action, name, value),
      customData,
      "event"
    );

    sendRequest(request, configTrackerPause, callback);
  }

  /*
   * Log the site search request
   */
  function logSiteSearch(keyword, category, resultsCount, customData) {
    var request = getRequest(
      "search=" +
      encodeWrapper(keyword) +
      (category ? "&search_cat=" + encodeWrapper(category) : "") +
      (isDefined(resultsCount) ? "&search_count=" + resultsCount : ""),
      customData,
      "sitesearch"
    );

    sendRequest(request, configTrackerPause);
  }

  /*
   * Log the goal with the server
   */
  function logGoal(idGoal, customRevenue, customData) {
    var request = getRequest(
      "idgoal=" + idGoal + (customRevenue ? "&revenue=" + customRevenue : ""),
      customData,
      "goal"
    );

    sendRequest(request, configTrackerPause);
  }

  /*
   * Log the link or click with the server
   */
  function logLink(url, linkType, customData, callback, sourceElement) {
    var linkParams = linkType + "=" + encodeWrapper(purify(url));

    var interaction = getContentInteractionToRequestIfPossible(
      sourceElement,
      "click",
      url
    );

    if (interaction) {
      linkParams += "&" + interaction;
    }

    var request = getRequest(linkParams, customData, "link");

    sendRequest(request, configTrackerPause, callback);
  }

  /*
   * Browser prefix
   */
  function prefixPropertyName(prefix, propertyName) {
    if (prefix !== "") {
      return (
        prefix + propertyName.charAt(0).toUpperCase() + propertyName.slice(1)
      );
    }

    return propertyName;
  }

  /*
   * Check for pre-rendered web pages, and log the page view/link/goal
   * according to the configuration and/or visibility
   *
   * @see http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/PageVisibility/Overview.html
   */
  function trackCallback(callback) {
    var isPreRendered,
      i,
      // Chrome 13, IE10, FF10
      prefixes = ["", "webkit", "ms", "moz"],
      prefix;

    if (!configCountPreRendered) {
      for (i = 0; i < prefixes.length; i++) {
        prefix = prefixes[i];

        // does this browser support the page visibility API?
        if (
          Object.prototype.hasOwnProperty.call(
            documentAlias,
            prefixPropertyName(prefix, "hidden")
          )
        ) {
          // if pre-rendered, then defer callback until page visibility changes
          if (
            documentAlias[prefixPropertyName(prefix, "visibilityState")] ===
            "prerender"
          ) {
            isPreRendered = true;
          }
          break;
        }
      }
    }

    if (isPreRendered) {
      // note: the event name doesn't follow the same naming convention as vendor properties
      addEventListener(
        documentAlias,
        prefix + "visibilitychange",
        function ready() {
          documentAlias.removeEventListener(
            prefix + "visibilitychange",
            ready,
            false
          );
          callback();
        }
      );

      return;
    }

    // configCountPreRendered === true || isPreRendered === false
    callback();
  }

  function getCrossDomainVisitorId() {
    var visitorId = getValuesFromVisitorIdCookie().uuid;
    var deviceId = makeCrossDomainDeviceId();
    return visitorId + deviceId;
  }

  function replaceHrefForCrossDomainLink(element) {
    if (!element) {
      return;
    }

    if (!query.hasNodeAttribute(element, "href")) {
      return;
    }

    var link = query.getAttributeValueFromNode(element, "href");

    if (!link || startsUrlWithTrackerUrl(link)) {
      return;
    }

    // we need to remove the parameter and add it again if needed to make sure we have latest timestamp
    // and visitorId (eg userId might be set etc)
    link = removeUrlParameter(link, configVisitorIdUrlParameter);

    if (link.indexOf("?") > 0) {
      link += "&";
    } else {
      link += "?";
    }

    var crossDomainVisitorId = getCrossDomainVisitorId();

    link = addUrlParameter(
      link,
      configVisitorIdUrlParameter,
      crossDomainVisitorId
    );

    query.setAnyAttribute(element, "href", link);
  }

  function isLinkToDifferentDomainButSamePiwikWebsite(element) {
    var targetLink = query.getAttributeValueFromNode(element, "href");

    if (!targetLink) {
      return false;
    }

    targetLink = String(targetLink);

    var isOutlink =
      targetLink.indexOf("//") === 0 ||
      targetLink.indexOf("http://") === 0 ||
      targetLink.indexOf("https://") === 0;

    if (!isOutlink) {
      return false;
    }

    var originalSourcePath = element.pathname || getPathName(element.href);
    var originalSourceHostName = (
      element.hostname || getHostName(element.href)
    ).toLowerCase();

    if (isSiteHostPath(originalSourceHostName, originalSourcePath)) {
      // we could also check against config cookie domain but this would require that other website
      // sets actually same cookie domain and we cannot rely on it.
      if (!isSameHost(domainAlias, domainFixup(originalSourceHostName))) {
        return true;
      }

      return false;
    }

    return false;
  }

  /*
   * Process clicks
   */
  function processClick(sourceElement) {
    var link = getLinkIfShouldBeProcessed(sourceElement);

    // not a link to same domain or the same website (as set in setDomains())
    if (link && link.type) {
      link.href = safeDecodeWrapper(link.href);
      logLink(link.href, link.type, undefined, null, sourceElement);
      return;
    }

    // a link to same domain or the same website (as set in setDomains())
    if (crossDomainTrackingEnabled) {
      // in case the clicked element is within the <a> (for example there is a <div> within the <a>) this will get the actual <a> link element
      sourceElement = getSourceElement(sourceElement);

      if (isLinkToDifferentDomainButSamePiwikWebsite(sourceElement)) {
        replaceHrefForCrossDomainLink(sourceElement);
      }
    }
  }

  function isIE8orOlder() {
    return documentAlias.all && !documentAlias.addEventListener;
  }

  function getKeyCodeFromEvent(event) {
    // event.which is deprecated https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/which
    var which = event.which;

    /**
                 1 : Left mouse button
                 2 : Wheel button or middle button
                 3 : Right mouse button
                 */

    var typeOfEventButton = typeof event.button;

    if (!which && typeOfEventButton !== "undefined") {
      /**
                     -1: No button pressed
                     0 : Main button pressed, usually the left button
                     1 : Auxiliary button pressed, usually the wheel button or themiddle button (if present)
                     2 : Secondary button pressed, usually the right button
                     3 : Fourth button, typically the Browser Back button
                     4 : Fifth button, typically the Browser Forward button

                     IE8 and earlier has different values:
                     1 : Left mouse button
                     2 : Right mouse button
                     4 : Wheel button or middle button

                     For a left-hand configured mouse, the return values are reversed. We do not take care of that.
                     */

      if (isIE8orOlder()) {
        if (event.button & 1) {
          which = 1;
        } else if (event.button & 2) {
          which = 3;
        } else if (event.button & 4) {
          which = 2;
        }
      } else {
        if (event.button === 0 || event.button === "0") {
          which = 1;
        } else if (event.button & 1) {
          which = 2;
        } else if (event.button & 2) {
          which = 3;
        }
      }
    }

    return which;
  }

  function getNameOfClickedButton(event) {
    switch (getKeyCodeFromEvent(event)) {
    case 1:
      return "left";
    case 2:
      return "middle";
    case 3:
      return "right";
    }
  }

  function getTargetElementFromEvent(event) {
    return event.target || event.srcElement;
  }

  /*
   * Handle click event
   */
  function clickHandler(enable) {
    return function (event) {
      event = event || windowAlias.event;

      var button = getNameOfClickedButton(event);
      var target = getTargetElementFromEvent(event);

      if (event.type === "click") {
        var ignoreClick = false;
        if (enable && button === "middle") {
          // if enabled, we track middle clicks via mouseup
          // some browsers (eg chrome) trigger click and mousedown/up events when middle is clicked,
          // whereas some do not. This way we make "sure" to track them only once, either in click
          // (default) or in mouseup (if enable == true)
          ignoreClick = true;
        }

        if (target && !ignoreClick) {
          processClick(target);
        }
      } else if (event.type === "mousedown") {
        if (button === "middle" && target) {
          lastButton = button;
          lastTarget = target;
        } else {
          lastButton = lastTarget = null;
        }
      } else if (event.type === "mouseup") {
        if (button === lastButton && target === lastTarget) {
          processClick(target);
        }
        lastButton = lastTarget = null;
      } else if (event.type === "contextmenu") {
        processClick(target);
      }
    };
  }

  /*
   * Add click listener to a DOM element
   */
  function addClickListener(element, enable) {
    var enableType = typeof enable;
    if (enableType === "undefined") {
      enable = true;
    }

    addEventListener(element, "click", clickHandler(enable), false);

    if (enable) {
      addEventListener(element, "mouseup", clickHandler(enable), false);
      addEventListener(element, "mousedown", clickHandler(enable), false);
      addEventListener(element, "contextmenu", clickHandler(enable), false);
    }
  }

  /*
   * Add click handlers to anchor and AREA elements, except those to be ignored
   */
  function addClickListeners(enable, trackerInstance) {
    linkTrackingInstalled = true;

    // iterate through anchor elements with href and AREA elements
    var i,
      ignorePattern = getClassesRegExp(configIgnoreClasses, "ignore"),
      linkElements = documentAlias.links,
      linkElement = null,
      trackerType = null;

    if (linkElements) {
      for (i = 0; i < linkElements.length; i++) {
        linkElement = linkElements[i];
        if (!ignorePattern.test(linkElement.className)) {
          trackerType = typeof linkElement.piwikTrackers;

          if ("undefined" === trackerType) {
            linkElement.piwikTrackers = [];
          }

          if (-1 === indexOfArray(linkElement.piwikTrackers, trackerInstance)) {
            // we make sure to setup link only once for each tracker
            linkElement.piwikTrackers.push(trackerInstance);
            addClickListener(linkElement, enable);
          }
        }
      }
    }
  }

  function enableTrackOnlyVisibleContent(
    checkOnScroll,
    timeIntervalInMs,
    tracker
  ) {
    if (isTrackOnlyVisibleContentEnabled) {
      // already enabled, do not register intervals again
      return true;
    }

    isTrackOnlyVisibleContentEnabled = true;

    var didScroll = false;
    var events, index;

    function setDidScroll() {
      didScroll = true;
    }

    trackCallbackOnLoad(function () {
      function checkContent(intervalInMs) {
        setTimeout(function () {
          if (!isTrackOnlyVisibleContentEnabled) {
            return; // the tests stopped tracking only visible content
          }
          didScroll = false;
          tracker.trackVisibleContentImpressions();
          checkContent(intervalInMs);
        }, intervalInMs);
      }

      function checkContentIfDidScroll(intervalInMs) {
        setTimeout(function () {
          if (!isTrackOnlyVisibleContentEnabled) {
            return; // the tests stopped tracking only visible content
          }

          if (didScroll) {
            didScroll = false;
            tracker.trackVisibleContentImpressions();
          }

          checkContentIfDidScroll(intervalInMs);
        }, intervalInMs);
      }

      if (checkOnScroll) {
        // scroll event is executed after each pixel, so we make sure not to
        // execute event too often. otherwise FPS goes down a lot!
        events = ["scroll", "resize"];
        for (index = 0; index < events.length; index++) {
          if (documentAlias.addEventListener) {
            documentAlias.addEventListener(events[index], setDidScroll, false);
          } else {
            windowAlias.attachEvent("on" + events[index], setDidScroll);
          }
        }

        checkContentIfDidScroll(100);
      }

      if (timeIntervalInMs && timeIntervalInMs > 0) {
        timeIntervalInMs = parseInt(timeIntervalInMs, 10);
        checkContent(timeIntervalInMs);
      }
    });
  }

  /*
   * Browser features (plugins, resolution, cookies)
   */
  function detectBrowserFeatures() {
    var i,
      mimeType,
      pluginMap = {
        // document types
        pdf: "application/pdf",

        // media players
        qt: "video/quicktime",
        realp: "audio/x-pn-realaudio-plugin",
        wma: "application/x-mplayer2",

        // interactive multimedia
        dir: "application/x-director",
        fla: "application/x-shockwave-flash",

        // RIA
        java: "application/x-java-vm",
        gears: "application/x-googlegears",
        ag: "application/x-silverlight"
      };

    // detect browser features except IE < 11 (IE 11 user agent is no longer MSIE)
    if (!new RegExp("MSIE").test(navigatorAlias.userAgent)) {
      // general plugin detection
      if (navigatorAlias.mimeTypes && navigatorAlias.mimeTypes.length) {
        for (i in pluginMap) {
          if (Object.prototype.hasOwnProperty.call(pluginMap, i)) {
            mimeType = navigatorAlias.mimeTypes[pluginMap[i]];
            browserFeatures[i] = mimeType && mimeType.enabledPlugin ? "1" : "0";
          }
        }
      }

      // Safari and Opera
      // IE6/IE7 navigator.javaEnabled can't be aliased, so test directly
      // on Edge navigator.javaEnabled() always returns `true`, so ignore it
      if (!new RegExp("Edge[ /](\\d+[\\.\\d]+)").test(navigatorAlias.userAgent) &&
        typeof navigator.javaEnabled !== "unknown" &&
        isDefined(navigatorAlias.javaEnabled) &&
        navigatorAlias.javaEnabled()
      ) {
        browserFeatures.java = "1";
      }

      // Firefox
      if (isFunction(windowAlias.GearsFactory)) {
        browserFeatures.gears = "1";
      }

      // other browser features
      browserFeatures.cookie = hasCookies();
    }

    var width = parseInt(screenAlias.width, 10);
    var height = parseInt(screenAlias.height, 10);
    browserFeatures.res = parseInt(width, 10) + "x" + parseInt(height, 10);
  }

  /*<DEBUG>*/
  /*
   * Register a test hook. Using eval() permits access to otherwise
   * privileged members.
   */
  function registerHook(hookName, userHook) {
      var hookObj = null;

      if (
        isString(hookName) &&
        !isDefined(registeredHooks[hookName]) &&
        userHook
      ) {
        if (isObject(userHook)) {
          hookObj = userHook;
        } else if (isString(userHook)) {
          try {
            eval("hookObj =" + userHook);
          } catch (ignore) {}
        }

        registeredHooks[hookName] = hookObj;
      }

      return hookObj;
    }
    /*</DEBUG>*/

  /************************************************************
   * Constructor
   ************************************************************/

  /*
   * initialize tracker
   */
  detectBrowserFeatures();
  updateDomainHash();
  setVisitorIdCookie();

  /*<DEBUG>*/
  /*
   * initialize test plugin
   */
  executePluginMethod("run", null, registerHook);
  /*</DEBUG>*/

  /************************************************************
   * Public data and methods
   ************************************************************/

  /*<DEBUG>*/
  /*
   * Test hook accessors
   */
  this.hook = registeredHooks;
  this.getHook = function (hookName) {
    return registeredHooks[hookName];
  };
  this.getQuery = function () {
    return query;
  };
  this.getContent = function () {
    return content;
  };
  this.setVisitorId = function (visitorId) {
    visitorUUID = visitorId;
  };

  this.buildContentImpressionRequest = buildContentImpressionRequest;
  this.buildContentInteractionRequest = buildContentInteractionRequest;
  this.buildContentInteractionRequestNode = buildContentInteractionRequestNode;
  this.buildContentInteractionTrackingRedirectUrl = buildContentInteractionTrackingRedirectUrl;
  this.getContentImpressionsRequestsFromNodes = getContentImpressionsRequestsFromNodes;
  this.getCurrentlyVisibleContentImpressionsRequestsIfNotTrackedYet = getCurrentlyVisibleContentImpressionsRequestsIfNotTrackedYet;
  this.trackCallbackOnLoad = trackCallbackOnLoad;
  this.trackCallbackOnReady = trackCallbackOnReady;
  this.buildContentImpressionsRequests = buildContentImpressionsRequests;
  this.wasContentImpressionAlreadyTracked = wasContentImpressionAlreadyTracked;
  this.appendContentInteractionToRequestIfPossible = getContentInteractionToRequestIfPossible;
  this.setupInteractionsTracking = setupInteractionsTracking;
  this.trackContentImpressionClickInteraction = trackContentImpressionClickInteraction;
  this.internalIsNodeVisible = isVisible;
  this.isNodeAuthorizedToTriggerInteraction = isNodeAuthorizedToTriggerInteraction;
  this.replaceHrefIfInternalLink = replaceHrefIfInternalLink;
  this.getDomains = function () {
    return configHostsAlias;
  };
  this.getConfigIdPageView = function () {
    return configIdPageView;
  };
  this.getConfigDownloadExtensions = function () {
    return configDownloadExtensions;
  };
  this.enableTrackOnlyVisibleContent = function (
    checkOnScroll,
    timeIntervalInMs
  ) {
    return enableTrackOnlyVisibleContent(checkOnScroll, timeIntervalInMs, this);
  };
  this.clearTrackedContentImpressions = function () {
    trackedContentImpressions = [];
  };
  this.getTrackedContentImpressions = function () {
    return trackedContentImpressions;
  };
  this.clearEnableTrackOnlyVisibleContent = function () {
    isTrackOnlyVisibleContentEnabled = false;
  };
  this.disableLinkTracking = function () {
    linkTrackingInstalled = false;
    linkTrackingEnabled = false;
  };
  this.getConfigVisitorCookieTimeout = function () {
    return configVisitorCookieTimeout;
  };
  this.removeAllAsyncTrackersButFirst = function () {
    var firstTracker = asyncTrackers[0];
    asyncTrackers = [firstTracker];
  };
  this.getConsentRequestsQueue = function () {
    return consentRequestsQueue;
  };
  this.hasConsent = function () {
    return configHasConsent;
  };
  this.getRemainingVisitorCookieTimeout = getRemainingVisitorCookieTimeout;
  /*</DEBUG>*/

  /**
   * Get visitor ID (from first party cookie)
   *
   * @return string Visitor ID in hexits (or empty string, if not yet known)
   */
  this.getVisitorId = function () {
    return getValuesFromVisitorIdCookie().uuid;
  };

  /**
   * Get the visitor information (from first party cookie)
   *
   * @return array
   */
  this.getVisitorInfo = function () {
    // Note: in a new method, we could return also return getValuesFromVisitorIdCookie()
    //       which returns named parameters rather than returning integer indexed array
    return loadVisitorIdCookie();
  };

  /**
   * Get the Attribution information, which is an array that contains
   * the Referrer used to reach the site as well as the campaign name and keyword
   * It is useful only when used in conjunction with Tracker API function setAttributionInfo()
   * To access specific data point, you should use the other functions getAttributionReferrer* and getAttributionCampaign*
   *
   * @return array Attribution array, Example use:
   *   1) Call JSON_PIWIK.stringify(piwikTracker.getAttributionInfo())
   *   2) Pass this json encoded string to the Tracking API (php or java client): setAttributionInfo()
   */
  this.getAttributionInfo = function () {
    return loadReferrerAttributionCookie();
  };

  /**
   * Get the Campaign name that was parsed from the landing page URL when the visitor
   * landed on the site originally
   *
   * @return string
   */
  this.getAttributionCampaignName = function () {
    return loadReferrerAttributionCookie()[0];
  };

  /**
   * Get the Campaign keyword that was parsed from the landing page URL when the visitor
   * landed on the site originally
   *
   * @return string
   */
  this.getAttributionCampaignKeyword = function () {
    return loadReferrerAttributionCookie()[1];
  };

  /**
   * Get the time at which the referrer (used for Goal Attribution) was detected
   *
   * @return int Timestamp or 0 if no referrer currently set
   */
  this.getAttributionReferrerTimestamp = function () {
    return loadReferrerAttributionCookie()[2];
  };

  /**
   * Get the full referrer URL that will be used for Goal Attribution
   *
   * @return string Raw URL, or empty string '' if no referrer currently set
   */
  this.getAttributionReferrerUrl = function () {
    return loadReferrerAttributionCookie()[3];
  };

  /**
   * Specify the Piwik tracking URL
   *
   * @param string trackerUrl
   */
  this.setTrackerUrl = function (trackerUrl) {
    configTrackerUrl = trackerUrl;
  };

  /**
   * Returns the Piwik tracking URL
   * @returns string
   */
  this.getTrackerUrl = function () {
    return configTrackerUrl;
  };

  /**
   * Returns the Piwik server URL.
   *
   * @returns string
   */
  this.getPiwikUrl = function () {
    return getPiwikUrlForOverlay(this.getTrackerUrl(), configApiUrl);
  };

  /**
   * Adds a new tracker. All sent requests will be also sent to the given siteId and piwikUrl.
   *
   * @param string piwikUrl  The tracker URL of the current tracker instance
   * @param int|string siteId
   * @return Tracker
   */
  this.addTracker = function (piwikUrl, siteId) {
    if (!siteId) {
      throw new Error("A siteId must be given to add a new tracker");
    }

    if (!isDefined(piwikUrl) || null === piwikUrl) {
      piwikUrl = this.getTrackerUrl();
    }

    var tracker = new Tracker(piwikUrl, siteId);

    asyncTrackers.push(tracker);

    return tracker;
  };

  /**
   * Returns the site ID
   *
   * @returns int
   */
  this.getSiteId = function () {
    return configTrackerSiteId;
  };

  /**
   * Specify the site ID
   *
   * @param int|string siteId
   */
  this.setSiteId = function (siteId) {
    setSiteId(siteId);
  };

  /**
   * Clears the User ID and generates a new visitor id.
   */
  this.resetUserId = function () {
    configUserId = "";
  };

  /**
   * Sets a User ID to this user (such as an email address or a username)
   *
   * @param string User ID
   */
  this.setUserId = function (userId) {
    if (!isDefined(userId) || !userId.length) {
      return;
    }
    configUserId = userId;
  };

  /**
   * Gets the User ID if set.
   *
   * @returns string User ID
   */
  this.getUserId = function () {
    return configUserId;
  };

  /**
   * Pass custom data to the server
   *
   * Examples:
   *   tracker.setCustomData(object);
   *   tracker.setCustomData(key, value);
   *
   * @param mixed key_or_obj
   * @param mixed opt_value
   */
  this.setCustomData = function (key_or_obj, opt_value) {
    if (isObject(key_or_obj)) {
      configCustomData = key_or_obj;
    } else {
      if (!configCustomData) {
        configCustomData = {};
      }
      configCustomData[key_or_obj] = opt_value;
    }
  };

  /**
   * Get custom data
   *
   * @return mixed
   */
  this.getCustomData = function () {
    return configCustomData;
  };

  /**
   * Configure function with custom request content processing logic.
   * It gets called after request content in form of query parameters string has been prepared and before request content gets sent.
   *
   * Examples:
   *   tracker.setCustomRequestProcessing(function(request){
   *     var pairs = request.split('&');
   *     var result = {};
   *     pairs.forEach(function(pair) {
   *       pair = pair.split('=');
   *       result[pair[0]] = decodeURIComponent(pair[1] || '');
   *     });
   *     return JSON.stringify(result);
   *   });
   *
   * @param function customRequestContentProcessingLogic
   */
  this.setCustomRequestProcessing = function (
    customRequestContentProcessingLogic
  ) {
    configCustomRequestContentProcessing = customRequestContentProcessingLogic;
  };

  /**
   * Appends the specified query string to the piwik.php?... Tracking API URL
   *
   * @param string queryString eg. 'lat=140&long=100'
   */
  this.appendToTrackingUrl = function (queryString) {
    configAppendToTrackingUrl = queryString;
  };

  /**
   * Returns the query string for the current HTTP Tracking API request.
   * Piwik would prepend the hostname and path to Piwik: http://example.org/piwik/piwik.php?
   * prior to sending the request.
   *
   * @param request eg. "param=value&param2=value2"
   */
  this.getRequest = function (request) {
    return getRequest(request);
  };

  /**
   * Add plugin defined by a name and a callback function.
   * The callback function will be called whenever a tracking request is sent.
   * This can be used to append data to the tracking request, or execute other custom logic.
   *
   * @param string pluginName
   * @param Object pluginObj
   */
  this.addPlugin = function (pluginName, pluginObj) {
    plugins[pluginName] = pluginObj;
  };

  /**
   * Set Custom Dimensions. Set Custom Dimensions will not be cleared after a tracked pageview and will
   * be sent along all following tracking requests. It is possible to remove/clear a value via `deleteCustomDimension`.
   *
   * @param int index A Custom Dimension index
   * @param string value
   */
  this.setCustomDimension = function (customDimensionId, value) {
    customDimensionId = parseInt(customDimensionId, 10);
    if (customDimensionId > 0) {
      if (!isDefined(value)) {
        value = "";
      }
      if (!isString(value)) {
        value = String(value);
      }
      customDimensions[customDimensionId] = value;
    }
  };

  /**
   * Get a stored value for a specific Custom Dimension index.
   *
   * @param int index A Custom Dimension index
   */
  this.getCustomDimension = function (customDimensionId) {
    customDimensionId = parseInt(customDimensionId, 10);
    if (
      customDimensionId > 0 &&
      Object.prototype.hasOwnProperty.call(customDimensions, customDimensionId)
    ) {
      return customDimensions[customDimensionId];
    }
  };

  /**
   * Delete a custom dimension.
   *
   * @param int index Custom dimension Id
   */
  this.deleteCustomDimension = function (customDimensionId) {
    customDimensionId = parseInt(customDimensionId, 10);
    if (customDimensionId > 0) {
      delete customDimensions[customDimensionId];
    }
  };

  /**
   * Set custom variable within this visit
   *
   * @param int index Custom variable slot ID from 1-5
   * @param string name
   * @param string value
   * @param string scope Scope of Custom Variable:
   *        - "visit" will store the name/value in the visit and will persist it in the cookie for the duration of the visit,
   *        - "page" will store the name/value in the next page view tracked.
   *        - "event" will store the name/value in the next event tracked.
   */
  this.setCustomVariable = function (index, name, value, scope) {
    var toRecord;

    if (!isDefined(scope)) {
      scope = "visit";
    }
    if (!isDefined(name)) {
      return;
    }
    if (!isDefined(value)) {
      value = "";
    }
    if (index > 0) {
      name = !isString(name) ? String(name) : name;
      value = !isString(value) ? String(value) : value;
      toRecord = [
        name.slice(0, customVariableMaximumLength),
        value.slice(0, customVariableMaximumLength)
      ];
      // numeric scope is there for GA compatibility
      if (scope === "visit" || scope === 2) {
        loadCustomVariables();
        customVariables[index] = toRecord;
      } else if (scope === "page" || scope === 3) {
        customVariablesPage[index] = toRecord;
      } else if (scope === "event") {
        /* GA does not have 'event' scope but we do */
        customVariablesEvent[index] = toRecord;
      }
    }
  };

  /**
   * Get custom variable
   *
   * @param int index Custom variable slot ID from 1-5
   * @param string scope Scope of Custom Variable: "visit" or "page" or "event"
   */
  this.getCustomVariable = function (index, scope) {
    var cvar;

    if (!isDefined(scope)) {
      scope = "visit";
    }

    if (scope === "page" || scope === 3) {
      cvar = customVariablesPage[index];
    } else if (scope === "event") {
      cvar = customVariablesEvent[index];
    } else if (scope === "visit" || scope === 2) {
      loadCustomVariables();
      cvar = customVariables[index];
    }

    if (!isDefined(cvar) || (cvar && cvar[0] === "")) {
      return false;
    }

    return cvar;
  };

  /**
   * Delete custom variable
   *
   * @param int index Custom variable slot ID from 1-5
   * @param string scope
   */
  this.deleteCustomVariable = function (index, scope) {
    // Only delete if it was there already
    if (this.getCustomVariable(index, scope)) {
      this.setCustomVariable(index, "", "", scope);
    }
  };

  /**
   * Deletes all custom variables for a certain scope.
   *
   * @param string scope
   */
  this.deleteCustomVariables = function (scope) {
    if (scope === "page" || scope === 3) {
      customVariablesPage = {};
    } else if (scope === "event") {
      customVariablesEvent = {};
    } else if (scope === "visit" || scope === 2) {
      customVariables = {};
    }
  };

  /**
   * When called then the Custom Variables of scope "visit" will be stored (persisted) in a first party cookie
   * for the duration of the visit. This is useful if you want to call getCustomVariable later in the visit.
   *
   * By default, Custom Variables of scope "visit" are not stored on the visitor's computer.
   */
  this.storeCustomVariablesInCookie = function () {
    configStoreCustomVariablesInCookie = true;
  };

  /**
   * Set delay for link tracking (in milliseconds)
   *
   * @param int delay
   */
  this.setLinkTrackingTimer = function (delay) {
    configTrackerPause = delay;
  };

  /**
   * Get delay for link tracking (in milliseconds)
   *
   * @param int delay
   */
  this.getLinkTrackingTimer = function () {
    return configTrackerPause;
  };

  /**
   * Set list of file extensions to be recognized as downloads
   *
   * @param string|array extensions
   */
  this.setDownloadExtensions = function (extensions) {
    if (isString(extensions)) {
      extensions = extensions.split("|");
    }
    configDownloadExtensions = extensions;
  };

  /**
   * Specify additional file extensions to be recognized as downloads
   *
   * @param string|array extensions  for example 'custom' or ['custom1','custom2','custom3']
   */
  this.addDownloadExtensions = function (extensions) {
    var i;
    if (isString(extensions)) {
      extensions = extensions.split("|");
    }
    for (i = 0; i < extensions.length; i++) {
      configDownloadExtensions.push(extensions[i]);
    }
  };

  /**
   * Removes specified file extensions from the list of recognized downloads
   *
   * @param string|array extensions  for example 'custom' or ['custom1','custom2','custom3']
   */
  this.removeDownloadExtensions = function (extensions) {
    var i,
      newExtensions = [];
    if (isString(extensions)) {
      extensions = extensions.split("|");
    }
    for (i = 0; i < configDownloadExtensions.length; i++) {
      if (indexOfArray(extensions, configDownloadExtensions[i]) === -1) {
        newExtensions.push(configDownloadExtensions[i]);
      }
    }
    configDownloadExtensions = newExtensions;
  };

  /**
   * Set array of domains to be treated as local. Also supports path, eg '.piwik.org/subsite1'. In this
   * case all links that don't go to '*.piwik.org/subsite1/ *' would be treated as outlinks.
   * For example a link to 'piwik.org/' or 'piwik.org/subsite2' both would be treated as outlinks.
   *
   * Also supports page wildcard, eg 'piwik.org/index*'. In this case all links
   * that don't go to piwik.org/index* would be treated as outlinks.
   *
   * The current domain will be added automatically if no given host alias contains a path and if no host
   * alias is already given for the current host alias. Say you are on "example.org" and set
   * "hostAlias = ['example.com', 'example.org/test']" then the current "example.org" domain will not be
   * added as there is already a more restrictive hostAlias 'example.org/test' given. We also do not add
   * it automatically if there was any other host specifying any path like
   * "['example.com', 'example2.com/test']". In this case we would also not add the current
   * domain "example.org" automatically as the "path" feature is used. As soon as someone uses the path
   * feature, for Piwik JS Tracker to work correctly in all cases, one needs to specify all hosts
   * manually.
   *
   * @param string|array hostsAlias
   */
  this.setDomains = function (hostsAlias) {
    configHostsAlias = isString(hostsAlias) ? [hostsAlias] : hostsAlias;

    var hasDomainAliasAlready = false,
      i = 0,
      alias;
    for (i; i < configHostsAlias.length; i++) {
      alias = String(configHostsAlias[i]);

      if (isSameHost(domainAlias, domainFixup(alias))) {
        hasDomainAliasAlready = true;
        break;
      }

      var pathName = getPathName(alias);
      if (pathName && pathName !== "/" && pathName !== "/*") {
        hasDomainAliasAlready = true;
        break;
      }
    }

    // The current domain will be added automatically if no given host alias contains a path
    // and if no host alias is already given for the current host alias.
    if (!hasDomainAliasAlready) {
      /**
       * eg if domainAlias = 'piwik.org' and someone set hostsAlias = ['piwik.org/foo'] then we should
       * not add piwik.org as it would increase the allowed scope.
       */
      configHostsAlias.push(domainAlias);
    }
  };

  /**
   * Enables cross domain linking. By default, the visitor ID that identifies a unique visitor is stored in
   * the browser's first party cookies. This means the cookie can only be accessed by pages on the same domain.
   * If you own multiple domains and would like to track all the actions and pageviews of a specific visitor
   * into the same visit, you may enable cross domain linking. Whenever a user clicks on a link it will append
   * a URL parameter pk_vid to the clicked URL which consists of these parts: 16 char visitorId, a 10 character
   * current timestamp and the last 6 characters are an id based on the userAgent to identify the users device).
   * This way the current visitorId is forwarded to the page of the different domain.
   *
   * On the different domain, the Piwik tracker will recognize the set visitorId from the URL parameter and
   * reuse this parameter if the page was loaded within 45 seconds. If cross domain linking was not enabled,
   * it would create a new visit on that page because we wouldn't be able to access the previously created
   * cookie. By enabling cross domain linking you can track several different domains into one website and
   * won't lose for example the original referrer.
   *
   * To make cross domain linking work you need to set which domains should be considered as your domains by
   * calling the method "setDomains()" first. We will add the URL parameter to links that go to a
   * different domain but only if the domain was previously set with "setDomains()" to make sure not to append
   * the URL parameters when a link actually goes to a third-party URL.
   */
  this.enableCrossDomainLinking = function () {
    crossDomainTrackingEnabled = true;
  };

  /**
   * Disable cross domain linking if it was previously enabled. See enableCrossDomainLinking();
   */
  this.disableCrossDomainLinking = function () {
    crossDomainTrackingEnabled = false;
  };

  /**
   * Detect whether cross domain linking is enabled or not. See enableCrossDomainLinking();
   * @returns bool
   */
  this.isCrossDomainLinkingEnabled = function () {
    return crossDomainTrackingEnabled;
  };

  /**
   * By default, the two visits across domains will be linked together
   * when the link is click and the page is loaded within 180 seconds.
   * @param timeout in seconds
   */
  this.setCrossDomainLinkingTimeout = function (timeout) {
    configVisitorIdUrlParameterTimeoutInSeconds = timeout;
  };

  /**
   * Returns the query parameter appended to link URLs so cross domain visits
   * can be detected.
   *
   * If your application creates links dynamically, then you'll have to add this
   * query parameter manually to those links (since the JavaScript tracker cannot
   * detect when those links are added).
   *
   * Eg:
   *
   * var url = 'http://myotherdomain.com/?' + piwikTracker.getCrossDomainLinkingUrlParameter();
   * $element.append('<a href="' + url + '"/>');
   */
  this.getCrossDomainLinkingUrlParameter = function () {
    return (
      encodeWrapper(configVisitorIdUrlParameter) +
      "=" +
      encodeWrapper(getCrossDomainVisitorId())
    );
  };

  /**
   * Set array of classes to be ignored if present in link
   *
   * @param string|array ignoreClasses
   */
  this.setIgnoreClasses = function (ignoreClasses) {
    configIgnoreClasses = isString(ignoreClasses) ? [ignoreClasses] : ignoreClasses;
  };

  /**
   * Set request method
   *
   * @param string method GET or POST; default is GET
   */
  this.setRequestMethod = function (method) {
    configRequestMethod = method || defaultRequestMethod;
  };

  /**
   * Set request Content-Type header value, applicable when POST request method is used for submitting tracking events.
   * See XMLHttpRequest Level 2 spec, section 4.7.2 for invalid headers
   * @link http://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html
   *
   * @param string requestContentType; default is 'application/x-www-form-urlencoded; charset=UTF-8'
   */
  this.setRequestContentType = function (requestContentType) {
    configRequestContentType = requestContentType || defaultRequestContentType;
  };

  /**
   * Override referrer
   *
   * @param string url
   */
  this.setReferrerUrl = function (url) {
    configReferrerUrl = url;
  };

  /**
   * Override url
   *
   * @param string url
   */
  this.setCustomUrl = function (url) {
    configCustomUrl = resolveRelativeReference(locationHrefAlias, url);
  };

  /**
   * Returns the current url of the page that is currently being visited. If a custom URL was set, the
   * previously defined custom URL will be returned.
   */
  this.getCurrentUrl = function () {
    return configCustomUrl || locationHrefAlias;
  };

  /**
   * Override document.title
   *
   * @param string title
   */
  this.setDocumentTitle = function (title) {
    configTitle = title;
  };

  /**
   * Set the URL of the Piwik API. It is used for Page Overlay.
   * This method should only be called when the API URL differs from the tracker URL.
   *
   * @param string apiUrl
   */
  this.setAPIUrl = function (apiUrl) {
    configApiUrl = apiUrl;
  };

  /**
   * Set array of classes to be treated as downloads
   *
   * @param string|array downloadClasses
   */
  this.setDownloadClasses = function (downloadClasses) {
    configDownloadClasses = isString(downloadClasses) ? [downloadClasses] : downloadClasses;
  };

  /**
   * Set array of classes to be treated as outlinks
   *
   * @param string|array linkClasses
   */
  this.setLinkClasses = function (linkClasses) {
    configLinkClasses = isString(linkClasses) ? [linkClasses] : linkClasses;
  };

  /**
   * Set array of campaign name parameters
   *
   * @see http://piwik.org/faq/how-to/#faq_120
   * @param string|array campaignNames
   */
  this.setCampaignNameKey = function (campaignNames) {
    configCampaignNameParameters = isString(campaignNames) ? [campaignNames] : campaignNames;
  };

  /**
   * Set array of campaign keyword parameters
   *
   * @see http://piwik.org/faq/how-to/#faq_120
   * @param string|array campaignKeywords
   */
  this.setCampaignKeywordKey = function (campaignKeywords) {
    configCampaignKeywordParameters = isString(campaignKeywords) ? [campaignKeywords] : campaignKeywords;
  };

  /**
   * Strip hash tag (or anchor) from URL
   * Note: this can be done in the Piwik>Settings>Websites on a per-website basis
   *
   * @deprecated
   * @param bool enableFilter
   */
  this.discardHashTag = function (enableFilter) {
    configDiscardHashTag = enableFilter;
  };

  /**
   * Set first-party cookie name prefix
   *
   * @param string cookieNamePrefix
   */
  this.setCookieNamePrefix = function (cookieNamePrefix) {
    configCookieNamePrefix = cookieNamePrefix;
    // Re-init the Custom Variables cookie
    customVariables = getCustomVariablesFromCookie();
  };

  /**
   * Set first-party cookie domain
   *
   * @param string domain
   */
  this.setCookieDomain = function (domain) {
    var domainFixed = domainFixup(domain);

    if (isPossibleToSetCookieOnDomain(domainFixed)) {
      configCookieDomain = domainFixed;
      updateDomainHash();
    }
  };

  /**
   * Get first-party cookie domain
   */
  this.getCookieDomain = function () {
    return configCookieDomain;
  };

  /**
   * Detect if cookies are enabled and supported by browser.
   */
  this.hasCookies = function () {
    return "1" === hasCookies();
  };

  /**
   * Set a first-party cookie for the duration of the session.
   *
   * @param string cookieName
   * @param string cookieValue
   * @param int msToExpire Defaults to session cookie timeout
   */
  this.setSessionCookie = function (cookieName, cookieValue, msToExpire) {
    if (!cookieName) {
      throw new Error("Missing cookie name");
    }

    if (!isDefined(msToExpire)) {
      msToExpire = configSessionCookieTimeout;
    }

    configCookiesToDelete.push(cookieName);

    setCookie(
      getCookieName(cookieName),
      cookieValue,
      msToExpire,
      configCookiePath,
      configCookieDomain
    );
  };

  /**
   * Get first-party cookie value.
   *
   * Returns null if cookies are disabled or if no cookie could be found for this name.
   *
   * @param string cookieName
   */
  this.getCookie = function (cookieName) {
    var cookieValue = getCookie(getCookieName(cookieName));

    if (cookieValue === 0) {
      return null;
    }

    return cookieValue;
  };

  /**
   * Set first-party cookie path.
   *
   * @param string domain
   */
  this.setCookiePath = function (path) {
    configCookiePath = path;
    updateDomainHash();
  };

  /**
   * Get first-party cookie path.
   *
   * @param string domain
   */
  this.getCookiePath = function (path) {
    return configCookiePath;
  };

  /**
   * Set visitor cookie timeout (in seconds)
   * Defaults to 13 months (timeout=33955200)
   *
   * @param int timeout
   */
  this.setVisitorCookieTimeout = function (timeout) {
    configVisitorCookieTimeout = timeout * 1000;
  };

  /**
   * Set session cookie timeout (in seconds).
   * Defaults to 30 minutes (timeout=1800)
   *
   * @param int timeout
   */
  this.setSessionCookieTimeout = function (timeout) {
    configSessionCookieTimeout = timeout * 1000;
  };

  /**
   * Get session cookie timeout (in seconds).
   */
  this.getSessionCookieTimeout = function () {
    return configSessionCookieTimeout;
  };

  /**
   * Set referral cookie timeout (in seconds).
   * Defaults to 6 months (15768000000)
   *
   * @param int timeout
   */
  this.setReferralCookieTimeout = function (timeout) {
    configReferralCookieTimeout = timeout * 1000;
  };

  /**
   * Set conversion attribution to first referrer and campaign
   *
   * @param bool if true, use first referrer (and first campaign)
   *             if false, use the last referrer (or campaign)
   */
  this.setConversionAttributionFirstReferrer = function (enable) {
    configConversionAttributionFirstReferrer = enable;
  };

  /**
   * Enable the Secure cookie flag on all first party cookies.
   * This should be used when your website is only available under HTTPS
   * so that all tracking cookies are always sent over secure connection.
   *
   * @param bool
   */
  this.setSecureCookie = function (enable) {
    configCookieIsSecure = enable;
  };

  /**
   * Disables all cookies from being set
   *
   * Existing cookies will be deleted on the next call to track
   */
  this.disableCookies = function () {
    configCookiesDisabled = true;
    browserFeatures.cookie = "0";

    if (configTrackerSiteId) {
      deleteCookies();
    }
  };

  /**
   * One off cookies clearing. Useful to call this when you know for sure a new visitor is using the same browser,
   * it maybe helps to "reset" tracking cookies to prevent data reuse for different users.
   */
  this.deleteCookies = function () {
    deleteCookies();
  };

  /**
   * Handle do-not-track requests
   *
   * @param bool enable If true, don't track if user agent sends 'do-not-track' header
   */
  this.setDoNotTrack = function (enable) {
    var dnt = navigatorAlias.doNotTrack || navigatorAlias.msDoNotTrack;
    configDoNotTrack = enable && (dnt === "yes" || dnt === "1");

    // do not track also disables cookies and deletes existing cookies
    if (configDoNotTrack) {
      this.disableCookies();
    }
  };

  /**
   * Add click listener to a specific link element.
   * When clicked, Piwik will log the click automatically.
   *
   * @param DOMElement element
   * @param bool enable If false, do not use pseudo click-handler (middle click + context menu)
   */
  this.addListener = function (element, enable) {
    addClickListener(element, enable);
  };

  /**
   * Install link tracker.
   *
   * If you change the DOM of your website or web application you need to make sure to call this method
   * again so Piwik can detect links that were added newly.
   *
   * The default behaviour is to use actual click events. However, some browsers
   * (e.g., Firefox, Opera, and Konqueror) don't generate click events for the middle mouse button.
   *
   * To capture more "clicks", the pseudo click-handler uses mousedown + mouseup events.
   * This is not industry standard and is vulnerable to false positives (e.g., drag events).
   *
   * There is a Safari/Chrome/Webkit bug that prevents tracking requests from being sent
   * by either click handler.  The workaround is to set a target attribute (which can't
   * be "_self", "_top", or "_parent").
   *
   * @see https://bugs.webkit.org/show_bug.cgi?id=54783
   *
   * @param bool enable Defaults to true.
   *                    * If "true", use pseudo click-handler (treat middle click and open contextmenu as
   *                    left click). A right click (or any click that opens the context menu) on a link
   *                    will be tracked as clicked even if "Open in new tab" is not selected.
   *                    * If "false" (default), nothing will be tracked on open context menu or middle click.
   *                    The context menu is usually opened to open a link / download in a new tab
   *                    therefore you can get more accurate results by treat it as a click but it can lead
   *                    to wrong click numbers.
   */
  this.enableLinkTracking = function (enable) {
    linkTrackingEnabled = true;

    var self = this;
    trackCallback(function () {
      trackCallbackOnReady(function () {
        addClickListeners(enable, self);
      });
    });
  };

  /**
   * Enable tracking of uncatched JavaScript errors
   *
   * If enabled, uncaught JavaScript Errors will be tracked as an event by defining a
   * window.onerror handler. If a window.onerror handler is already defined we will make
   * sure to call this previously registered error handler after tracking the error.
   *
   * By default we return false in the window.onerror handler to make sure the error still
   * appears in the browser's console etc. Note: Some older browsers might behave differently
   * so it could happen that an actual JavaScript error will be suppressed.
   * If a window.onerror handler was registered we will return the result of this handler.
   *
   * Make sure not to overwrite the window.onerror handler after enabling the JS error
   * tracking as the error tracking won't work otherwise. To capture all JS errors we
   * recommend to include the Piwik JavaScript tracker in the HTML as early as possible.
   * If possible directly in <head></head> before loading any other JavaScript.
   */
  this.enableJSErrorTracking = function () {
    if (enableJSErrorTracking) {
      return;
    }

    enableJSErrorTracking = true;
    var onError = windowAlias.onerror;

    windowAlias.onerror = function (message, url, linenumber, column, error) {
      trackCallback(function () {
        var category = "JavaScript Errors";

        var action = url + ":" + linenumber;
        if (column) {
          action += ":" + column;
        }

        logEvent(category, action, message);
      });

      if (onError) {
        return onError(message, url, linenumber, column, error);
      }

      return false;
    };
  };

  /**
   * Disable automatic performance tracking
   */
  this.disablePerformanceTracking = function () {
    configPerformanceTrackingEnabled = false;
  };

  /**
   * Set the server generation time.
   * If set, the browser's performance.timing API in not used anymore to determine the time.
   *
   * @param int generationTime
   */
  this.setGenerationTimeMs = function (generationTime) {
    configPerformanceGenerationTime = parseInt(generationTime, 10);
  };

  /**
   * Set heartbeat (in seconds)
   *
   * @param int heartBeatDelayInSeconds Defaults to 15. Cannot be lower than 1.
   */
  this.enableHeartBeatTimer = function (heartBeatDelayInSeconds) {
    heartBeatDelayInSeconds = Math.max(heartBeatDelayInSeconds, 1);
    configHeartBeatDelay = (heartBeatDelayInSeconds || 15) * 1000;

    // if a tracking request has already been sent, start the heart beat timeout
    if (lastTrackerRequestTime !== null) {
      setUpHeartBeat();
    }
  };

  /**
   * Disable heartbeat if it was previously activated.
   */
  this.disableHeartBeatTimer = function () {
    heartBeatDown();

    if (configHeartBeatDelay || heartBeatSetUp) {
      if (windowAlias.removeEventListener) {
        windowAlias.removeEventListener("focus", heartBeatOnFocus, true);
        windowAlias.removeEventListener("blur", heartBeatOnBlur, true);
      } else if (windowAlias.detachEvent) {
        windowAlias.detachEvent("onfocus", heartBeatOnFocus);
        windowAlias.detachEvent("onblur", heartBeatOnBlur);
      }
    }

    configHeartBeatDelay = null;
    heartBeatSetUp = false;
  };

  /**
   * Frame buster
   */
  this.killFrame = function () {
    if (windowAlias.location !== windowAlias.top.location) {
      windowAlias.top.location = windowAlias.location;
    }
  };

  /**
   * Redirect if browsing offline (aka file: buster)
   *
   * @param string url Redirect to this URL
   */
  this.redirectFile = function (url) {
    if (windowAlias.location.protocol === "file:") {
      windowAlias.location = url;
    }
  };

  /**
   * Count sites in pre-rendered state
   *
   * @param bool enable If true, track when in pre-rendered state
   */
  this.setCountPreRendered = function (enable) {
    configCountPreRendered = enable;
  };

  /**
   * Trigger a goal
   *
   * @param int|string idGoal
   * @param int|float customRevenue
   * @param mixed customData
   */
  this.trackGoal = function (idGoal, customRevenue, customData) {
    trackCallback(function () {
      logGoal(idGoal, customRevenue, customData);
    });
  };

  /**
   * Manually log a click from your own code
   *
   * @param string sourceUrl
   * @param string linkType
   * @param mixed customData
   * @param function callback
   */
  this.trackLink = function (sourceUrl, linkType, customData, callback) {
    trackCallback(function () {
      logLink(sourceUrl, linkType, customData, callback);
    });
  };

  /**
   * Get the number of page views that have been tracked so far within the currently loaded page.
   */
  this.getNumTrackedPageViews = function () {
    return numTrackedPageviews;
  };

  /**
   * Log visit to this page
   *
   * @param string customTitle
   * @param mixed customData
   * @param function callback
   */
  this.trackPageView = function (customTitle, customData, callback) {
    trackedContentImpressions = [];
    consentRequestsQueue = [];

    if (isOverlaySession(configTrackerSiteId)) {
      trackCallback(function () {
        injectOverlayScripts(
          configTrackerUrl,
          configApiUrl,
          configTrackerSiteId
        );
      });
    } else {
      trackCallback(function () {
        numTrackedPageviews++;
        logPageView(customTitle, customData, callback);
      });
    }
  };

  /**
   * Scans the entire DOM for all content blocks and tracks all impressions once the DOM ready event has
   * been triggered.
   *
   * If you only want to track visible content impressions have a look at `trackVisibleContentImpressions()`.
   * We do not track an impression of the same content block twice if you call this method multiple times
   * unless `trackPageView()` is called meanwhile. This is useful for single page applications.
   */
  this.trackAllContentImpressions = function () {
    if (isOverlaySession(configTrackerSiteId)) {
      return;
    }

    trackCallback(function () {
      trackCallbackOnReady(function () {
        // we have to wait till DOM ready
        var contentNodes = content.findContentNodes();
        var requests = getContentImpressionsRequestsFromNodes(contentNodes);

        sendBulkRequest(requests, configTrackerPause);
      });
    });
  };

  /**
   * Scans the entire DOM for all content blocks as soon as the page is loaded. It tracks an impression
   * only if a content block is actually visible. Meaning it is not hidden and the content is or was at
   * some point in the viewport.
   *
   * If you want to track all content blocks have a look at `trackAllContentImpressions()`.
   * We do not track an impression of the same content block twice if you call this method multiple times
   * unless `trackPageView()` is called meanwhile. This is useful for single page applications.
   *
   * Once you have called this method you can no longer change `checkOnScroll` or `timeIntervalInMs`.
   *
   * If you do want to only track visible content blocks but not want us to perform any automatic checks
   * as they can slow down your frames per second you can call `trackVisibleContentImpressions()` or
   * `trackContentImpressionsWithinNode()` manually at  any time to rescan the entire DOM for newly
   * visible content blocks.
   * o Call `trackVisibleContentImpressions(false, 0)` to initially track only visible content impressions
   * o Call `trackVisibleContentImpressions()` at any time again to rescan the entire DOM for newly visible content blocks or
   * o Call `trackContentImpressionsWithinNode(node)` at any time to rescan only a part of the DOM for newly visible content blocks
   *
   * @param boolean [checkOnScroll=true] Optional, you can disable rescanning the entire DOM automatically
   *                                     after each scroll event by passing the value `false`. If enabled,
   *                                     we check whether a previously hidden content blocks became visible
   *                                     after a scroll and if so track the impression.
   *                                     Note: If a content block is placed within a scrollable element
   *                                     (`overflow: scroll`), we can currently not detect when this block
   *                                     becomes visible.
   * @param integer [timeIntervalInMs=750] Optional, you can define an interval to rescan the entire DOM
   *                                     for new impressions every X milliseconds by passing
   *                                     for instance `timeIntervalInMs=500` (rescan DOM every 500ms).
   *                                     Rescanning the entire DOM and detecting the visible state of content
   *                                     blocks can take a while depending on the browser and amount of content.
   *                                     In case your frames per second goes down you might want to increase
   *                                     this value or disable it by passing the value `0`.
   */
  this.trackVisibleContentImpressions = function (
    checkOnScroll,
    timeIntervalInMs
  ) {
    if (isOverlaySession(configTrackerSiteId)) {
      return;
    }

    if (!isDefined(checkOnScroll)) {
      checkOnScroll = true;
    }

    if (!isDefined(timeIntervalInMs)) {
      timeIntervalInMs = 750;
    }

    enableTrackOnlyVisibleContent(checkOnScroll, timeIntervalInMs, this);

    trackCallback(function () {
      trackCallbackOnLoad(function () {
        // we have to wait till CSS parsed and applied
        var contentNodes = content.findContentNodes();
        var requests = getCurrentlyVisibleContentImpressionsRequestsIfNotTrackedYet(
          contentNodes
        );

        sendBulkRequest(requests, configTrackerPause);
      });
    });
  };

  /**
   * Tracks a content impression using the specified values. You should not call this method too often
   * as each call causes an XHR tracking request and can slow down your site or your server.
   *
   * @param string contentName  For instance "Ad Sale".
   * @param string [contentPiece='Unknown'] For instance a path to an image or the text of a text ad.
   * @param string [contentTarget] For instance the URL of a landing page.
   */
  this.trackContentImpression = function (
    contentName,
    contentPiece,
    contentTarget
  ) {
    if (isOverlaySession(configTrackerSiteId)) {
      return;
    }

    contentName = trim(contentName);
    contentPiece = trim(contentPiece);
    contentTarget = trim(contentTarget);

    if (!contentName) {
      return;
    }

    contentPiece = contentPiece || "Unknown";

    trackCallback(function () {
      var request = buildContentImpressionRequest(
        contentName,
        contentPiece,
        contentTarget
      );
      sendRequest(request, configTrackerPause);
    });
  };

  /**
   * Scans the given DOM node and its children for content blocks and tracks an impression for them if
   * no impression was already tracked for it. If you have called `trackVisibleContentImpressions()`
   * upfront only visible content blocks will be tracked. You can use this method if you, for instance,
   * dynamically add an element using JavaScript to your DOM after we have tracked the initial impressions.
   *
   * @param Element domNode
   */
  this.trackContentImpressionsWithinNode = function (domNode) {
    if (isOverlaySession(configTrackerSiteId) || !domNode) {
      return;
    }

    trackCallback(function () {
      if (isTrackOnlyVisibleContentEnabled) {
        trackCallbackOnLoad(function () {
          // we have to wait till CSS parsed and applied
          var contentNodes = content.findContentNodesWithinNode(domNode);

          var requests = getCurrentlyVisibleContentImpressionsRequestsIfNotTrackedYet(
            contentNodes
          );
          sendBulkRequest(requests, configTrackerPause);
        });
      } else {
        trackCallbackOnReady(function () {
          // we have to wait till DOM ready
          var contentNodes = content.findContentNodesWithinNode(domNode);

          var requests = getContentImpressionsRequestsFromNodes(contentNodes);
          sendBulkRequest(requests, configTrackerPause);
        });
      }
    });
  };

  /**
   * Tracks a content interaction using the specified values. You should use this method only in conjunction
   * with `trackContentImpression()`. The specified `contentName` and `contentPiece` has to be exactly the
   * same as the ones that were used in `trackContentImpression()`. Otherwise the interaction will not count.
   *
   * @param string contentInteraction The type of interaction that happened. For instance 'click' or 'submit'.
   * @param string contentName  The name of the content. For instance "Ad Sale".
   * @param string [contentPiece='Unknown'] The actual content. For instance a path to an image or the text of a text ad.
   * @param string [contentTarget] For instance the URL of a landing page.
   */
  this.trackContentInteraction = function (
    contentInteraction,
    contentName,
    contentPiece,
    contentTarget
  ) {
    if (isOverlaySession(configTrackerSiteId)) {
      return;
    }

    contentInteraction = trim(contentInteraction);
    contentName = trim(contentName);
    contentPiece = trim(contentPiece);
    contentTarget = trim(contentTarget);

    if (!contentInteraction || !contentName) {
      return;
    }

    contentPiece = contentPiece || "Unknown";

    trackCallback(function () {
      var request = buildContentInteractionRequest(
        contentInteraction,
        contentName,
        contentPiece,
        contentTarget
      );
      sendRequest(request, configTrackerPause);
    });
  };

  /**
   * Tracks an interaction with the given DOM node / content block.
   *
   * By default we track interactions on click but sometimes you might want to track interactions yourself.
   * For instance you might want to track an interaction manually on a double click or a form submit.
   * Make sure to disable the automatic interaction tracking in this case by specifying either the CSS
   * class `piwikContentIgnoreInteraction` or the attribute `data-content-ignoreinteraction`.
   *
   * @param Element domNode  This element itself or any of its parent elements has to be a content block
   *                         element. Meaning one of those has to have a `piwikTrackContent` CSS class or
   *                         a `data-track-content` attribute.
   * @param string [contentInteraction='Unknown] The name of the interaction that happened. For instance
   *                                             'click', 'formSubmit', 'DblClick', ...
   */
  this.trackContentInteractionNode = function (domNode, contentInteraction) {
    if (isOverlaySession(configTrackerSiteId) || !domNode) {
      return;
    }

    trackCallback(function () {
      var request = buildContentInteractionRequestNode(
        domNode,
        contentInteraction
      );
      sendRequest(request, configTrackerPause);
    });
  };

  /**
   * Useful to debug content tracking. This method will log all detected content blocks to console
   * (if the browser supports the console). It will list the detected name, piece, and target of each
   * content block.
   */
  this.logAllContentBlocksOnPage = function () {
    var contentNodes = content.findContentNodes();
    var contents = content.collectContent(contentNodes);

    // needed to write it this way for jslint
    var consoleType = typeof console;
    if (consoleType !== "undefined" && console && console.log) {
      console.log(contents);
    }
  };

  /**
   * Records an event
   *
   * @param string category The Event Category (Videos, Music, Games...)
   * @param string action The Event's Action (Play, Pause, Duration, Add Playlist, Downloaded, Clicked...)
   * @param string name (optional) The Event's object Name (a particular Movie name, or Song name, or File name...)
   * @param float value (optional) The Event's value
   * @param function callback
   * @param mixed customData
   */
  this.trackEvent = function (
    category,
    action,
    name,
    value,
    customData,
    callback
  ) {
    trackCallback(function () {
      logEvent(category, action, name, value, customData, callback);
    });
  };

  /**
   * Log special pageview: Internal search
   *
   * @param string keyword
   * @param string category
   * @param int resultsCount
   * @param mixed customData
   */
  this.trackSiteSearch = function (keyword, category, resultsCount, customData) {
    trackCallback(function () {
      logSiteSearch(keyword, category, resultsCount, customData);
    });
  };

  /**
   * Used to record that the current page view is an item (product) page view, or a Ecommerce Category page view.
   * This must be called before trackPageView() on the product/category page.
   * It will set 3 custom variables of scope "page" with the SKU, Name and Category for this page view.
   * Note: Custom Variables of scope "page" slots 3, 4 and 5 will be used.
   *
   * On a category page, you can set the parameter category, and set the other parameters to empty string or false
   *
   * Tracking Product/Category page views will allow Piwik to report on Product & Categories
   * conversion rates (Conversion rate = Ecommerce orders containing this product or category / Visits to the product or category)
   *
   * @param string sku Item's SKU code being viewed
   * @param string name Item's Name being viewed
   * @param string category Category page being viewed. On an Item's page, this is the item's category
   * @param float price Item's display price, not use in standard Piwik reports, but output in API product reports.
   */
  this.setEcommerceView = function (sku, name, category, price) {
    if (!isDefined(category) || !category.length) {
      category = "";
    } else if (category instanceof Array) {
      category = JSON_PIWIK.stringify(category);
    }

    customVariablesPage[5] = ["_pkc", category];

    if (isDefined(price) && String(price).length) {
      customVariablesPage[2] = ["_pkp", price];
    }

    // On a category page, do not track Product name not defined
    if (
      (!isDefined(sku) || !sku.length) &&
      (!isDefined(name) || !name.length)
    ) {
      return;
    }

    if (isDefined(sku) && sku.length) {
      customVariablesPage[3] = ["_pks", sku];
    }

    if (!isDefined(name) || !name.length) {
      name = "";
    }

    customVariablesPage[4] = ["_pkn", name];
  };

  /**
   * Adds an item (product) that is in the current Cart or in the Ecommerce order.
   * This function is called for every item (product) in the Cart or the Order.
   * The only required parameter is sku.
   * The items are deleted from this JavaScript object when the Ecommerce order is tracked via the method trackEcommerceOrder.
   *
   * If there is already a saved item for the given sku, it will be updated with the
   * new information.
   *
   * @param string sku (required) Item's SKU Code. This is the unique identifier for the product.
   * @param string name (optional) Item's name
   * @param string name (optional) Item's category, or array of up to 5 categories
   * @param float price (optional) Item's price. If not specified, will default to 0
   * @param float quantity (optional) Item's quantity. If not specified, will default to 1
   */
  this.addEcommerceItem = function (sku, name, category, price, quantity) {
    if (sku.length) {
      ecommerceItems[sku] = [sku, name, category, price, quantity];
    }
  };

  /**
   * Removes a single ecommerce item by SKU from the current cart.
   *
   * @param string sku (required) Item's SKU Code. This is the unique identifier for the product.
   */
  this.removeEcommerceItem = function (sku) {
    if (sku.length) {
      delete ecommerceItems[sku];
    }
  };

  /**
   * Clears the current cart, removing all saved ecommerce items. Call this method to manually clear
   * the cart before sending an ecommerce order.
   */
  this.clearEcommerceCart = function () {
    ecommerceItems = {};
  };

  /**
   * Tracks an Ecommerce order.
   * If the Ecommerce order contains items (products), you must call first the addEcommerceItem() for each item in the order.
   * All revenues (grandTotal, subTotal, tax, shipping, discount) will be individually summed and reported in Piwik reports.
   * Parameters orderId and grandTotal are required. For others, you can set to false if you don't need to specify them.
   * After calling this method, items added to the cart will be removed from this JavaScript object.
   *
   * @param string|int orderId (required) Unique Order ID.
   *                   This will be used to count this order only once in the event the order page is reloaded several times.
   *                   orderId must be unique for each transaction, even on different days, or the transaction will not be recorded by Piwik.
   * @param float grandTotal (required) Grand Total revenue of the transaction (including tax, shipping, etc.)
   * @param float subTotal (optional) Sub total amount, typically the sum of items prices for all items in this order (before Tax and Shipping costs are applied)
   * @param float tax (optional) Tax amount for this order
   * @param float shipping (optional) Shipping amount for this order
   * @param float discount (optional) Discounted amount in this order
   */
  this.trackEcommerceOrder = function (
    orderId,
    grandTotal,
    subTotal,
    tax,
    shipping,
    discount
  ) {
    logEcommerceOrder(orderId, grandTotal, subTotal, tax, shipping, discount);
  };

  /**
   * Tracks a Cart Update (add item, remove item, update item).
   * On every Cart update, you must call addEcommerceItem() for each item (product) in the cart, including the items that haven't been updated since the last cart update.
   * Then you can call this function with the Cart grandTotal (typically the sum of all items' prices)
   * Calling this method does not remove from this JavaScript object the items that were added to the cart via addEcommerceItem
   *
   * @param float grandTotal (required) Items (products) amount in the Cart
   */
  this.trackEcommerceCartUpdate = function (grandTotal) {
    logEcommerceCartUpdate(grandTotal);
  };

  /**
   * Sends a tracking request with custom request parameters.
   * Piwik will prepend the hostname and path to Piwik, as well as all other needed tracking request
   * parameters prior to sending the request. Useful eg if you track custom dimensions via a plugin.
   *
   * @param request eg. "param=value&param2=value2"
   * @param customData
   * @param callback
   * @param pluginMethod
   */
  this.trackRequest = function (request, customData, callback, pluginMethod) {
    trackCallback(function () {
      var fullRequest = getRequest(request, customData, pluginMethod);
      sendRequest(fullRequest, configTrackerPause, callback);
    });
  };

  /**
   * If the user has given consent previously and this consent was remembered, it will return the number
   * in milliseconds since 1970/01/01 which is the date when the user has given consent. Please note that
   * the returned time depends on the users local time which may not always be correct.
   *
   * @returns number|string
   */
  this.getRememberedConsent = function () {
    var value = getCookie(CONSENT_COOKIE_NAME);
    if (getCookie(CONSENT_REMOVED_COOKIE_NAME)) {
      // if for some reason the consent_removed cookie is also set with the consent cookie, the
      // consent_removed cookie overrides the consent one, and we make sure to delete the consent
      // cookie.
      if (value) {
        deleteCookie(CONSENT_COOKIE_NAME, configCookiePath, configCookieDomain);
      }
      return null;
    }

    if (!value || value === 0) {
      return null;
    }
    return value;
  };

  /**
   * Detects whether the user has given consent previously.
   *
   * @returns bool
   */
  this.hasRememberedConsent = function () {
    return !!this.getRememberedConsent();
  };

  /**
   * When called, no tracking request will be sent to the Matomo server until you have called `setConsentGiven()`
   * unless consent was given previously AND you called {@link rememberConsentGiven()} when the user gave her
   * or his consent.
   *
   * This may be useful when you want to implement for example a popup to ask for consent before tracking the user.
   * Once the user has given consent, you should call {@link setConsentGiven()} or {@link rememberConsentGiven()}.
   *
   * Please note that when consent is required, we will temporarily set cookies but not track any data. Those
   * cookies will only exist during this page view and deleted as soon as the user navigates to a different page
   * or closes the browser.
   *
   * If you require consent for tracking personal data for example, you should first call
   * `_paq.push(['requireConsent'])`.
   *
   * If the user has already given consent in the past, you can either decide to not call `requireConsent` at all
   * or call `_paq.push(['setConsentGiven'])` on each page view at any time after calling `requireConsent`.
   *
   * When the user gives you the consent to track data, you can also call `_paq.push(['rememberConsentGiven', optionalTimeoutInHours])`
   * and for the duration while the consent is remembered, any call to `requireConsent` will be automatically ignored until you call `forgetConsentGiven`.
   * `forgetConsentGiven` needs to be called when the user removes consent for tracking. This means if you call `rememberConsentGiven` at the
   * time the user gives you consent, you do not need to ever call `_paq.push(['setConsentGiven'])`.
   */
  this.requireConsent = function () {
    configConsentRequired = true;
    configHasConsent = this.hasRememberedConsent();
    // Piwik.addPlugin might not be defined at this point, we add the plugin directly also to make JSLint happy
    // We also want to make sure to define an unload listener for each tracker, not only one tracker.
    coreConsentCounter++;
    plugins["CoreConsent" + coreConsentCounter] = {
      unload: function () {
        if (!configHasConsent) {
          // we want to make sure to remove all previously set cookies again
          deleteCookies();
        }
      }
    };
  };

  /**
   * Call this method once the user has given consent. This will cause all tracking requests from this
   * page view to be sent. Please note that the given consent won't be remembered across page views. If you
   * want to remember consent across page views, call {@link rememberConsentGiven()} instead.
   */
  this.setConsentGiven = function () {
    configHasConsent = true;
    deleteCookie(
      CONSENT_REMOVED_COOKIE_NAME,
      configCookiePath,
      configCookieDomain
    );
    var i, requestType;
    for (i = 0; i < consentRequestsQueue.length; i++) {
      requestType = typeof consentRequestsQueue[i];
      if (requestType === "string") {
        sendRequest(consentRequestsQueue[i], configTrackerPause);
      } else if (requestType === "object") {
        sendBulkRequest(consentRequestsQueue[i], configTrackerPause);
      }
    }
    consentRequestsQueue = [];
  };

  /**
   * Calling this method will remember that the user has given consent across multiple requests by setting
   * a cookie. You can optionally define the lifetime of that cookie in milliseconds using a parameter.
   *
   * When you call this method, we imply that the user has given consent for this page view, and will also
   * imply consent for all future page views unless the cookie expires (if timeout defined) or the user
   * deletes all her or his cookies. This means even if you call {@link requireConsent()}, then all requests
   * will still be tracked.
   *
   * Please note that this feature requires you to set the `cookieDomain` and `cookiePath` correctly and requires
   * that you do not disable cookies. Please also note that when you call this method, consent will be implied
   * for all sites that match the configured cookieDomain and cookiePath. Depending on your website structure,
   * you may need to restrict or widen the scope of the cookie domain/path to ensure the consent is applied
   * to the sites you want.
   */
  this.rememberConsentGiven = function (hoursToExpire) {
    if (configCookiesDisabled) {
      logConsoleError(
        "rememberConsentGiven is called but cookies are disabled, consent will not be remembered"
      );
      return;
    }
    if (hoursToExpire) {
      hoursToExpire = hoursToExpire * 60 * 60 * 1000;
    }
    this.setConsentGiven();
    var now = new Date().getTime();
    setCookie(
      CONSENT_COOKIE_NAME,
      now,
      hoursToExpire,
      configCookiePath,
      configCookieDomain,
      configCookieIsSecure
    );
  };

  /**
   * Calling this method will remove any previously given consent and during this page view no request
   * will be sent anymore ({@link requireConsent()}) will be called automatically to ensure the removed
   * consent will be enforced. You may call this method if the user removes consent manually, or if you
   * want to re-ask for consent after a specific time period.
   */
  this.forgetConsentGiven = function () {
    if (configCookiesDisabled) {
      logConsoleError(
        "forgetConsentGiven is called but cookies are disabled, consent will not be forgotten"
      );
      return;
    }

    deleteCookie(CONSENT_COOKIE_NAME, configCookiePath, configCookieDomain);
    setCookie(
      CONSENT_REMOVED_COOKIE_NAME,
      new Date().getTime(),
      0,
      configCookiePath,
      configCookieDomain,
      configCookieIsSecure
    );
    this.requireConsent();
  };

  /**
   * Returns true if user is opted out, false if otherwise.
   *
   * @returns {boolean}
   */
  this.isUserOptedOut = function () {
    return !configHasConsent;
  };

  /**
   * Alias for forgetConsentGiven(). After calling this function, the user will no longer be tracked,
   * (even if they come back to the site).
   */
  this.optUserOut = this.forgetConsentGiven;

  /**
   * Alias for rememberConsentGiven(). After calling this function, the current user will be tracked.
   */
  this.forgetUserOptOut = this.rememberConsentGiven;

  Piwik.trigger("TrackerSetup", [this]);
}