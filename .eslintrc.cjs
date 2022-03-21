'use strict';

module.exports = {
  extends: 'ash-nazg/sauron-node-overrides',

  parserOptions: {
    ecmaVersion: 2021
  },

  settings: {
    polyfills: [
      'Promise',
      'URL'
    ]
  },

  rules: {
    // Disable for now
    'max-len': 0,
    'prefer-named-capture-group': 0
  }
};
