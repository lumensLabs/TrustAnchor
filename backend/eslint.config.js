import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["*.js", "**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
      },
    },
    rules: {
      // Add any custom rules here
    },
  },
  {
    files: ["eslint.config.js", "jest.config.js", "migrations/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
    ],
  },
];
