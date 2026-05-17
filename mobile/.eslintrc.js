module.exports = {
  env: {
    es2021: true,
    "react-native/react-native": true,
  },
  extends: ["eslint:recommended", "plugin:react/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "react-native"],
  rules: {
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "no-undef": "error"
  },
  settings: {
    react: {
      version: "detect"
    }
  }
};
