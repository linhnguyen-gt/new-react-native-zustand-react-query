# Project Roadmap

## Current State

**Version:** 1.0.0  
**Status:** Production-ready boilerplate template  
**Last Updated:** 2026-07-28

### What's Working Well

- **HTTP Client:** Robust request/response handling with token refresh single-flight dedupe, rate limiting, request validation
- **Error Handling:** Comprehensive error categorization, context tracking, user-safe messaging
- **State Management:** Clear Zustand + React Query split with proper scope boundaries
- **Config & Validation:** Throw-not-degrade validation, multi-environment support (dev/staging/prod)
- **Native Generation:** Reproducible Expo prebuild + config plugin pipeline
- **Testing (high-coverage areas):** HTTP client lifecycle, error handling, storage, queries, form components, tooling validation
- **Developer Experience:** Clear architecture, type-safe throughout, pre-commit gates, ESLint + Prettier enforcement
- **Documentation:** Architecture, patterns, quality gates documented in `./docs/`

### Current Limitations

- **Test Coverage Gaps:** Store, providers, validation, ErrorBoundary, screen logic untested (58% coverage, 45% branch)
- **Known Bugs:** Password schema has dead code, email validation overly restrictive
- **Dead Code:** Theme system (dark mode dormant), ListView pagination surface unused
- **Tooling:** setup-env.js (586 LOC) and scripts untested; plugin iOS half untested
- **Configuration:** Native half of CI not exercised (android-build.yml runs JS export only, no Gradle)
- **Navigation:** Two idioms coexist (imperative + hook-based); not converged

---

## Prioritized Backlog

All items sorted by **value (impact) / effort ratio**. Rough effort estimates: XS (< 2h), S (2-8h), M (8-24h), L (1-3 days), XL (3+ days).

### 🔴 P0 — Critical Gaps (Fix Before Production Use)

#### P0.1: Fix Validation Schema Bugs
**Effort:** XS | **Impact:** High  
**Status:** Open

- Remove dead `.min(1)` from passwordSchema chains (schemas.ts:15-18)
- Remove email domain restriction (`.endsWith('.com')`) — accept `.io`, `.dev`, `.co.uk`
- Add test cases for both fixes

**Why:** Sample rules in production auth block valid users. Should be removed or replaced with real requirements.

#### P0.2: Add Store Tests
**Effort:** S | **Impact:** High  
**Status:** Open

- Test store creation via `createStore` wrapper
- Test Reactotron enhancer fallback (missing Reactotron, dev env)
- Test `resetAllStores()` and reset function registry
- Test counter store actions and initial state
- Test state selectors with and without `useShallow`

**Why:** Zero coverage on state management; critical path for every feature.

#### P0.3: Test QueryClient Configuration
**Effort:** XS | **Impact:** Medium  
**Status:** Open

- Assert queryClient defaults: staleTime 5m, gcTime 10m, retry 2, refetchOnWindowFocus false
- Test that it's a singleton instance
- Verify Reactotron is NOT sourced from queryClient (deliberate prod behavior)

**Why:** QueryClient config drives behavior; misconfiguration causes stale data or thundering herd.

### 🟠 P1 — High-Value Improvements (Do Before 1.0 Release)

#### P1.1: Add Validation Tests
**Effort:** S | **Impact:** High  
**Status:** Open

- Test all Zod schemas (loginSchema, signUpSchema, field schemas)
- Test cross-field validation (confirmPassword mismatch detection)
- Test error message mapping to ErrorCode
- Test invalid inputs (missing fields, wrong types, boundary values)

**Why:** Validation is a silent contract; untested changes break forms in production.

#### P1.2: Add ErrorBoundary Tests
**Effort:** S | **Impact:** Medium  
**Status:** Open

- Test render error capture and fallback UI in prod
- Test detail display in __DEV__ mode
- Test resetKeys behavior (reset on prop change)
- Test error logging via Logger
- Test retry mechanism

**Why:** Handles unrecoverable render errors; needs explicit behavior verification.

#### P1.3: Add Screen Tests
**Effort:** M | **Impact:** High  
**Status:** Open

- Test Main screen: data loading, empty state, error display, list rendering
- Test Counter screen: increment/decrement via Zustand, selector behavior
- Test SignIn screen: form submission, imperative navigation, error handling
- Test SignUp screen: form validation, async submission, double-submit guard
- Mock React Query and navigation for isolation

**Why:** User-facing feature logic untested; integration failures caught late.

#### P1.4: Consolidate Style Props Creation Logic
**Effort:** S | **Impact:** Medium  
**Status:** Open

- Extract `createStyleFromProps()` into single reusable utility (currently 8× duplication)
- Refactor BaseBox, Button, HStack, VStack, ScrollView, Image, Touch, TouchableComponent
- Add test case for style composition

