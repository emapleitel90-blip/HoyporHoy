module.exports = {
    root: true,
    env: { browser: true, es2022: true },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react/jsx-runtime',
        'plugin:react-hooks/recommended',
    ],
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    settings: { react: { version: '18.2' } },
    ignorePatterns: ['dist/', 'coverage/', 'node_modules/'],
    rules: {
        // This JavaScript app does not use runtime PropTypes.
        'react/prop-types': 'off',
        'no-unused-vars': ['error', { varsIgnorePattern: '^React$', argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
    },
    overrides: [
        { files: ['*.config.js', '*.config.cjs', '.eslintrc.cjs'], env: { node: true } },
        { files: ['src/tests/**'], env: { node: true } },
    ],
};
