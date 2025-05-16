module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "./tsconfig.json",
        warnOnUnsupportedTypeScriptVersion: false
    },
    env: {
        es6: true
    },
    extends: [
        "@react-native",
        "prettier",
        "eslint:recommended",
        "plugin:jest/recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:eslint-comments/recommended",
        "plugin:jsx-a11y/recommended",
        "plugin:import/typescript",
        "plugin:prettier/recommended"
    ],
    plugins: ["react", "react-native", "detox", "react-hooks", "import"],
    ignorePatterns: ["!.*", "dist", "node_modules"],
    rules: {
        "no-console": ["error", { allow: ["warn", "error"] }],
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "error",
        "react/jsx-filename-extension": ["error", { extensions: [".ts", ".tsx"] }],
        "react/display-name": "off",
        "react/jsx-props-no-spreading": "off",
        "react/state-in-constructor": "off",
        "react/static-property-placement": "off",
        "react/prop-types": "off",
        "react/require-default-props": "off",
        "react/jsx-curly-brace-presence": "error",
        "prettier/prettier": ["error"],
        "@typescript-eslint/indent": "off",
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "linebreak-style": ["error", "unix"],
        quotes: ["error", "double"],
        semi: ["error", "always"],
        "@typescript-eslint/prefer-enum-initializers": "error",
        "no-undef": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "error",
        "no-mixed-spaces-and-tabs": "off",
        "react-native/no-inline-styles": "off",
        "@typescript-eslint/naming-convention": [
            "error",
            {
                selector: "variable",
                format: ["camelCase", "UPPER_CASE"],
                types: ["string", "number", "array"],
                leadingUnderscore: "allow"
            },
            {
                selector: "variable",
                types: ["boolean"],
                format: ["PascalCase"],
                prefix: ["is", "should", "has", "can", "did", "will"]
            },
            {
                selector: "parameter",
                format: ["camelCase"],
                leadingUnderscore: "allow"
            },
            {
                selector: "memberLike",
                modifiers: ["private"],
                format: ["camelCase"],
                leadingUnderscore: "allow"
            },
            {
                selector: "typeLike",
                format: ["PascalCase"]
            }
        ],
        "import/imports-first": "error",
        "import/order": [
            "error",
            {
                groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
                "newlines-between": "always",
                alphabetize: {
                    order: "asc",
                    caseInsensitive: true
                },
                pathGroups: [
                    {
                        pattern: "@/app",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/app/providers",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/app/store",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/data",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/data/api",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/data/queries",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/data/services",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/presentation",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/presentation/components",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/presentation/hooks",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/presentation/navigator",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/presentation/screens",
                        group: "internal",
                        position: "before"
                    },
                    {
                        pattern: "@/shared",
                        group: "internal",
                        position: "before"
                    }
                ]
            }
        ]
    },

    settings: {
        react: {
            version: "detect"
        }
    }
};
