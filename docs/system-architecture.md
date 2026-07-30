# System Architecture

## Layered Architecture

The project follows a 4-layer architecture with unidirectional dependencies (upward only):

```
┌─────────────────────────────────────────────────────────────┐
│ PRESENTATION LAYER (src/presentation/)                      │
│ UI Components, Screens, Navigation, Hooks                   │
│ Dependencies: app/, data/, shared/                          │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (src/app/)                                │
│ State Management (Zustand), Providers (React Query)         │
│ Dependencies: data/, shared/                                │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│ DATA LAYER (src/data/)                                      │
│ HTTP Client, API Clients, Queries, Services                 │
│ Dependencies: shared/, core/                                │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│ SHARED LAYER (src/shared/, src/core/)                       │
│ Types, Constants, Validation, Errors, Utilities             │
│ Dependencies: none (foundation)                             │
└─────────────────────────────────────────────────────────────┘
```

**Dependency Rules:**
- Presentation imports from app, data, shared — never the reverse
- App imports from data, shared — never from presentation
- Data imports from shared, core — never from app or presentation
- Shared and core are foundation; imports only from each other or standard library

**Two exceptions exist in the codebase today.** Neither is enforced by a lint rule, so both are conventions maintained by review:

| Violation | Location | Why it is tolerated |
| --- | --- | --- |
| data → app | `src/data/services/reactotron/index.ts:1` imports `@/app/providers/queryClient` | Dev-only wiring: the Reactotron query plugin needs the live client to subscribe to its caches. The whole module is `require()`d inside `if (__DEV__)` and is stripped from release bundles. |
| shared → data | `src/shared/helper/storage.ts:1` imports `@/data/services/secureStorage` | The refresh-token helper is the sole consumer of the SecureStore service. Moving it into `data/` would resolve the inversion; it is listed as a cleanup item in `project-roadmap.md`. |

There is no `eslint-plugin-import` `no-restricted-paths` / boundaries rule configured, so a new violation will not fail `pnpm lint`.

## State Boundaries

### Client State (Zustand)
**Owner:** Zustand stores in `src/app/store/`

**Scope:** UI state, feature flags, user preferences, local form state
- Counters, filters, sorting preferences
- Feature toggles, experiment groups
- Theme selection, language preference

**Characteristics:**
- Session-scoped (cleared on logout via `resetAllStores()`)
- Synchronous, deterministic
- No middleware (immer, persist, devtools) by default
- Dev-only Reactotron enhancer loaded via inline require

**Anti-patterns:**
- API responses belong in React Query, not Zustand
- Tokens belong in SecureStore, not Zustand
- Never use for persistence across app restarts

### Server State (React Query)
**Owner:** React Query in `src/app/providers/` + hooks in `src/data/queries/`

**Scope:** API responses, cached data, server-derived state
- User lists, item details, feed posts
- Search results, recommendations
- Any data fetched from backend

**Characteristics:**
- Automatic deduplication (queryKey-based)
- Background refetching (staleTime 5 min, gcTime 10 min)
- Automatic cancellation via `signal` on component unmount
- Single QueryClient instance, no retry/refetch on window focus

**Anti-patterns:**
- Don't mix UI state (filters) with server state in queries
- Don't manually invalidate queries during normal operation (refetch on success is preferred)
- Never cache in Zustand and React Query simultaneously for the same data

### Secrets (SecureStore)
**Owner:** `src/data/services/secureStorage.ts`

**Scope:** Sensitive data persisting across sessions
- Refresh tokens (7-day retention, versioned v2 format)
- API keys, private keys (if app-specific)

**Characteristics:**
- WHEN_UNLOCKED_THIS_DEVICE_ONLY (iOS keychain, Android Keystore)
- Excluded from device backups (iOS)
- Failures are surfaced, never silently ignored
- Lifecycle tied to `tokenService` (refresh, logout clears)

**Anti-patterns:**
- Never store access tokens (short-lived, should be in memory only)
- Never store non-secrets in SecureStore (performance cost)

## Request Flow & HTTP Client

```
Component
    ↓ (hooks)
React Query Hook (useResponses)
    ↓
API Client (responseApi.getResponseData)
    ↓
HttpClient.getInstance().request<T>()
    ├─ Pre-flight validation
    │  ├─ Endpoint type check
    │  └─ Path traversal blocklist (../, /etc/, /proc/)
    ├─ Rate limiter (100 req / 60s, keyed by endpoint)
    ├─ Axios config (baseURL, timeout 30s, params/body)
    └─ Request interceptor (none — empty)
    ↓
Response Interceptor
    ├─ On 2xx: pass through
    ├─ On 401 + body.message contains "token expired":
    │  ├─ Check if refresh already in flight (single-flight dedupe + epoch guard)
    │  ├─ POST /refresh-token {refreshToken} (separate axios instance, no interceptor)
    │  ├─ Update session: accessToken, refreshToken (if provided), expiredAt, timer
    │  └─ Retry original request
    ├─ On 400 + body.message "user not found":
    │  └─ tokenService.logout() + throw AuthError
    └─ Otherwise: throw AxiosError wrapped as HttpError
    ↓
ErrorHandler.categorizeError()
    ├─ AppError: merge context (existing wins), return
    ├─ AxiosError: classify as NetworkError, TimeoutError, or HttpError
    ├─ Native Error: heuristic checks (token-expired before auth)
    └─ Fallback: UnknownError
    ↓
React Query error state
    └─ Component reads `.error.getUserMessage()` for UI text
```

