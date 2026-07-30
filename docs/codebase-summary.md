# Codebase Summary

## Directory Structure & Purpose

```
src/
├── app/
│   ├── providers/
│   │   ├── QueryProvider.tsx        # Mounts React Query context (staleTime 5m, gcTime 10m)
│   │   └── queryClient.ts           # Single QueryClient instance with config
│   └── store/
│       ├── storeFactory.ts          # Zustand factory wrapper (dev-only Reactotron enhancer)
│       └── counterStore.ts          # Counter state example (canonical pattern)
│
├── data/
│   ├── api/
│   │   └── responseApi.ts           # API client for responses endpoint
│   ├── queries/
│   │   └── responseQueries.ts       # React Query hooks (useResponses, useResponseDetail)
│   └── services/
│       ├── httpClient/
│       │   ├── httpClient.ts        # Singleton HTTP client, rate limiter, request validation
│       │   ├── requestInterceptor.ts # Token refresh logic, 401 handling
│       │   ├── tokenService.ts      # Session lifecycle, refresh dedupe, epoch guards
│       │   └── refresh-client.ts    # Interceptor-free axios for refresh requests
│       ├── errorHandler.ts          # Deprecated shim (use @/core/error instead)
│       ├── navigation/rootNavigator.ts # INavigationService, imperative nav
│       ├── reactotron/              # Reactotron plugins (dev-only)
│       └── secureStorage.ts         # expo-secure-store wrapper (WHEN_UNLOCKED_THIS_DEVICE_ONLY)
│
├── core/
│   └── error/
│       ├── ErrorHandler.ts          # UnifiedErrorHandler singleton, categorization, callbacks
│       ├── AppError.ts              # Error codes, severity, context, strategy
│       └── errors.ts                # Error subclass definitions
│
├── presentation/
│   ├── components/
│   │   ├── ui/                      # Primitives (Box, Text, Button, VStack, HStack, etc.)
│   │   │   └── touch/               # Touchable abstractions (internal)
│   │   ├── screens/                 # Feature-specific components
│   │   └── theme-provider/          # Dark/light mode support (light currently active)
│   ├── screens/
│   │   ├── Main.tsx                 # React Query read + FlashList (ListView memoized)
│   │   ├── Counter.tsx              # Zustand demo, atomic selector
│   │   ├── SignIn.tsx               # Form example, imperative nav
│   │   └── SignUp.tsx               # Fullest form pattern (RHF + zod + useSignUpForm)
│   ├── navigator/
│   │   ├── AppStack.tsx             # Stack navigator (4 screens: Login, SignUp, Main, Counter)
│   │   └── rootNavigator.ts         # RootNavigator singleton (data layer)
│   └── hooks/
│       ├── useResponse.ts           # Wraps useResponses, unwraps data.ok && data.data
│       ├── useRefresh.ts            # [isRefreshing, onRefresh] for RefreshControl
│       ├── useThemeColor.ts         # Color resolver (NOT a hook, exports getColor)
│       └── useSignUpForm.ts         # Form state + double-submit guard
│
├── shared/
│   ├── config/
│   │   ├── appConfig.ts             # Reads from Constants.expoConfig?.extra (variant, apiUrl, etc.)
│   │   └── api-url.ts               # assertValidApiUrl (strict validation, HTTPS for prod)
│   ├── constants/
│   │   ├── routeName.ts             # Route name constants (as const)
│   │   ├── errors.ts                # User-facing error messages (ErrorCode → string map)
│   │   └── strings.ts               # i18n-ready copy (Login, SignUp, error text)
│   ├── errors/
│   │   └── AppError.ts              # Exported from src/shared for convenience
│   ├── helper/
│   │   ├── logger.ts                # Static Logger class (dev-only, sanitizes secrets)
│   │   ├── storage.ts               # Refresh-token lifecycle (SecureStore wrapper)
│   │   ├── navigation.ts            # screenOptions helper (headers, transitions)
│   │   └── class-names.ts           # cn() = twMerge (CSS conflict resolution)
│   ├── models/
│   │   ├── countModels.ts           # Global CounterStateData (ambient types)
│   │   └── responseModel.ts         # API response types
│   ├── style/
│   │   ├── tailwind-variants.ts     # Custom tv() implementation + VariantProps
│   │   └── index.ts                 # Theme colors, spacing, typography
│   ├── types/
│   │   └── index.ts                 # App-wide types (RouteName, etc.)
│   └── validation/
│       ├── schemas.ts               # Zod schemas (login, signup, email, password)
│       └── validators.ts            # Unused duplicates of zod validators
│
└── (root)
    ├── index.js                     # Entry point (random-values, Reactotron, Root)
    ├── Root.tsx                     # Bootstrap providers (Query, Error Boundary, Safe Area, Theme)
    ├── App.tsx                      # GestureHandler root, navigation stacks
    ├── ErrorBoundary.tsx            # Catches render errors (dev detail, prod generic message)
    └── global.css                   # Tailwind directives (imported in App.tsx)

plugins/
├── with-environment-support.cjs     # Generates Android flavors, iOS schemes, Gradle/Podfile mutations
└── (Expo CLI plugins — applied in app.config.ts)

scripts/
├── lib/
│   ├── variant-config.cjs           # Single source of truth: VARIANTS, VARIANT_ENV_FILES
│   ├── parse-env-file.cjs           # Dotenv parser (handles trailing comments)
│   ├── write-file-atomic.cjs        # Atomic file writes (temp + rename)
│   └── … (other helpers)
├── run-native.cjs                   # pnpm android/ios[:stg|:prod] — validates, syncs env, runs expo run
├── check-env.js                     # Validates APP_NAME, VERSION_*, API_URL (throw-not-degrade)
├── setup-env.js                     # Interactive wizard (creates .env files, dotenv-vault optional)
├── sync-native-env.cjs              # Syncs APP_NAME into native; detects version drift, exits 1 before write
├── push-update.cjs                  # pnpm update:push — interactive EAS update with channel selection
├── update-readme-versions.js        # Postinstall hook (updates README badge versions from package.json)
└── … (push-update, test-update diagnostic)

tests/
└── __tests__/ (co-located in src/)

.github/workflows/
├── ci.yml                           # Lint, typecheck, test (3 parallel ubuntu jobs)
├── android-build.yml                # expo export --platform android (bundles JS, no Gradle)
└── ios-build.yml                    # xcodebuild on macos-latest (scheme Debug, target simulator)
```

