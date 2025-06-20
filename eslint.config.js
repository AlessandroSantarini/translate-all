// @ts-check

import ts from "@typescript-eslint/eslint-plugin";
import jest from "eslint-plugin-jest";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist/**/*", "packs/**/*", "static/lib/**/*", "*.mjs"] },
    { plugins: { jest, prettier, "@typescript-eslint": ts } },
    {
        files: ["**/*.ts"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...jest.environments.globals.globals,
            },
            ecmaVersion: 2023,
            sourceType: "module",
            parser: tseslint.parser,
            parserOptions: { project: "./tsconfig.json" },
        },
        rules: {
            ...ts.configs["recommended"].rules,
            eqeqeq: "error",
            "prettier/prettier": "error",
        },
    }
);