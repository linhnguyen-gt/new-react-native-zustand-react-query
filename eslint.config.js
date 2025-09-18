import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';

export default [
    js.configs.recommended,

    {
        ignores: [
            'coverage/**',
            '__mocks__/**',
            'node_modules/**',
            'dist/**',
            'build/**',
            'vendor/**',
            'android/**',
            'ios/**',
            '**/*.d.ts',
            'scripts/**',
            '*.js',
            'tsconfig.json',
        ],
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
            react,
            'react-hooks': reactHooks,
            'react-native': reactNative,
            'jsx-a11y': jsxA11y,
            import: importPlugin,
            prettier,
        },
        rules: {
            ...typescript.configs.recommended.rules,
            ...typescript.configs['eslint-recommended'].rules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-shadow': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/prefer-enum-initializers': 'error',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'parameter',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                },
                {
                    selector: 'function',
                    format: ['camelCase', 'PascalCase'],
                },
            ],
            ...react.configs.recommended.rules,
            'react/jsx-filename-extension': ['error', { extensions: ['.ts', '.tsx'] }],
            'react/display-name': 'off',
            'react/jsx-props-no-spreading': 'off',
            'react/state-in-constructor': 'off',
            'react/static-property-placement': 'off',
            'react/prop-types': 'off',
            'react/require-default-props': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            'react/jsx-curly-brace-presence': 'error',
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.configs.recommended.rules,
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'no-mixed-spaces-and-tabs': 'off',
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'prettier/prettier': ['error'],
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
            },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-native': reactNative,
            'jsx-a11y': jsxA11y,
            import: importPlugin,
            prettier,
        },
        rules: {
            ...react.configs.recommended.rules,
            'react/jsx-filename-extension': ['error', { extensions: ['.js', '.jsx'] }],
            'react/display-name': 'off',
            'react/jsx-props-no-spreading': 'off',
            'react/state-in-constructor': 'off',
            'react/static-property-placement': 'off',
            'react/prop-types': 'off',
            'react/require-default-props': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            'react/jsx-curly-brace-presence': 'error',
            ...reactHooks.configs.recommended.rules,
            ...jsxA11y.configs.recommended.rules,
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'prettier/prettier': ['error'],
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: ['**/*.test.{js,ts,jsx,tsx}', '**/__tests__/**/*.{js,ts,jsx,tsx}'],
        plugins: {
            jest,
        },
        rules: {
            ...jest.configs.recommended.rules,
        },
        languageOptions: {
            globals: {
                ...jest.environments.globals.globals,
                jest: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
            },
        },
    },
    {
        files: ['**/__mocks__/**/*.js'],
        languageOptions: {
            globals: {
                jest: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
            },
        },
        rules: {
            'react/jsx-filename-extension': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-undef': 'off',
        },
    },
    {
        files: ['jest.setup.js'],
        languageOptions: {
            globals: {
                jest: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
            },
        },
        rules: {
            'no-undef': 'off',
        },
    },
    {
        files: ['*.js', 'scripts/**/*.js'],
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
            'no-console': 'off',
            'no-empty': 'off',
            'no-case-declarations': 'off',
            quotes: 'off',
        },
    },
    {
        files: ['metro.config.js', 'babel.config.js', 'jest.config.js'],
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
        },
    },
    prettierConfig,
];
