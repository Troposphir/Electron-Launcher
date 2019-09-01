module.exports = {
    extends: [
        'plugin:vue/recommended',
        'eslint:recommended',
        "prettier/vue",
        'plugin:prettier/recommended',
    ],
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module'
    },
    env: {
        browser: true,
        node: true
    },
    rules: {
        "vue/html-indent": ["error", 4],
    },
    globals: {
        __static: true
    }
}
