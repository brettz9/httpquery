'use strict';

module.exports = {
  extends: 'ash-nazg/sauron-node-overrides',

  rules: {
    // Disable for now
    'prefer-const': 0,
    'prefer-named-capture-group': 0,

    'max-len': 0,
    'require-unicode-regexp': 0,
    'jsdoc/require-returns': 0,
    'jsdoc/require-param-type': 0
  }
};
