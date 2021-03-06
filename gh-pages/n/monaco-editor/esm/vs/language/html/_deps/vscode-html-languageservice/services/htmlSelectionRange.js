define('2c8eafa', function(require, exports, module) {

  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  /**
   * Until SelectionRange lands in LSP, we'll return Range from server and convert it to
   * SelectionRange on client side
   */
  var main_js_1 = require("b1903ef");
  var htmlScanner_js_1 = require("c2d9747");
  var htmlParser_js_1 = require("035e64a");
  var htmlLanguageTypes_js_1 = require("4ee499b");
  function getSelectionRanges(document, positions) {
      function getSelectionRange(position) {
          var applicableRanges = getApplicableRanges(document, position);
          var ranges = applicableRanges
              /**
               * Filter duplicated ranges
               */
              .filter(function (pair, i) {
              if (i === 0) {
                  return true;
              }
              var prev = applicableRanges[i - 1];
              if (pair[0] === prev[0] && pair[1] === prev[1]) {
                  return false;
              }
              return true;
          })
              .map(function (pair) {
              return {
                  range: main_js_1.Range.create(document.positionAt(pair[0]), document.positionAt(pair[1])),
                  kind: htmlLanguageTypes_js_1.SelectionRangeKind.Declaration
              };
          });
          return ranges;
      }
      return positions.map(getSelectionRange);
  }
  exports.getSelectionRanges = getSelectionRanges;
  function getApplicableRanges(document, position) {
      var htmlDoc = htmlParser_js_1.parse(document.getText());
      var currOffset = document.offsetAt(position);
      var currNode = htmlDoc.findNodeAt(currOffset);
      var result = getAllParentTagRanges(currNode);
      // Self-closing or void elements
      if (currNode.startTagEnd && !currNode.endTagStart) {
          var closeRange = main_js_1.Range.create(document.positionAt(currNode.startTagEnd - 2), document.positionAt(currNode.startTagEnd));
          var closeText = document.getText(closeRange);
          // Self-closing element
          if (closeText === '/>') {
              result.unshift([currNode.start + 1, currNode.startTagEnd - 2]);
          }
          // Void element
          else {
              result.unshift([currNode.start + 1, currNode.startTagEnd - 1]);
          }
          var attributeLevelRanges = getAttributeLevelRanges(document, currNode, currOffset);
          result = attributeLevelRanges.concat(result);
          return result;
      }
      if (!currNode.startTagEnd || !currNode.endTagStart) {
          return result;
      }
      /**
       * For html like
       * `<div class="foo">bar</div>`
       */
      result.unshift([currNode.start, currNode.end]);
      /**
       * Cursor inside `<div class="foo">`
       */
      if (currNode.start < currOffset && currOffset < currNode.startTagEnd) {
          result.unshift([currNode.start + 1, currNode.startTagEnd - 1]);
          var attributeLevelRanges = getAttributeLevelRanges(document, currNode, currOffset);
          result = attributeLevelRanges.concat(result);
          return result;
      }
      /**
       * Cursor inside `bar`
       */
      else if (currNode.startTagEnd <= currOffset && currOffset <= currNode.endTagStart) {
          result.unshift([currNode.startTagEnd, currNode.endTagStart]);
          return result;
      }
      /**
       * Cursor inside `</div>`
       */
      else {
          // `div` inside `</div>`
          if (currOffset >= currNode.endTagStart + 2) {
              result.unshift([currNode.endTagStart + 2, currNode.end - 1]);
          }
          return result;
      }
  }
  function getAllParentTagRanges(initialNode) {
      var currNode = initialNode;
      var getNodeRanges = function (n) {
          if (n.startTagEnd && n.endTagStart && n.startTagEnd < n.endTagStart) {
              return [
                  [n.startTagEnd, n.endTagStart],
                  [n.start, n.end]
              ];
          }
          return [
              [n.start, n.end]
          ];
      };
      var result = [];
      while (currNode.parent) {
          currNode = currNode.parent;
          getNodeRanges(currNode).forEach(function (r) { return result.push(r); });
      }
      return result;
  }
  function getAttributeLevelRanges(document, currNode, currOffset) {
      var currNodeRange = main_js_1.Range.create(document.positionAt(currNode.start), document.positionAt(currNode.end));
      var currNodeText = document.getText(currNodeRange);
      var relativeOffset = currOffset - currNode.start;
      /**
       * Tag level semantic selection
       */
      var scanner = htmlScanner_js_1.createScanner(currNodeText);
      var token = scanner.scan();
      /**
       * For text like
       * <div class="foo">bar</div>
       */
      var positionOffset = currNode.start;
      var result = [];
      var isInsideAttribute = false;
      var attrStart = -1;
      while (token !== htmlLanguageTypes_js_1.TokenType.EOS) {
          switch (token) {
              case htmlLanguageTypes_js_1.TokenType.AttributeName: {
                  if (relativeOffset < scanner.getTokenOffset()) {
                      isInsideAttribute = false;
                      break;
                  }
                  if (relativeOffset <= scanner.getTokenEnd()) {
                      // `class`
                      result.unshift([scanner.getTokenOffset(), scanner.getTokenEnd()]);
                  }
                  isInsideAttribute = true;
                  attrStart = scanner.getTokenOffset();
                  break;
              }
              case htmlLanguageTypes_js_1.TokenType.AttributeValue: {
                  if (!isInsideAttribute) {
                      break;
                  }
                  var valueText = scanner.getTokenText();
                  if (relativeOffset < scanner.getTokenOffset()) {
                      // `class="foo"`
                      result.push([attrStart, scanner.getTokenEnd()]);
                      break;
                  }
                  if (relativeOffset >= scanner.getTokenOffset() && relativeOffset <= scanner.getTokenEnd()) {
                      // `"foo"`
                      result.unshift([scanner.getTokenOffset(), scanner.getTokenEnd()]);
                      // `foo`
                      if ((valueText[0] === "\"" && valueText[valueText.length - 1] === "\"") || (valueText[0] === "'" && valueText[valueText.length - 1] === "'")) {
                          if (relativeOffset >= scanner.getTokenOffset() + 1 && relativeOffset <= scanner.getTokenEnd() - 1) {
                              result.unshift([scanner.getTokenOffset() + 1, scanner.getTokenEnd() - 1]);
                          }
                      }
                      // `class="foo"`
                      result.push([attrStart, scanner.getTokenEnd()]);
                  }
                  break;
              }
          }
          token = scanner.scan();
      }
      return result.map(function (pair) {
          return [pair[0] + positionOffset, pair[1] + positionOffset];
      });
  }
  //# sourceMappingURL=htmlSelectionRange.js.map
  

});
