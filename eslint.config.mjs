import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import prettier from "eslint-plugin-prettier";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import _import from "eslint-plugin-import";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import tsParser from "@typescript-eslint/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
  "node_modules/",
  "**/node_modules/",
  "**/script/",
  "**/eslint.config.mjs",
  "**/.eslintrc.js",
  "**/types/",
]), {
  extends: fixupConfigRules(compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/typescript",
    "prettier",
  )),

  plugins: {
    prettier,
    "@typescript-eslint": fixupPluginRules(typescriptEslint),
    import: fixupPluginRules(_import),
  },

  languageOptions: {
    globals: {
      ...globals.browser,
    },

    parser: tsParser,
    ecmaVersion: 2023,
    sourceType: "module",

    parserOptions: {
      project: "./tsconfig.json",
    },
  },

  settings: {
    "import/resolver": {
      node: {
        paths: ["src", "types", "", "dist"],
        extensions: [".css", ".js", ".json", ".jsx", ".scss", ".ts", ".tsx"],
      },

      "eslint-import-resolver-typescript": true,
      typescript: true,
    },

    "import/parsers": {
      "@typescript-eslint/parser": [".ts"],
    },
  },

  rules: {
    eqeqeq: ["error", "always"],
    "import/no-default-export": "error",
    "@typescript-eslint/no-explicit-any": "off",
    'prettier/prettier': [
      'error',
      {
        'endOfLine': 'auto',
      }
    ],

    "no-console": "error",

    "spaced-comment": ["error", "always", {
      markers: ["/"],
    }],
  },
}]);