**Rate Limiter:** Tracks requests per endpoint in a 60-second window. On 100 req/window, rejects with `RateLimitError` and continues tracking for potential backoff.

**Token Refresh Single-Flight Dedupe:**
1. On first 401, check if `_retry` already set (previous attempt)
2. If not, set `_retry = true` and dispatch refresh
3. Concurrent 401s see `_retry` is set, wait for the same refresh promise
4. Session epoch guard prevents ABA attack: if logout fires mid-refresh, new refresh is rejected via epoch check

**Refresh Timeout:** 15 seconds with AbortController deadline. If backend timeout or network failure, falls back to transient (token kept, user asked to retry). After 5 consecutive failures on a single dispatched request, logout.

## Error Handling Flow

```
AppError (top-level union type)
├─ NetworkError (HIGH severity, retry 3×)
├─ TimeoutError (retry 2×)
├─ RequestCancelledError (LOW, no retry/alert)
├─ ValidationError (user input)
├─ SchemaValidationError (parsing)
├─ AuthError (token invalid, throw logout)
├─ TokenExpiredError (synonym, throw logout)
├─ HttpError (statusCode + responseData)
├─ StorageError (keystore failure)
├─ EncryptionError (CRITICAL)
└─ UnknownError (catch-all)

ErrorContext (attached to every AppError)
├─ timestamp
├─ endpoint, method
├─ statusCode (if HTTP)
├─ breadcrumbs (ring buffer, max 50)
└─ originalError (AxiosError, native Error, etc.)

ErrorRecoveryStrategy
├─ shouldRetry, retryCount, retryDelay
├─ shouldLogout
├─ shouldShowAlert
└─ fallbackAction (optional callback)
```

**Status → Strategy Mapping:**
- 401 → logout (shouldLogout: true)
- 429 → retry 3 times, 5s delay (rate limit)
- 5xx → retry 3 times, 2s delay (server error)
- Others → no retry (client error)

**Error Processing (`UnifiedErrorHandler.processError`):**
1. Categorize via `categorizeError` (AppError passthrough, AxiosError branch, native Error heuristics)
2. Merge context (existing context wins to preserve breadcrumb history)
3. Add breadcrumb to ring buffer (max 50 entries, FIFO)
4. Log via Logger.error (dev-only)
5. Trigger callback: `onError`, or `onAuthError` if logout, or `onNetworkError` if network
6. **Note:** Sentry hook is a TODO stub; not currently instrumented

**Message Extraction (`extractErrorMessage`):**
- Reject HTML/XML bodies (prevents gateway error pages reaching UI)
- Reject strings > 200 chars (prevents debug stack traces)
- Return user-facing copy from `AppError.getUserMessage()` keyed by `ErrorCode`

## Bootstrap Sequence

```
1. index.js (native entry)
   ├─ react-native-get-random-values (polyfill)
   └─ registerRootComponent(Root)

2. Root.tsx
   ├─ react-native-gesture-handler (import for side effects)
   ├─ QueryProvider (React Query context)
   ├─ App.tsx (main component)
   └─ ErrorBoundary (catch render errors)

3. App.tsx
   ├─ global.css import (NativeWind styles)
   ├─ LogBox.ignoreLogs (suppress known noisy warnings)
   ├─ if (__DEV__) require('@/data/services/reactotron') (dev-only)
   ├─ GestureHandlerRootView (gesture responder)
   ├─ SafeAreaProvider (safe area context)
   ├─ ThemeProvider (dark/light mode, currently light)
   ├─ AppStack (navigation)
   └─ ModalUpdate (sibling, expo-updates check + OTA flow)

4. AppStack.tsx (React Navigation)
   ├─ RootNavigator.setRef (navigation ref for imperative nav)
   └─ Stack.Screen (Login, SignUp, Main, Counter)

5. Screen Mount (e.g., Main.tsx)
   ├─ useResponses hook (React Query, triggers API call)
   ├─ ListView (memoized Header/Item/Empty)
   ├─ FlashList (efficient scrolling)
   └─ Pull-to-refresh (useRefresh hook)
```

**Critical Points:**
- Reactotron loaded via inline `if (__DEV__) require()` so Metro tree-shakes it in release
- Splash auto-hides (no `preventAutoHideAsync` in code, Expo plugin handles it)
- QueryClient instance created at module scope (shared across app)
- ErrorBoundary catches render errors but does NOT catch async/navigation errors
- ModalUpdate mounts as app-root sibling and never unmounts, persisting update state across nav

