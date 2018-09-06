/************************************************************
 * Content Tracking 内容追踪，URL拼接修改
 ************************************************************/
var content = {
  CONTENT_ATTR: "data-track-content",
  CONTENT_CLASS: "piwikTrackContent",
  CONTENT_NAME_ATTR: "data-content-name",
  CONTENT_PIECE_ATTR: "data-content-piece",
  CONTENT_PIECE_CLASS: "piwikContentPiece",
  CONTENT_TARGET_ATTR: "data-content-target",
  CONTENT_TARGET_CLASS: "piwikContentTarget",
  CONTENT_IGNOREINTERACTION_ATTR: "data-content-ignoreinteraction",
  CONTENT_IGNOREINTERACTION_CLASS: "piwikContentIgnoreInteraction",
  location: undefined,

  findContentNodes: function () {
      var cssSelector = "." + this.CONTENT_CLASS;
      var attrSelector = "[" + this.CONTENT_ATTR + "]";
      var contentNodes = query.findMultiple([cssSelector, attrSelector]);

      return contentNodes;
    },
    findContentNodesWithinNode: function (node) {
      if (!node) {
        return [];
      }

      // NOTE: we do not use query.findMultiple here as querySelectorAll would most likely not deliver the result we want

      var nodes1 = query.findNodesHavingCssClass(node, this.CONTENT_CLASS);
      var nodes2 = query.findNodesHavingAttribute(node, this.CONTENT_ATTR);

      if (nodes2 && nodes2.length) {
        var index;
        for (index = 0; index < nodes2.length; index++) {
          nodes1.push(nodes2[index]);
        }
      }

      if (query.hasNodeAttribute(node, this.CONTENT_ATTR)) {
        nodes1.push(node);
      } else if (query.hasNodeCssClass(node, this.CONTENT_CLASS)) {
        nodes1.push(node);
      }

      nodes1 = query.makeNodesUnique(nodes1);

      return nodes1;
    },
    findParentContentNode: function (anyNode) {
      if (!anyNode) {
        return;
      }

      var node = anyNode;
      var counter = 0;

      while (node && node !== documentAlias && node.parentNode) {
        if (query.hasNodeAttribute(node, this.CONTENT_ATTR)) {
          return node;
        }
        if (query.hasNodeCssClass(node, this.CONTENT_CLASS)) {
          return node;
        }

        node = node.parentNode;

        if (counter > 1000) {
          break; // prevent loop, should not happen anyway but better we do this
        }
        counter++;
      }
    },
    findPieceNode: function (node) {
      var contentPiece;

      contentPiece = query.findFirstNodeHavingAttribute(
        node,
        this.CONTENT_PIECE_ATTR
      );

      if (!contentPiece) {
        contentPiece = query.findFirstNodeHavingClass(
          node,
          this.CONTENT_PIECE_CLASS
        );
      }

      if (contentPiece) {
        return contentPiece;
      }

      return node;
    },
    findTargetNodeNoDefault: function (node) {
      if (!node) {
        return;
      }

      var target = query.findFirstNodeHavingAttributeWithValue(
        node,
        this.CONTENT_TARGET_ATTR
      );
      if (target) {
        return target;
      }

      target = query.findFirstNodeHavingAttribute(node, this.CONTENT_TARGET_ATTR);
      if (target) {
        return target;
      }

      target = query.findFirstNodeHavingClass(node, this.CONTENT_TARGET_CLASS);
      if (target) {
        return target;
      }
    },
    findTargetNode: function (node) {
      var target = this.findTargetNodeNoDefault(node);
      if (target) {
        return target;
      }

      return node;
    },
    findContentName: function (node) {
      if (!node) {
        return;
      }

      var nameNode = query.findFirstNodeHavingAttributeWithValue(
        node,
        this.CONTENT_NAME_ATTR
      );

      if (nameNode) {
        return query.getAttributeValueFromNode(nameNode, this.CONTENT_NAME_ATTR);
      }

      var contentPiece = this.findContentPiece(node);
      if (contentPiece) {
        return this.removeDomainIfIsInLink(contentPiece);
      }

      if (query.hasNodeAttributeWithValue(node, "title")) {
        return query.getAttributeValueFromNode(node, "title");
      }

      var clickUrlNode = this.findPieceNode(node);

      if (query.hasNodeAttributeWithValue(clickUrlNode, "title")) {
        return query.getAttributeValueFromNode(clickUrlNode, "title");
      }

      var targetNode = this.findTargetNode(node);

      if (query.hasNodeAttributeWithValue(targetNode, "title")) {
        return query.getAttributeValueFromNode(targetNode, "title");
      }
    },
    findContentPiece: function (node) {
      if (!node) {
        return;
      }

      var nameNode = query.findFirstNodeHavingAttributeWithValue(
        node,
        this.CONTENT_PIECE_ATTR
      );

      if (nameNode) {
        return query.getAttributeValueFromNode(nameNode, this.CONTENT_PIECE_ATTR);
      }

      var contentNode = this.findPieceNode(node);

      var media = this.findMediaUrlInNode(contentNode);
      if (media) {
        return this.toAbsoluteUrl(media);
      }
    },
    findContentTarget: function (node) {
      if (!node) {
        return;
      }

      var targetNode = this.findTargetNode(node);

      if (query.hasNodeAttributeWithValue(targetNode, this.CONTENT_TARGET_ATTR)) {
        return query.getAttributeValueFromNode(
          targetNode,
          this.CONTENT_TARGET_ATTR
        );
      }

      var href;
      if (query.hasNodeAttributeWithValue(targetNode, "href")) {
        href = query.getAttributeValueFromNode(targetNode, "href");
        return this.toAbsoluteUrl(href);
      }

      var contentNode = this.findPieceNode(node);

      if (query.hasNodeAttributeWithValue(contentNode, "href")) {
        href = query.getAttributeValueFromNode(contentNode, "href");
        return this.toAbsoluteUrl(href);
      }
    },
    isSameDomain: function (url) {
      if (!url || !url.indexOf) {
        return false;
      }

      if (0 === url.indexOf(this.getLocation().origin)) {
        return true;
      }

      var posHost = url.indexOf(this.getLocation().host);
      if (8 >= posHost && 0 <= posHost) {
        return true;
      }

      return false;
    },
    removeDomainIfIsInLink: function (text) {
      // we will only remove if domain === location.origin meaning is not an outlink
      var regexContainsProtocol = "^https?://[^/]+";
      var regexReplaceDomain = "^.*//[^/]+";

      if (
        text &&
        text.search &&
        -1 !== text.search(new RegExp(regexContainsProtocol)) &&
        this.isSameDomain(text)
      ) {
        text = text.replace(new RegExp(regexReplaceDomain), "");
        if (!text) {
          text = "/";
        }
      }

      return text;
    },
    findMediaUrlInNode: function (node) {
      if (!node) {
        return;
      }

      var mediaElements = ["img", "embed", "video", "audio"];
      var elementName = node.nodeName.toLowerCase();

      if (-1 !== indexOfArray(mediaElements, elementName) &&
        query.findFirstNodeHavingAttributeWithValue(node, "src")
      ) {
        var sourceNode = query.findFirstNodeHavingAttributeWithValue(node, "src");

        return query.getAttributeValueFromNode(sourceNode, "src");
      }

      if (
        elementName === "object" &&
        query.hasNodeAttributeWithValue(node, "data")
      ) {
        return query.getAttributeValueFromNode(node, "data");
      }

      if (elementName === "object") {
        var params = query.findNodesByTagName(node, "param");
        if (params && params.length) {
          var index;
          for (index = 0; index < params.length; index++) {
            if (
              "movie" ===
              query.getAttributeValueFromNode(params[index], "name") &&
              query.hasNodeAttributeWithValue(params[index], "value")
            ) {
              return query.getAttributeValueFromNode(params[index], "value");
            }
          }
        }

        var embed = query.findNodesByTagName(node, "embed");
        if (embed && embed.length) {
          return this.findMediaUrlInNode(embed[0]);
        }
      }
    },
    trim: function (text) {
      return trim(text);
    },
    isOrWasNodeInViewport: function (node) {
      if (!node || !node.getBoundingClientRect || node.nodeType !== 1) {
        return true;
      }

      var rect = node.getBoundingClientRect();
      var html = documentAlias.documentElement || {};

      var wasVisible = rect.top < 0;
      if (wasVisible && node.offsetTop) {
        wasVisible = node.offsetTop + rect.height > 0;
      }

      var docWidth = html.clientWidth; // The clientWidth attribute returns the viewport width excluding the size of a rendered scroll bar

      if (windowAlias.innerWidth && docWidth > windowAlias.innerWidth) {
        docWidth = windowAlias.innerWidth; // The innerWidth attribute must return the viewport width including the size of a rendered scroll bar
      }

      var docHeight = html.clientHeight; // The clientWidth attribute returns the viewport width excluding the size of a rendered scroll bar

      if (windowAlias.innerHeight && docHeight > windowAlias.innerHeight) {
        docHeight = windowAlias.innerHeight; // The innerWidth attribute must return the viewport width including the size of a rendered scroll bar
      }

      return (
        (rect.bottom > 0 || wasVisible) &&
        rect.right > 0 &&
        rect.left < docWidth &&
        (rect.top < docHeight || wasVisible) // rect.top < 0 we assume user has seen all the ones that are above the current viewport
      );
    },
    isNodeVisible: function (node) {
      var isItVisible = isVisible(node);
      var isInViewport = this.isOrWasNodeInViewport(node);
      return isItVisible && isInViewport;
    },
	//构建交互请求参数
    buildInteractionRequestParams: function (interaction, name, piece, target) {
      var params = "";

      if (interaction) {
        params += "c_i=" + encodeWrapper(interaction);
      }
      if (name) {
        if (params) {
          params += "&";
        }
        params += "c_n=" + encodeWrapper(name);
      }
      if (piece) {
        if (params) {
          params += "&";
        }
        params += "c_p=" + encodeWrapper(piece);
      }
      if (target) {
        if (params) {
          params += "&";
        }
        params += "c_t=" + encodeWrapper(target);
      }

      return params;
    },
	//构建印象请求参数
    buildImpressionRequestParams: function (name, piece, target) {
      var params = "c_n=" + encodeWrapper(name) + "&c_p=" + encodeWrapper(piece);

      if (target) {
        params += "&c_t=" + encodeWrapper(target);
      }

      return params;
    },
    buildContentBlock: function (node) {
      if (!node) {
        return;
      }

      var name = this.findContentName(node);
      var piece = this.findContentPiece(node);
      var target = this.findContentTarget(node);

      name = this.trim(name);
      piece = this.trim(piece);
      target = this.trim(target);

      return {
        name: name || "Unknown",
        piece: piece || "Unknown",
        target: target || ""
      };
    },
    collectContent: function (contentNodes) {
      if (!contentNodes || !contentNodes.length) {
        return [];
      }

      var contents = [];

      var index, contentBlock;
      for (index = 0; index < contentNodes.length; index++) {
        contentBlock = this.buildContentBlock(contentNodes[index]);
        if (isDefined(contentBlock)) {
          contents.push(contentBlock);
        }
      }

      return contents;
    },
    setLocation: function (location) {
      this.location = location;
    },
    getLocation: function () {
      var locationAlias = this.location || windowAlias.location;

      if (!locationAlias.origin) {
        locationAlias.origin =
          locationAlias.protocol +
          "//" +
          locationAlias.hostname +
          (locationAlias.port ? ":" + locationAlias.port : "");
      }

      return locationAlias;
    },
    toAbsoluteUrl: function (url) {
      if ((!url || String(url) !== url) && url !== "") {
        // we only handle strings
        return url;
      }

      if ("" === url) {
        return this.getLocation().href;
      }

      // Eg //example.com/test.jpg
      if (url.search(/^\/\//) !== -1) {
        return this.getLocation().protocol + url;
      }

      // Eg http://example.com/test.jpg
      if (url.search(/:\/\//) !== -1) {
        return url;
      }

      // Eg #test.jpg
      if (0 === url.indexOf("#")) {
        return this.getLocation().origin + this.getLocation().pathname + url;
      }

      // Eg ?x=5
      if (0 === url.indexOf("?")) {
        return this.getLocation().origin + this.getLocation().pathname + url;
      }

      // Eg mailto:x@y.z tel:012345, ... market:... sms:..., javasript:... ecmascript: ... and many more
      if (0 === url.search("^[a-zA-Z]{2,11}:")) {
        return url;
      }

      // Eg /test.jpg
      if (url.search(/^\//) !== -1) {
        return this.getLocation().origin + url;
      }

      // Eg test.jpg
      var regexMatchDir = "(.*/)";
      var base =
        this.getLocation().origin +
        this.getLocation().pathname.match(new RegExp(regexMatchDir))[0];
      return base + url;
    },
    isUrlToCurrentDomain: function (url) {
      var absoluteUrl = this.toAbsoluteUrl(url);

      if (!absoluteUrl) {
        return false;
      }

      var origin = this.getLocation().origin;
      if (origin === absoluteUrl) {
        return true;
      }

      if (0 === String(absoluteUrl).indexOf(origin)) {
        if (":" === String(absoluteUrl).substr(origin.length, 1)) {
          return false; // url has port whereas origin has not => different URL
        }

        return true;
      }

      return false;
    },
    setHrefAttribute: function (node, url) {
      if (!node || !url) {
        return;
      }

      query.setAnyAttribute(node, "href", url);
    },
    shouldIgnoreInteraction: function (targetNode) {
      var hasAttr = query.hasNodeAttribute(
        targetNode,
        this.CONTENT_IGNOREINTERACTION_ATTR
      );
      var hasClass = query.hasNodeCssClass(
        targetNode,
        this.CONTENT_IGNOREINTERACTION_CLASS
      );
      return hasAttr || hasClass;
    }
};

/************************************************************
 * Page Overlay 页面嵌套
 ************************************************************/

function getPiwikUrlForOverlay(trackerUrl, apiUrl) {
  if (apiUrl) {
    return apiUrl;
  }

  trackerUrl = content.toAbsoluteUrl(trackerUrl);

  // if eg http://www.example.com/js/tracker.php?version=232323 => http://www.example.com/js/tracker.php
  if (stringContains(trackerUrl, "?")) {
    var posQuery = trackerUrl.indexOf("?");
    trackerUrl = trackerUrl.slice(0, posQuery);
  }

  if (stringEndsWith(trackerUrl, "piwik.php")) {
    // if eg without domain or path "piwik.php" => ''
    trackerUrl = removeCharactersFromEndOfString(
      trackerUrl,
      "piwik.php".length
    );
  } else if (stringEndsWith(trackerUrl, ".php")) {
    // if eg http://www.example.com/js/piwik.php => http://www.example.com/js/
    // or if eg http://www.example.com/tracker.php => http://www.example.com/
    var lastSlash = trackerUrl.lastIndexOf("/");
    var includeLastSlash = 1;
    trackerUrl = trackerUrl.slice(0, lastSlash + includeLastSlash);
  }

  // if eg http://www.example.com/js/ => http://www.example.com/ (when not minified Piwik JS loaded)
  if (stringEndsWith(trackerUrl, "/js/")) {
    trackerUrl = removeCharactersFromEndOfString(trackerUrl, "js/".length);
  }

  // http://www.example.com/
  return trackerUrl;
}

/*
 * Check whether this is a page overlay session
 *
 * @return boolean
 *
 * {@internal side-effect: modifies window.name }}
 */
function isOverlaySession(configTrackerSiteId) {
  var windowName = "Piwik_Overlay";

  // check whether we were redirected from the piwik overlay plugin
  var referrerRegExp = new RegExp(
    "index\\.php\\?module=Overlay&action=startOverlaySession" +
    "&idSite=([0-9]+)&period=([^&]+)&date=([^&]+)(&segment=.*)?$"
  );

  var match = referrerRegExp.exec(documentAlias.referrer);

  if (match) {
    // check idsite
    var idsite = match[1];

    if (idsite !== String(configTrackerSiteId)) {
      return false;
    }

    // store overlay session info in window name
    var period = match[2],
      date = match[3],
      segment = match[4];

    if (!segment) {
      segment = "";
    } else if (segment.indexOf("&segment=") === 0) {
      segment = segment.substr("&segment=".length);
    }

    windowAlias.name =
      windowName + "###" + period + "###" + date + "###" + segment;
  }

  // retrieve and check data from window name
  var windowNameParts = windowAlias.name.split("###");

  return windowNameParts.length === 4 && windowNameParts[0] === windowName;
}

/*
 * Inject the script needed for page overlay
 */
function injectOverlayScripts(
  configTrackerUrl,
  configApiUrl,
  configTrackerSiteId
) {
  var windowNameParts = windowAlias.name.split("###"),
    period = windowNameParts[1],
    date = windowNameParts[2],
    segment = windowNameParts[3],
    piwikUrl = getPiwikUrlForOverlay(configTrackerUrl, configApiUrl);

  loadScript(piwikUrl + "plugins/Overlay/client/client.js?v=1", function () {
    Piwik_Overlay_Client.initialize(
      piwikUrl,
      configTrackerSiteId,
      period,
      date,
      segment
    );
  });
}

function isInsideAnIframe() {
  var frameElement;

  try {
    // If the parent window has another origin, then accessing frameElement
    // throws an Error in IE. see issue #10105.
    frameElement = windowAlias.frameElement;
  } catch (e) {
    // When there was an Error, then we know we are inside an iframe.
    return true;
  }

  if (isDefined(frameElement)) {
    return frameElement &&
      String(frameElement.nodeName).toLowerCase() === "iframe" ? true : false;
  }

  try {
    return windowAlias.self !== windowAlias.top;
  } catch (e2) {
    return true;
  }
}

/************************************************************
 * End Page Overlay
 ************************************************************/