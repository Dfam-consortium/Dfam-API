module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 2023
  },
  "rules": {
    "no-console": 'off',
    "no-async-promise-executor": 'off',
    "indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "semi": [
      "error",
      "always"
    ],
    "no-unused-vars": [
      "error",
      { "args": "none" }
    ]
  }
};
