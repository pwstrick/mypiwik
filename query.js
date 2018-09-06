/************************************************************
 * Query DOM节点操作
 ************************************************************/

var query = {
  htmlCollectionToArray: function(foundNodes) {
    var nodes = [],
      index;

    if (!foundNodes || !foundNodes.length) {
      return nodes;
    }

    for (index = 0; index < foundNodes.length; index++) {
      nodes.push(foundNodes[index]);
    }

    return nodes;
  },
  find: function(selector) {
    // we use querySelectorAll only on document, not on nodes because of its unexpected behavior. See for
    // instance http://stackoverflow.com/questions/11503534/jquery-vs-document-queryselectorall and
    // http://jsfiddle.net/QdMc5/ and http://ejohn.org/blog/thoughts-on-queryselectorall
    if (!document.querySelectorAll || !selector) {
      return []; // we do not support all browsers
    }

    var foundNodes = document.querySelectorAll(selector);

    return this.htmlCollectionToArray(foundNodes);
  },
  findMultiple: function(selectors) {
    if (!selectors || !selectors.length) {
      return [];
    }

    var index, foundNodes;
    var nodes = [];
    for (index = 0; index < selectors.length; index++) {
      foundNodes = this.find(selectors[index]);
      nodes = nodes.concat(foundNodes);
    }

    nodes = this.makeNodesUnique(nodes);

    return nodes;
  },
  findNodesByTagName: function(node, tagName) {
    if (!node || !tagName || !node.getElementsByTagName) {
      return [];
    }

    var foundNodes = node.getElementsByTagName(tagName);

    return this.htmlCollectionToArray(foundNodes);
  },
  makeNodesUnique: function(nodes) {
    var copy = [].concat(nodes);
    nodes.sort(function(n1, n2) {
      if (n1 === n2) {
        return 0;
      }

      var index1 = indexOfArray(copy, n1);
      var index2 = indexOfArray(copy, n2);

      if (index1 === index2) {
        return 0;
      }

      return index1 > index2 ? -1 : 1;
    });

    if (nodes.length <= 1) {
      return nodes;
    }

    var index = 0;
    var numDuplicates = 0;
    var duplicates = [];
    var node;

    node = nodes[index++];

    while (node) {
      if (node === nodes[index]) {
        numDuplicates = duplicates.push(index);
      }

      node = nodes[index++] || null;
    }

    while (numDuplicates--) {
      nodes.splice(duplicates[numDuplicates], 1);
    }

    return nodes;
  },
  getAttributeValueFromNode: function(node, attributeName) {
    if (!this.hasNodeAttribute(node, attributeName)) {
      return;
    }

    if (node && node.getAttribute) {
      return node.getAttribute(attributeName);
    }

    if (!node || !node.attributes) {
      return;
    }

    var typeOfAttr = typeof node.attributes[attributeName];
    if ("undefined" === typeOfAttr) {
      return;
    }

    if (node.attributes[attributeName].value) {
      return node.attributes[attributeName].value; // nodeValue is deprecated ie Chrome
    }

    if (node.attributes[attributeName].nodeValue) {
      return node.attributes[attributeName].nodeValue;
    }

    var index;
    var attrs = node.attributes;

    if (!attrs) {
      return;
    }

    for (index = 0; index < attrs.length; index++) {
      if (attrs[index].nodeName === attributeName) {
        return attrs[index].nodeValue;
      }
    }

    return null;
  },
  hasNodeAttributeWithValue: function(node, attributeName) {
    var value = this.getAttributeValueFromNode(node, attributeName);

    return !!value;
  },
  hasNodeAttribute: function(node, attributeName) {
    if (node && node.hasAttribute) {
      return node.hasAttribute(attributeName);
    }

    if (node && node.attributes) {
      var typeOfAttr = typeof node.attributes[attributeName];
      return "undefined" !== typeOfAttr;
    }

    return false;
  },
  hasNodeCssClass: function(node, klassName) {
    if (node && klassName && node.className) {
      var classes =
        typeof node.className === "string" ? node.className.split(" ") : [];
      if (-1 !== indexOfArray(classes, klassName)) {
        return true;
      }
    }

    return false;
  },
  findNodesHavingAttribute: function(nodeToSearch, attributeName, nodes) {
    if (!nodes) {
      nodes = [];
    }

    if (!nodeToSearch || !attributeName) {
      return nodes;
    }

    var children = getChildrenFromNode(nodeToSearch);

    if (!children || !children.length) {
      return nodes;
    }

    var index, child;
    for (index = 0; index < children.length; index++) {
      child = children[index];
      if (this.hasNodeAttribute(child, attributeName)) {
        nodes.push(child);
      }

      nodes = this.findNodesHavingAttribute(child, attributeName, nodes);
    }

    return nodes;
  },
  findFirstNodeHavingAttribute: function(node, attributeName) {
    if (!node || !attributeName) {
      return;
    }

    if (this.hasNodeAttribute(node, attributeName)) {
      return node;
    }

    var nodes = this.findNodesHavingAttribute(node, attributeName);

    if (nodes && nodes.length) {
      return nodes[0];
    }
  },
  findFirstNodeHavingAttributeWithValue: function(node, attributeName) {
    if (!node || !attributeName) {
      return;
    }

    if (this.hasNodeAttributeWithValue(node, attributeName)) {
      return node;
    }

    var nodes = this.findNodesHavingAttribute(node, attributeName);

    if (!nodes || !nodes.length) {
      return;
    }

    var index;
    for (index = 0; index < nodes.length; index++) {
      if (this.getAttributeValueFromNode(nodes[index], attributeName)) {
        return nodes[index];
      }
    }
  },
  findNodesHavingCssClass: function(nodeToSearch, className, nodes) {
    if (!nodes) {
      nodes = [];
    }

    if (!nodeToSearch || !className) {
      return nodes;
    }

    if (nodeToSearch.getElementsByClassName) {
      var foundNodes = nodeToSearch.getElementsByClassName(className);
      return this.htmlCollectionToArray(foundNodes);
    }

    var children = getChildrenFromNode(nodeToSearch);

    if (!children || !children.length) {
      return [];
    }

    var index, child;
    for (index = 0; index < children.length; index++) {
      child = children[index];
      if (this.hasNodeCssClass(child, className)) {
        nodes.push(child);
      }

      nodes = this.findNodesHavingCssClass(child, className, nodes);
    }

    return nodes;
  },
  findFirstNodeHavingClass: function(node, className) {
    if (!node || !className) {
      return;
    }

    if (this.hasNodeCssClass(node, className)) {
      return node;
    }

    var nodes = this.findNodesHavingCssClass(node, className);

    if (nodes && nodes.length) {
      return nodes[0];
    }
  },
  isLinkElement: function(node) {
    if (!node) {
      return false;
    }

    var elementName = String(node.nodeName).toLowerCase();
    var linkElementNames = ["a", "area"];
    var pos = indexOfArray(linkElementNames, elementName);

    return pos !== -1;
  },
  setAnyAttribute: function(node, attrName, attrValue) {
    if (!node || !attrName) {
      return;
    }

    if (node.setAttribute) {
      node.setAttribute(attrName, attrValue);
    } else {
      node[attrName] = attrValue;
    }
  }
};
