'use strict';

module.exports = {
  root: true,
  extends: 'ash-nazg/sauron-node-script-overrides',
  env: {
    webextensions: true
  },

  rules: {
    // Until may switch to ESM
    strict: 0,
    'node/exports-style': 0,
    'node/no-missing-require': ['error', {
      allowModules: [
        'chrome',
        'sdk'
      ]
    }],

    // Disable for now
    'prefer-const': 0,
    'prefer-named-capture-group': 0,

    'max-len': 0,
    'require-unicode-regexp': 0,
    'jsdoc/require-returns': 0,
    'jsdoc/require-param-type': 0
  }
};
