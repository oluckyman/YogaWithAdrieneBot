module.exports = {
  extends: [
    'airbnb-base',
    'eslint-config-prettier',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:@next/next/recommended',
  ],
  plugins: ['@typescript-eslint', 'eslint-plugin-prettier'],
  env: {
    node: true,
    es2020: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      alias: {
        map: [['@', './src']],
        extensions: ['.js', '.ts', '.jsx', '.tsx'],
      },
    },
  },
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'never' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    camelcase: 'off',
    'consistent-return': 'off',
    'no-use-before-define': ['error', { functions: false }],
  },
}
