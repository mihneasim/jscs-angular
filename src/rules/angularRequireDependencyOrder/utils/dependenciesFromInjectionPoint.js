'use strict';

var clone = require('clone');

/**
Parses out dependency instances for both array syntax and for function syntax.

It will return a list of instances like:

```json
[{
  name: '$q',
  loc: {} // SourceLocation object
}, {
  name: 'customDep',
  loc: {} // SourceLocation object
}]
```

@param {ArrayExpression|FunctionExpression} expression - An expression that takes some
      dependencies (http://bit.ly/1MsS4Rz)
@returns {Array<Object>} - A list of dependencies
*/
module.exports = function(expression) {
  // Extract from function expression
  if (expression.type === 'FunctionExpression') {
    return expression.params.map(function(param) {
      return {
        loc: clone(param.loc, false),
        name: param.name
      };
    });
  }

  // Extract from array expression
  if (expression.type === 'ArrayExpression') {
    var params = [];
    var elements = expression.elements.slice();
    while (elements.length > 1) {
      var element = elements.shift();
      if (element.type !== 'Literal') { return; }

      var loc = clone(element.loc, false);
      loc.start.column++;
      params.push({
        loc: loc,
        name: element.value
      });
    }

    // Verify that last element in array is a function
    if (elements.shift().type === 'FunctionExpression') {
      return params;
    }
  }
};
