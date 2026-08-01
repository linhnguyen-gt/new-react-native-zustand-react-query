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
            '.opencode/**',
            '*.js',
            'tsconfig.json',
        ],
    },
    {
        // Build tooling runs in Node, not in the RN runtime. Without this block these
        // files lint against RN globals and every console/process use reports no-undef.
        files: ['scripts/**/*.{js,cjs,mjs}', 'plugins/**/*.{js,cjs,mjs}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
                module: 'writable',
                require: 'readonly',
                exports: 'writable',
                URL: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
            },
        },
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
            // Off, in both forms. The `const X = {...} as const` + `type X = ...` pair is
            // how every former `enum` is written now (`erasableSyntaxOnly` rejects enums),
            // and neither rule recognises it: `ignoreDeclarationMerge` covers
            // interface/namespace/class merges, not a value and a type sharing a name.
            // A genuine duplicate is still a compile error — TS2451 — so nothing is lost.
            'no-redeclare': 'off',
            '@typescript-eslint/no-redeclare': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            // Was `prefer-enum-initializers`, a rule about how to write an `enum`. There
            // are no enums left: `erasableSyntaxOnly` rejects them, since they emit runtime
            // code a type-stripping transpiler cannot produce, and `docs/code-standards.md`
            // already preferred `as const` objects. The rule now forbids the construct
            // outright rather than styling it.
            '@typescript-eslint/no-restricted-types': 'off',
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'TSEnumDeclaration',
                    message: 'Use an `as const` object with a merged type instead of an enum (erasableSyntaxOnly).',
                },
                {
                    selector: 'TSParameterProperty',
                    message: 'Declare and assign the field in the constructor body (erasableSyntaxOnly).',
                },
            ],
            /**
             * Layer boundaries, enforced.
             *
             * The architecture doc has described these arrows since the start and then
             * admitted, in the same file, that "there is no `no-restricted-paths` rule
             * configured, so a new violation will not fail `pnpm lint`". They were a
             * convention held up by code review, which is the kind that decays quietly.
             *
             *     presentation  →  app, data, shared, core
             *     app           →  data, shared, core
             *     data          →  shared, core
             *     shared, core  →  nothing above them
             *
             * Each zone below reads "nothing in `target` may import from `from`".
             *
             * The two `except` entries are the pre-existing inversions the doc already
             * lists, kept as narrow single-file allowances rather than switching the rule
             * off. Both are tracked as cleanup in `project-roadmap.md`; scoping them this
             * tightly means resolving either one is a one-line deletion here, and means no
             * *third* inversion can appear without failing lint.
             */
            'import/no-restricted-paths': [
                'error',
                {
                    basePath: '.',
                    zones: [
                        {
                            target: './src/shared',
                            from: './src/data',
                            // `shared/helper/storage.ts` is the only consumer of the
                            // SecureStore service. Moving the helper into `data/` resolves
                            // the inversion.
                            except: ['./services/secureStorage.ts'],
                            message: 'shared/ is foundation: it must not import from data/.',
                        },
                        {
                            target: './src/shared',
                            from: './src/app',
                            message: 'shared/ is foundation: it must not import from app/.',
                        },
                        {
                            target: './src/shared',
                            from: './src/presentation',
                            message: 'shared/ is foundation: it must not import from presentation/.',
                        },
                        {
                            target: './src/core',
                            from: './src/app',
                            message: 'core/ is foundation: it must not import from app/.',
                        },
                        {
                            target: './src/core',
                            from: './src/data',
                            message: 'core/ is foundation: it must not import from data/.',
                        },
                        {
                            target: './src/core',
                            from: './src/presentation',
                            message: 'core/ is foundation: it must not import from presentation/.',
                        },
                        {
                            target: './src/data',
                            from: './src/app',
                            // The Reactotron query plugin needs the live client to observe
                            // its caches. The whole module is `require()`d inside
                            // `if (__DEV__)` and is stripped from release bundles.
                            except: ['./providers/queryClient.ts'],
                            message: 'data/ must not import from app/.',
                        },
                        {
                            target: './src/data',
                            from: './src/presentation',
                            message: 'data/ must not import from presentation/.',
                        },
                        {
                            target: './src/app',
                            from: './src/presentation',
                            message: 'app/ must not import from presentation/.',
                        },
                    ],
                },
            ],
            // Makes `verbatimModuleSyntax` enforceable and auto-fixable. The tsconfig flag
            // rejects a type imported without `import type`; this rule is what rewrites it.
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                    fixStyle: 'inline-type-imports',
                    disallowTypeAnnotations: false,
                },
            ],
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
            // Teaches eslint-plugin-import to follow the `@/…` aliases from tsconfig.
            // Without it every layer-boundary check below silently passes, because the
            // plugin cannot resolve the import it is meant to be judging.
            'import/resolver': {
                typescript: {
                    project: './tsconfig.json',
                },
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
        files: ['*.cjs', 'metro.config.js', 'babel.config.js', 'jest.config.js'],
        languageOptions: {
            globals: {
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                process: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
        },
    },
    {
        files: ['tailwind.config.ts'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    prettierConfig,
];