**Why:** DRY violation; each dupe is a maintenance burden and potential for bugs.

#### P1.5: Fix update-readme-versions.js Package List
**Effort:** XS | **Impact:** Low  
**Status:** Open

- Remove stale packages (@reduxjs/toolkit, redux-saga) no longer in repo
- Update package list to match actual pnpm-lock.yaml dependencies
- Test that badges update correctly

**Why:** Script silently skips undefined packages; updates miss version bumps (e.g., badges may not sync).

#### P1.6: Converge Props Interface Naming
**Effort:** M | **Impact:** Low  
**Status:** Open

- Choose one pattern: `I<Name>Props` or `<Name>Props`
- Recommended: `<Name>Props` (aligns with React conventions, simpler)
- Refactor all UI components in `src/presentation/components/ui/`
- Update code-standards.md with chosen convention

**Why:** Inconsistency confuses developers; small effort for clarity.

#### P1.7: Converge Navigation Patterns
**Effort:** M | **Impact:** Medium  
**Status:** Open

- Audit SignIn (imperative RootNavigator.replaceName) vs SignUp (useNavigation hook)
- Choose pattern: recommend hook-based for consistency
- Refactor SignIn to use useNavigation
- Document chosen pattern with rationale

**Why:** Two idioms fragment the codebase; developers don't know which to use.

#### P1.8: Resolve the Two Layer-Boundary Inversions
**Effort:** S | **Impact:** Medium  
**Status:** Open

- `src/shared/helper/storage.ts:1` imports `@/data/services/secureStorage` — a foundation layer reaching into `data/`. Fix by moving the refresh-token helper into `src/data/services/`, leaving `shared/` dependency-free.
- `src/data/services/reactotron/index.ts:1` imports `@/app/providers/queryClient` — `data/` reaching into `app/`. Lower risk: the module is `require()`d only under `__DEV__` and never ships. Either accept it with a comment or invert it by having the app inject the client.
- Consider adding `eslint-plugin-import` `no-restricted-paths` (or `eslint-plugin-boundaries`) so a third violation fails `pnpm lint` instead of passing review.

**Why:** The layer model in `system-architecture.md` is currently a convention with two documented exceptions and zero enforcement. Either enforce it or stop asserting it.

### 🟡 P2 — Nice-to-Have Improvements

#### P2.1: Activate Dark Mode
**Effort:** M | **Impact:** Low  
**Status:** Open

- Pass `mode` prop from App.tsx to ThemeProvider (currently hardcoded 'light')
- Test dark palette in Storybook or manual testing
- Or: remove dark theme code if not needed (cleanup instead of feature)

**Why:** Theme infrastructure exists but unused; either complete or remove.

#### P2.2: Implement Infinite Scroll or Remove ListView Pagination Surface
**Effort:** M | **Impact:** Low  
**Status:** Open

- Option A: Implement `onPressLoadMore` in ListView (add cursor-based pagination to API)
- Option B: Remove unused `onPressLoadMore` prop and simplify
- Update Main screen accordingly

**Why:** Surface without implementation is misleading; choose one direction.

#### P2.3: Wire ErrorHandler Callbacks for Instrumentation
**Effort:** M | **Impact:** Medium (if using Sentry or analytics)  
**Status:** Open

- Implement Sentry stub: hook `onError`, `onAuthError`, `onNetworkError` → Sentry.captureException()
- Or: replace TODO stub with noop if instrumentation not needed
- Test callbacks are invoked correctly

**Why:** Error context is rich but unused; wiring unlocks insights if/when needed.

#### P2.4: Add iOS Config Plugin Tests
**Effort:** L | **Impact:** Medium  
**Status:** Open

- Export ensureBuildConfigurations and scheme XML generators for testing (currently internal)
- Test Podfile mutation (generatePodfileProps)
- Test scheme generation (all 6 combinations: Staging/Production × Debug/Release)
- Test re-entrancy (plugin idempotent)

**Why:** iOS half of config plugin is untested; drift from template not caught.

#### P2.5: Extend CI to Build Native (Android + iOS)
**Effort:** L | **Impact:** Medium  
**Status:** Open

- Enhance android-build.yml to run actual Gradle build (not just expo export)
- Add ios-build.yml native build targets (Staging and Production schemes)
- Cache Gradle + CocoaPods
- Catch native regression early

**Why:** Android/iOS builds not tested in CI; native issues only caught locally.

### 🔵 P3 — Future Enhancements & Exploration

#### P3.1: Migrate from Expo Config Plugin to Native Module for Custom Config
**Effort:** XL | **Impact:** Low (if needs exceed plugin)  
**Status:** Blocked (low priority)