## State Management: Zustand + React Query

### Zustand Store Lifecycle

```
1. createStore<YourState>('YourFeature', (set) => ({...}))
   ├─ Wraps zustand.create
   ├─ In __DEV__, enhances with Reactotron (inline require, fallback to raw creator)
   └─ Registers reset fn in module-level Set

2. useYourStore(selector)
   ├─ Returns selected state
   ├─ Triggers re-render on state change
   └─ Selector identity matters (useMemo or useShallow for multiple props)

3. Store reset (logout or session end)
   └─ resetAllStores()
       ├─ Calls store.getInitialState() for each store
       ├─ Set state back to initial
       └─ Clears user-specific data
```

### React Query Lifecycle

```
1. useResponses() hook
   ├─ queryKey: ['responses', 'list']
   ├─ queryFn: ({signal}) => responseApi.getResponseData(signal)
   └─ Inherits config from QueryClient (staleTime 5m, gcTime 10m, retry 2)

2. On mount
   ├─ Check cache; if stale/absent, fetch
   ├─ Pass signal to HTTP client → axios
   └─ Return {data, isLoading, error, ...}

3. On unmount
   ├─ Cancel via signal (aborts axios request)
   ├─ Request classified as RequestCancelledError (low severity, no UI alert)
   └─ Cache retained (gcTime 10 min before garbage collection)

4. Manual refetch
   ├─ Call refetch() from hook return
   ├─ Ignores staleTime, fetches fresh
   └─ Update cache on success

5. No invalidateQueries today
   ├─ Mutations don't invalidate; post-mutation data replaces via direct setState
   ├─ Consider adding invalidateQueries when refetch-on-success pattern scales
```

## Native Build Pipeline

```
app.config.ts
├─ Read APP_VARIANT from env (fallback development)
├─ normalizeVariant (development|staging|production only)
├─ Load variant env file (.env, .env.staging, .env.production)
├─ Build extra.nativeVariants[variant] for all three variants
├─ Set runtimeVersion = VERSION_NAME (ties OTA to binary version)
├─ Set updates block (EXPO_UPDATE_URL, checkAutomatically ON_LOAD, fallbackToCacheTimeout 0)
├─ Load plugins:
│  ├─ with-environment-support.cjs (generates Android flavors, iOS schemes)
│  ├─ expo-splash-screen (app icon + splash)
│  └─ expo-secure-store (native linking)
└─ Return ExpoConfig

expo prebuild --clean
├─ Delete ios/ and android/ directories
├─ Run app.config.ts to generate ExpoConfig
├─ Prebuild generates ios/ + android/ from template
└─ Config plugin mutates them:
   ├─ Android: Gradle productFlavors (dev/staging/prod), buildTypes, signing
   ├─ iOS: Xcode schemes (NewReactNativeZustandRNQ, Staging, Production)
   ├─ iOS: Build configurations (Debug, Staging.Debug, Production.Debug, etc.)
   ├─ iOS: Podfile environment setup
   └─ Uses applyAnchoredMutation (throws if anchor drifts — prevents silent failures)

pnpm ios:stg
├─ Set APP_VARIANT=staging, run env check
├─ sync-native-env (detect version drift, exit 1 before write)
├─ expo run:ios --scheme Staging --configuration Staging.Debug
└─ Xcode builds with staging bundle ID, API_URL from .env.staging

pnpm android:prod
├─ Set APP_VARIANT=production, run env check
├─ sync-native-env (version drift check)
├─ expo run:android --variant productionRelease --app-id com.newreactnativezustandrnq
└─ Gradle builds with prod package ID, API_URL from .env.production
```

**Variant Mapping:**

| Variant | iOS Scheme | iOS Config | Android Variant | Bundle/Package |
|---------|-----------|-----------|-----------------|----------------|
| development | NewReactNativeZustandRNQ | Debug | developmentDebug | .dev |
| staging | Staging | Staging.Debug | stagingDebug | .stg |
| production | Production | Production.Debug | productionDebug | (none) |

**Key Points:**
- `runtimeVersion = VERSION_NAME` ties OTA to native binary version; changing VERSION_NAME splits OTA compatibility
- Plugin generates Gradle flavors (productFlavor) + iOS schemes from config, not vice versa
- `sync-native-env` detects version drift between env and generated native before any write (exit 1 if mismatch)
- `expo prebuild --clean` reproducible: same ExpoConfig → identical native output every time
- Manual edits in ios/ and android/ are lost on next prebuild; use plugin for durable changes

## Expo Updates (OTA)

See [`docs/EXPO_UPDATES.md`](./EXPO_UPDATES.md) for detailed OTA workflow.

**Key Constraints:**
- OTA updates disabled in `__DEV__` (dev client always loads embedded JS)
- Native changes (Gradle, Podfile, native modules) require new store/TestFlight/Play build
- `runtimeVersion` must match binary; OTA never applies to mismatched versions
- Update channel should align with `APP_VARIANT` (development clients pull development channel)

---

**Last Updated:** 2026-07-28
