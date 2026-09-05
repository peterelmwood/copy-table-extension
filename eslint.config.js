import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";
import globals from "globals";

const languageOptions = {
  globals: {
    ...globals.browser,
    ...globals.node
  }
};

export default [
  {
    ignores: [
      // Claude Code checks worktrees out here; their build output is not project source.
      ".claude/**",
      ".copy-table-test-output/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "out/**",
      "web-ext-artifacts/**"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    ...js.configs.recommended,
    languageOptions
  },
  {
    files: ["**/*.ts"],
    ...js.configs.recommended,
    languageOptions: {
      ...languageOptions,
      parser: babelParser,
      parserOptions: {
        babelOptions: {
          babelrc: false,
          configFile: false,
          plugins: ["@babel/plugin-syntax-typescript"]
        },
        requireConfigFile: false
      }
    },
    rules: {
      "no-undef": "off"
    }
  }
];