## Key Modules & Entry Points

| Module | Purpose | Key Exports |
|--------|---------|------------|
| `storeFactory.ts` | Zustand wrapper | `createStore<T>(name, creator)` |
| `counterStore.ts` | Example store | `CounterState`, `useCounterStore` |
| `httpClient.ts` | HTTP singleton | `HttpClient.getInstance()`, `request<T>` |
| `tokenService.ts` | Session lifecycle | `setAccessToken`, `endSession`, `refresh` |
| `ErrorHandler.ts` | Error categorization | `UnifiedErrorHandler.getInstance()` |
| `appConfig.ts` | Runtime config | `appConfig = {variant, apiUrl, versionName}` |
| `tv()` styling | Variant system | `tv(baseStyles, variants)`, `VariantProps<typeof x>` |
| `RootNavigator.ts` | Imperative nav | `RootNavigator.navigate()`, `RootNavigator.goBack()` |
| `useResponse` | Query wrapper | `{data, isLoading, error}` from `useResponses` |

## Test Coverage Map

### Strong Coverage (Unit + Integration)

- **HTTP Client (490 LOC test suite):**
  - Token keep-vs-clear taxonomy (on 401, on network error, on timeout)
  - Single-flight dedupe with concurrent refresh triggers
  - Epoch-based ABA guard against logout-mid-write race
  - Refresh timer arming/clearing, proactive refresh with 30s buffer
  - MAX_CONSECUTIVE_FAILURES = 5 termination logic
  - Request timeout, signal abort → RequestCancelledError classification
  - Rate limiter pruning, request validation (path traversal blocklist)

- **Error Handling (AppError subclasses + UnifiedErrorHandler):**
  - ErrorCode enum coverage, severity stratification
  - Status → strategy mapping (401 → logout, 429 → retry 3×5s, 5xx → retry 3×2s)
  - AxiosError → HttpError + AppError + native Error classification
  - Breadcrumb ring buffer max 50
  - `extractErrorMessage` + `isPresentableMessage` (rejects HTML/XML, >200 chars)

- **SecureStorage:**
  - Round-trip encryption/decryption
  - WHEN_UNLOCKED_THIS_DEVICE_ONLY accessibility
  - Read-failure preservation of cause; absent key returns null only
  - KeyStore failure propagation

- **Storage (refresh token lifecycle):**
  - Versioned payload (v2), expiry check, clear on mismatch
  - 7-day default retention

- **Presentation (Input, ControlledInput, ListView, modals, hooks, ui primitives):**
  - Input 51 test cases (validation, onChange, ref)
  - ListView 21 cases (memoization, empty state, item rendering)
  - Modal + useAppState + usePrevious 22 cases
  - UI class-string baseline 7 cases + stack-touchable a11y 2 + touchable a11y 3
  - KeyboardViewSpacer 3 cases
  - SignIn 8, SignUp 12 + useSignUpForm 6

- **Tooling & Config:**
  - check-env 9 cases (variant validation, URL parsing)
  - native-build-integrity 326 LOC (variant table vs on-disk schemes/pbxproj/Gradle, version drift, atomic writes)
  - Plugin anchored mutations 10 cases (re-entrancy, drift detection)

### Coverage Gaps to Address

