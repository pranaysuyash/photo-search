import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const commonIgnores = [
  "dist/**",
  "node_modules/**",
  "storybook-static/**",
  "coverage/**",
];

const tsPluginWithExtras = {
  ...tsPlugin,
  rules: {
    ...tsPlugin.rules,
    "no-explicit-unknown": {
      meta: {
        type: "problem",
        docs: {
          description: "No-op placeholder rule to satisfy legacy disable directives.",
        },
      },
      create: () => ({}),
    },
  },
};

const boundariesElements = [
  { type: "components", pattern: "src/components/**/*" },
  { type: "views", pattern: "src/views/**/*" },
  { type: "stores", pattern: "src/stores/**/*" },
  { type: "api", pattern: "src/api/**/*" },
  { type: "hooks", pattern: "src/hooks/**/*" },
  { type: "utils", pattern: "src/utils/**/*" },
  { type: "types", pattern: "src/types/**/*" },
  { type: "services", pattern: "src/services/**/*" },
  { type: "models", pattern: "src/models/**/*" },
  { type: "lib", pattern: "src/lib/**/*" },
  { type: "modules", pattern: "src/modules/**/*" },
  { type: "stories", pattern: "src/stories/**/*" },
  { type: "test", pattern: "src/test/**/*" },
  { type: "app", pattern: "src/App.tsx" },
  { type: "root-test", pattern: "src/*.test.*" },
  { type: "root-files", pattern: "src/*.ts" },
  { type: "root-tsx", pattern: "src/*.tsx" },
  { type: "root-config", pattern: "src/config/**/*" },
  { type: "root-contexts", pattern: "src/contexts/**/*" },
  { type: "root-styles", pattern: "src/styles/**/*" },
];

const jsRules = { ...js.configs.recommended.rules };

const tsRecommendedRules = {
  ...tsPlugin.configs.recommended.rules,
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      caughtErrorsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/ban-ts-comment": "warn",
};

export default [
  {
    ignores: commonIgnores,
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
    rules: jsRules,
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPluginWithExtras,
      boundaries,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...jsRules,
      ...tsRecommendedRules,
      "no-undef": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
    settings: {
      "boundaries/elements": boundariesElements,
    },
  },
];
