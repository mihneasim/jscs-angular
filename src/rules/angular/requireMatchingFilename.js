'use strict';

var assert = require('assert');
var casing = require('change-case');
var format = require('util').format;
var spah   = require('spahql');
var path   = require('path');
var type   = require('type-of');

var docLink = require('../../doc-linker');

// API

exports.name      = 'requireMatchingFilename';
exports.check     = check;
exports.configure = configure;

// API functions

function check(file, errors) {
  file.iterateNodesByType(['ExpressionStatement'], function(expression) {
    var status = angularDefinitionName(expression);

    if (status && status.valid) {
      var fileName = path.basename(file.getFilename());

      if (fileName === 'input') { return; }

      var baseName = path.basename(fileName, '.js');

      validateNames(errors, status.name, baseName, fileName, status.position);
    }
  });
}

function configure(value) {
  validateOptions(value);

  option = value;
}

// Internals

var option;

function angularDefinitionName(node) {
  var data = spah.db(node);

  if (!data.assert('/type=="ExpressionStatement"')) { return false; }

  var expression = data.select('/expression');
  if (!expression.assert('/type=="CallExpression"')) { return false; }

  var allowed = '"controller", "service", "factory", "directive", "provider"';
  var query = '/callee[/type=="MemberExpression"]/property[/type=="Identifier"][/name }<{ {%s}]';
  if (!expression.assert(format(query, allowed))) { return false; }

  var nameset = expression.select('/arguments[/.size==2]/0[/type=="Literal"]');
  if (!nameset.length) { return false; }

  return {
    valid: true,
    name: nameset.value().value,
    position: nameset.value().loc.start
  };
}

function validateNames(errors, componentName, baseName, fileName, position) {
  if (option === true) {
    if (componentName !== baseName) {
      var msg = 'Defined name \'%s\' is not matching the filename \'%s\'';
      errors.add(format(msg, componentName, fileName), position);
    }
  } else if (type(option) === 'object') {
    var pair = invalidNamePair(option, componentName, baseName, fileName);
    if (pair) {
      addErrors(errors, [pair]);
    }
  } else if (type(option) === 'array') {
    var pairs = option.map(function(item) {
      return invalidNamePair(item, componentName, baseName, fileName);
    });

    var oneValid = pairs.some(function(value) {
      return value === false;
    });
    if (!oneValid) {
      addErrors(errors, pairs);
    }
  }

  function addErrors(errors, pairs) {
    pairs.forEach(function(pair) {
      if (pair) {
        pair.forEach(function(err) {
          errors.add(err.message, err.position);
        });
      }
    });
  }

  function invalidNamePair(option, componentName, baseName, fileName) {
    var out = [];
    var template, convert;

    // File name check
    convert = casingMethodFor(option.filename);
    if (convert(baseName) !== baseName) {
      template = 'File name \'%s\' is not matching the %s case rule';
      out.push({
        message: format(template, fileName, option.filename),
        position: { line: 1, column: 0 }
      });
    }

    // Component name check
    convert = casingMethodFor(option.component);
    if (convert(baseName) !== componentName) {
      template = 'Component name \'%s\' is not matching the %s case rule';
      // Move right 1 column to pint to name, not to string quotation.
      position.column++;
      out.push({
        message: format(template, componentName, option.component),
        position: position
      });
    }

    return out.length ? out : false;
  }
}

function casingMethodFor(value) {
  var map = {
    'dot':      'dot',
    'dash':     'param', // diff
    'camel':    'camel',
    'snake':    'snake',
    'pascal':   'pascal',
    'constant': 'constant'
  };

  assert(
    Object.keys(map).indexOf(value) !== -1,
    'Case option ' + value + ' is not available. See documentation at ' + docLink(exports.name)
  );

  return casing[map[value]];
}

function validateOptions(options) {
  if (type(options) === 'object') {
    validateOption(options);
    return;
  }

  if (type(options) === 'array') {
    options.forEach(validateOption);
    return;
  }

  assert(
    options === true,
    format(
      'Bad option value: %s. See documentation at %s',
      options,
      docLink(exports.name)
    )
  );
}

function validateOption(option) {
  assert(
    option.filename,
    format(
      'Required property \'%s\' in %s. See documentation at %s',
      'filename',
      JSON.stringify(option),
      docLink(exports.name)
    )
  );
  // Implicit validation
  casingMethodFor(option.filename);

  assert(
    option.component,
    format(
      'Required property \'%s\' in %s. See documentation at %s',
      'component',
      JSON.stringify(option),
      docLink(exports.name)
    )
  );
  // Implicit validation
  casingMethodFor(option.component);
}