| Area | Status | Reason |
|------|--------|--------|
| `src/app/store/` | Zero tests | createStore, Reactotron fallback, resetAllStores, counterStore actions |
| `src/app/providers/` | Untested | queryClient defaults (staleTime, gcTime, retry, refetchOnWindowFocus) |
| `appConfig.ts` | Untested | Config merging from Constants.expoConfig |
| `src/shared/validation/` | Untested | Zod schema composition, cross-field validation |
| Main & Counter screens | Untested | Screen-level logic (data fetching, state binding) |
| `ErrorBoundary` | Untested | resetKeys behavior, retry logic, `__DEV__` conditionals |
| `rootNavigator` | No direct test | Only via mocks in navigation tests |
| Reactotron plugins | Untested | Entire dev-tool integration |
| RateLimiter rejection | Untested | Request blocking on window-full condition |
| setup-env.js | Zero tests | 586 lines, creates/modifies .env files interactively |
| push-update, run-native scripts | Untested | Native/EAS orchestration |
| Plugin iOS half | Untested | ensureBuildConfigurations, scheme XML, Podfile mapping (internal) |

## Quick Reference: "Where Do I Add X?"

### Add a New Screen
1. Create `src/presentation/screens/YourScreen.tsx`
2. Add route to `src/shared/constants/routeName.ts` (`const RouteName = {..., YourScreen: 'YourScreen'} as const`)
3. Add navigation to `src/presentation/navigator/AppStack.tsx` in Stack.Screen
4. Export from `src/app/store/index.ts` if needing a store or query hook

### Add a Zustand Store
1. Create `src/app/store/yourFeatureStore.ts` following the **canonical pattern:**
   ```ts
   import { CounterStateData } from '@/shared/models/countModels'; // ← ambient global type
   interface YourState extends YourStateData {
     setX: (val: T) => void; // actions
   }
   const initialState: YourStateData = { x: 0 };
   export const useYourStore = createStore<YourState>('YourFeature', (set) => ({
     ...initialState,
     setX: (val) => set({ x: val }),
   }));
   ```
2. Export from `src/app/store/index.ts` barrel as part of the `store` object
3. Hook into any component via `useYourStore(selector)` or `useYourStore(useShallow(state => ({...})))`

### Add a React Query Hook
1. Create `src/data/queries/yourQueries.ts`
2. Define API function in `src/data/api/yourApi.ts` (takes `signal?: AbortSignal`)
3. Wrap with `useQuery` or `useMutation` (queryKey array, queryFn)
4. Export from barrel `src/data/queries/index.ts` as `yourQueries`
5. Use in component: `const { data, isLoading, error } = useYourQuery()`

### Add a UI Component
1. Create `src/presentation/components/ui/YourComponent.tsx` (or named file for feature components)
2. Props type: `Omit<NativeProps, keyof StyleProps> & StyleProps & VariantProps<typeof yourStyle> & {className?: string}`
3. Define `yourStyle = tv({base: {...}, variants: {size: {sm: '...', lg: '...'}}})` in `styles.tsx` or inline
4. Export default + set `displayName = 'YourComponent'`
5. Re-export from `src/presentation/components/ui/index.ts` barrel

### Add an API Endpoint (HTTP Client)
1. Add function to `src/data/api/yourApi.ts`: `export async function getYourData(signal?: AbortSignal) { return HttpClient.getInstance().request<YourData>(...) }`
2. Wrap in React Query hook (see React Query section above)
3. HTTP client handles: rate limiting, request validation (path traversal blocklist), timeout, signal, refresh on 401, error classification

### Add a Native Configuration Change
1. Edit `plugins/with-environment-support.cjs` to mutate the Gradle or Podfile blocks
2. Use `applyAnchoredMutation(source, anchor, replacement)` — provides clear error if anchor drifts
3. Run `pnpm prebuild:clean` to regenerate ios/ and android/
4. Test variant: `pnpm ios:stg` or `pnpm android:prod`

### Add an Error Handling Case
1. Decide: is it a known AppError subclass (NetworkError, TimeoutError, AuthError, HttpError)?
2. Throw it from the API layer: `throw new HttpError(statusCode, responseData, message)`
3. HTTP client passes to `errorHandler.handleError()`, which categorizes it
4. React Query marks hook state as `error = <AppError>`. Today screens render `error.message` directly (see `src/presentation/screens/main/index.tsx`); `AppError.getUserMessage()` exists but has no production consumer yet
5. `onError` / `onAuthError` / `onNetworkError` callbacks on `ErrorHandlerConfig` are an extension point only — nothing calls `errorHandler.updateConfig()`, so they never fire

### Add a Test
- Co-locate a `__tests__/` directory next to the file under test — e.g. `src/shared/helper/__tests__/logger.test.ts`
- Screen tests live inside the screen folder: `src/presentation/screens/signup/__tests__/SignUpPage.test.tsx`
- Run: `pnpm test` (local, no coverage) or `pnpm test:ci` (coverage enforced)
- Query cancellation tested via `signal` abort; verify `RequestCancelledError` thrown
- Zustand tested via direct `store.getState()` and action invocation

---

**Last Updated:** 2026-07-28
**Files:** 148 (~12,000 LOC)
