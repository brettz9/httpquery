import ashNazg from 'eslint-config-ash-nazg';

export default [
  {
    ignores: [
      'FFAddon'
    ]
  },
  ...ashNazg(['sauron', 'node']),
  {
    rules: {
      // Disable for now
      '@stylistic/max-len': 0,
      'prefer-named-capture-group': 0
    }
  }
];
