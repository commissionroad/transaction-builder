import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: 2020,
        projectService: true,
      },
      globals: {
        console: "readonly",
        fetch: "readonly",
        window: "readonly",
        document: "readonly",
        HTMLElement: "readonly",
        navigator: "readonly",
        NodeJS: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        process: "readonly",
        Bun: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettier.rules,
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='Boolean']",
          message:
            "Use !!value instead of Boolean(value) for boolean coercion.",
        },
        {
          selector:
            "BinaryExpression[operator=/^(===|!==|>|<|>=|<=)$/][left.type='MemberExpression'][left.property.name='length'][right.value=0]",
          message:
            "Use length truthiness checks instead of comparisons to 0.",
        },
        {
          selector:
            "BinaryExpression[operator=/^(===|!==|>|<|>=|<=)$/][right.type='MemberExpression'][right.property.name='length'][left.value=0]",
          message:
            "Use length truthiness checks instead of comparisons to 0.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [".*"],
              message:
                "Relative imports are not allowed. Use aliased paths instead.",
            },
          ],
        },
      ],
    },
  },
];
