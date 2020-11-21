module.exports = {
  extends: ['airbnb-base', 'prettier', 'plugin:@typescript-eslint/recommended', 'plugin:import/typescript'],
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2020: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'never' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    camelcase: 'off',
    'consistent-return': 'off',
    'no-use-before-define': ['error', { functions: false }],
  },
}