- If config plugin hits limits (complex native logic), consider Expo module
- Requires native Swift/Kotlin module development
- Deferred until justified by actual need

#### P3.2: Add Offline-First Sync (If Requirements Emerge)
**Effort:** XL | **Impact:** Depends on product  
**Status:** Out of Scope (design required)

- Implement sync engine for offline-capable endpoints
- Choose library (WatermelonDB, Realm, custom)
- Design conflict resolution
- Deferred; requires product requirements

#### P3.3: Instrument with Sentry + Analytics
**Effort:** L | **Impact:** Medium (production-only)  
**Status:** Deferred

- Wire ErrorHandler callbacks to Sentry
- Add crash reporting and performance monitoring
- Implement analytics events for key user flows
- Deferred to first production app using template

---

## Test Coverage Ratchet

**Current:** 58% statements, 45% branches, 51% functions, 59% lines  
**Target:** 65% statements, 55% branches, 60% functions, 65% lines

**Path to target:**
1. Add store tests (est. +5% statements, +10% branches)
2. Add validation tests (est. +3% statements, +8% branches)
3. Add ErrorBoundary tests (est. +2% statements, +5% branches)
4. Add screen tests (est. +8% statements, +12% branches, +8% functions)

**Total improvement:** +18% statements, +35% branches expected (reaching ~76% / 80% / 70%)

---

## Known Issues Register

| ID | Title | Severity | Status | Est. Fix Time |
|----|-------|----------|--------|--------------|
| BUG-001 | Password schema `.min(1)` dead code | Low | Open | XS (< 2h) |
| BUG-002 | Email validation rejects `.io`, `.dev`, `.co.uk` | Low | Open | XS (< 2h) |
| DEBT-001 | 8× duplication of `createStyleFromProps()` | Medium | Open | S (2-8h) |
| DEBT-002 | Props interface naming inconsistent (I-prefix vs bare) | Low | Open | M (8-24h) |
| DEBT-003 | Navigation patterns split (imperative vs hook) | Medium | Open | M (8-24h) |
| DEBT-004 | Theme system exists but dark mode dormant | Low | Open | M (8-24h) or cleanup |
| DEBT-005 | ListView pagination surface unused | Low | Open | M (8-24h) to implement or remove |
| TEST-001 | Store (createStore, actions, reset) untested | High | Open | S (2-8h) |
| TEST-002 | QueryClient config not asserted | Medium | Open | XS (< 2h) |
| TEST-003 | Validation schemas untested | High | Open | S (2-8h) |
| TEST-004 | ErrorBoundary logic untested | High | Open | S (2-8h) |
| TEST-005 | Screen components untested | High | Open | M (8-24h) |
| TEST-006 | setup-env.js (586 LOC) untested | High | Open | L (1-3 days) |
| TEST-007 | Plugin iOS config generators untested | Medium | Open | M (8-24h) |
| CI-001 | Android native build not tested (CI runs JS export only) | Medium | Open | L (1-3 days) |
| CI-002 | iOS Staging/Production schemes never compiled in CI | Medium | Open | L (1-3 days) |
| CONFIG-001 | update-readme-versions.js package list stale | Low | Open | XS (< 2h) |
| CONFIG-002 | TypeScript 7.x upgrade blocked by Expo pin | Low | Deferred | Waits on Expo |
| CONFIG-003 | Plugin anchors (Gradle, Podfile) subject to drift | Medium | Mitigated | prebuld --clean + test fixture |

---

## Constraints & Watch Items

- **Expo SDK pin:** All dependencies pinned by Expo SDK 57.0.0. Check `relatedPackages` and `bundledNativeModules.json` before upgrading anything.
- **React Native template:** Config plugin anchors (@generated blocks) must match installed template; drift after SDK bump may cause prebuild failures.
- **iOS scheme count:** Plugin generates 6 schemes (3 variants × 2 configs); drift from template or plugin config breaks IDE builds.
- **Pre-commit coverage:** `lefthook` glob-scoped; changes to `ios/` or `android/` only run **no gates** — manual verification required.
- **TypeScript 7.x:** Currently pinned by Expo at `~6.0.3`; bump will unblock `@typescript-eslint` peer range but deferred until Expo moves.

---

## How to Contribute

1. **Pick an item from backlog** (start with P0/P1)
2. **Run tests locally:** `pnpm test` (no coverage) or `pnpm test:ci` (enforces thresholds)
3. **Follow code-standards.md** for naming, typing, patterns
4. **Commit via conventional commits:** `feat(store): add tests for createStore wrapper`
5. **Push and open PR** — CI runs lint, typecheck, test (all must pass)

---

**Last Updated:** 2026-07-28  
**Template Version:** 1.0.0  
**Maintainer:** Linh Nguyen (@linhnguyen-gt)
