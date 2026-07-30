# Code Standards & Conventions

## File & Folder Naming

- **Folders:** kebab-case (`src/shared/config/`, `src/data/services/`)
- **Component files:** PascalCase.tsx (e.g., `SignUp.tsx`, `Button.tsx`)
- **Utilities/Services:** camelCase.ts (e.g., `httpClient.ts`, `logger.ts`)
- **Tests:** `__tests__/` co-located with source; file name matches source (e.g., `httpClient.test.ts`)
- **Path alias:** `@/` is canonical (TypeScript paths, Babel, Jest all aliased)

## Type Naming

- **Global/Ambient types:** Declared in `src/shared/models/` (e.g., `CounterStateData`)
- **Types:** `PascalCase` (e.g., `User`, `ApiResponse`, `CounterState`)
- **Type imports:** Use `import type {...}` (enforced by `verbatimModuleSyntax`)
- **Props interfaces:**
  - **UI components:** `I<ComponentName>Props` (e.g., `IButtonProps`) — **TO CONVERGE:** inconsistent; some use `<Name>Props`
  - **Feature components:** `<Name>Props` (e.g., `SignUpProps`)
- **Enum vs literals:** Prefer `as const` unions over `enum`

```typescript
// Preferred
const RouteName = {
  Login: 'Login',
  SignUp: 'SignUp',
} as const;
type RouteName = typeof RouteName[keyof typeof RouteName];

// Avoid
enum RouteName { Login = 'Login', SignUp = 'SignUp' }
```

## Component Patterns

### UI Primitives (src/presentation/components/ui/)

**File structure:**
```
Box.tsx (default export)
├─ Props type: `Omit<NativeProps, keyof StyleProps> & StyleProps & VariantProps<typeof boxStyle> & {className?: string}`
├─ Define styles inline or in `styles.tsx`
├─ Export default + set displayName
└─ Barrel export from `ui/index.ts`
```

**Props typing:**
```typescript
type IBoxProps = Omit<NativeProps, keyof StyleProps> & 
  StyleProps & 
  VariantProps<typeof boxStyle> & 
  { className?: string };

export default function Box({ className, size = 'md', ...props }: IBoxProps) {
  const styles = boxStyle({ size });
  return <View className={cn(styles, className)} {...props} />;
}
Box.displayName = 'Box';
```

### Feature Components

**Patterns:**
- Keep stateless and accept props for behavior
- Use hooks for data fetching/state if needed
- Optionally extract form logic to `hooks/useFeature.ts`
- Test via snapshot + behavior tests

**Example (SignUp with form hook):**
```typescript
// src/presentation/screens/signup/index.tsx
export function SignUp({ navigation }: ISignUpProps) {
  const form = useSignUpForm(); // extracted logic
  return (
    <ScrollView>
      <ControlledInput control={form.control} name="email" />
      <Button onPress={form.handleSubmit(onSubmit)} />
    </ScrollView>
  );
}

// src/presentation/screens/signup/hooks/useSignUpForm.ts
export function useSignUpForm() {
  const submitRef = useRef(false);
  const form = useForm({ resolver: zodResolver(signUpSchema) });
  
  // Double-submit guard
  const handleSubmit = (onSuccess: (...) => void) => 
    form.handleSubmit(async (data) => {
      if (submitRef.current) return;
      submitRef.current = true;
      try {
        await onSuccess(data);
      } finally {
        submitRef.current = false;
      }
    });
  
  return { ...form, handleSubmit };
}
```

## Styling with tv()

### tv() — Custom Variant System

**Definition (src/shared/style/tailwind-variants.ts):**
```typescript
export function tv<T extends VariantSchema>(
  baseStyles?: string,
  variants?: T,
) {
  return (props: VariantProps<T>): string => {
    // Apply base → variants → compoundVariants (by declaration order)
    // Resolve conflicts via cn() = twMerge
  };
}

export type VariantProps<T> = T extends VariantSchema
  ? { [K in keyof T]?: ValueOf<T[K]> }
  : never;
```

**Usage:**
```typescript
// Define styles
const buttonStyle = tv({
  base: 'px-4 py-2 rounded font-medium',
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
    variant: {
      primary: 'bg-blue-500 text-white',
      secondary: 'bg-gray-200 text-black',
    },
  },
});

// Apply in component
export function Button({ size = 'md', variant = 'primary', ...props }) {
  const styles = buttonStyle({ size, variant });
  return <Pressable className={styles} {...props} />;
}
```

**Rules:**
- No `defaultVariants` (component destructuring sets defaults)
- No `compoundVariants` (hand-roll if needed — not a first-class feature)
- Use `cn()` = twMerge to resolve class conflicts
- Always destructure variant props to provide defaults

## Form Handling (React Hook Form + Zod)

### Validation Schemas (src/shared/validation/schemas.ts)

```typescript
// Compose field schemas from constants (no inline strings)
const emailSchema = z.string().email(Errors.INVALID_EMAIL);
const passwordSchema = z.string().min(6, Errors.PASSWORD_MIN_LENGTH);

// Compose into form schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine(
  data => data.password === data.confirmPassword,
  { message: Errors.PASSWORD_MISMATCH, path: ['confirmPassword'] }
);
```

### Form Setup (in component or hook)

```typescript
type SignUpForm = z.infer<typeof signUpSchema>;

const form = useForm<SignUpForm>({
  defaultValues: { email: '', password: '', confirmPassword: '' },
  resolver: zodResolver(signUpSchema),
  mode: 'onChange', // validate on every change
});

// Do NOT destructure formState — rely on handleSubmit validation
const onSubmit = form.handleSubmit(async (data) => {
  // Only called if validation passes
  await signUpApi.register(data);
});
```

**Convention (observed in useSignUpForm):**
- Do NOT extract `formState` → encourages checking `isSubmitting` instead of using ref guard
- Use `ref` for double-submit prevention (cheaper than formState re-renders)
- Validation is owned by `handleSubmit` + resolver, not by component logic

### Known Issues

1. **passwordSchema chains `.min(6)` then `.min(1)`** (schemas.ts:15-18)
   - The `.min(1)` is dead code
   - Empty password reports `PASSWORD_MIN_LENGTH` not `REQUIRED_PASSWORD_INPUT`
   - Reason: likely copy-paste from generic validation util
   - **Status:** Documented in roadmap as "validation chain dead code"

2. **emailSchema enforces `.endsWith('.com')`** (schemas.ts:20)
   - Rejects `.io`, `.dev`, `.co.uk` etc.
   - Likely leftover sample rule
   - **Status:** Documented in roadmap as "email domain restriction"

## Error Handling

### Throwing Errors

```typescript
// Data layer: throw AppError or subclass
throw new HttpError(400, responseData, 'Failed to fetch user');
throw new NetworkError('Network unreachable', originalError);
throw new ValidationError('Invalid input', ErrorCode.VALIDATION_ERROR);

// App layer: use error as-is, no re-wrapping
try {
  const data = await api.fetchUser();
} catch (error) {
  // error is already AppError; React Query marks hook state.error
}
```

### Accessing Errors in UI

```typescript
const { error, isLoading, data } = useResponses();

if (error) {
  return <Text>{error.getUserMessage()}</Text>; // Localized, user-safe copy
}

// For debugging (dev-only): error.toJSON() includes full context
if (__DEV__) console.log(error.toJSON());
```

### Handling via ErrorBoundary

```typescript
// App.tsx
<ErrorBoundary
  onError={(error) => logger.error(error)} // dev-only
  resetKeys={[someKey]} // re-render if key changes
>
  <AppStack />
</ErrorBoundary>
```

**Note:** ErrorBoundary catches **render errors only**, not async/navigation errors. For API errors, read from query hook state.

## Logging

### Logger Rules

```typescript
import { Logger } from '@/shared/helper/logger';

Logger.error('message', data); // Only in __DEV__
Logger.warn('message');        // Only in __DEV__
Logger.info('message');        // Only in __DEV__
Logger.debug('message');       // Only in __DEV__
```

**Key behavior:**
- All output is a no-op outside `__DEV__`
- Inside `__DEV__`, data is sanitized before logging:
  - By key: `password`, `token`, `secret`, `key`, `authorization`, `auth`
  - By regex: Bearer tokens, `password:`, `token:`, `key:`, `secret:` patterns
  - Arrays and Error objects handled recursively
  - Circular reference detection (max depth 8)
- Never log tokens, passwords, or sensitive fields

**Anti-pattern:**
```typescript
// ❌ Bad: logs raw secret
Logger.info('Token:', refreshToken);

// ✅ Good: sanitization catches it
Logger.info('Session established', { refreshToken }); // becomes '[REDACTED]'
```

## State Management

### Zustand Store Pattern (Canonical)

```typescript
// Step 1: Declare ambient global type (src/shared/models/)
export interface CounterStateData {
  count: number;
}

// Step 2: Extend with actions (src/app/store/)
interface CounterState extends CounterStateData {
  increment: () => void;
  decrement: () => void;
}

// Step 3: Create initial state const
const initialState: CounterStateData = {
  count: 0,
};

// Step 4: Define store with actions
export const useCounterStore = createStore<CounterState>(
  'Counter',
  (set) => ({
    ...initialState,
    increment: () => set(state => ({ count: state.count + 1 })),
    decrement: () => set(state => ({ count: state.count - 1 })),
  })
);

// Step 5: Export from barrel (src/app/store/index.ts)
export const store = {
  useCounterStore,
  resetAllStores,
};
```

**Rules:**
- Always use `createStore` wrapper (handles Reactotron + fallback)
- Separate ambient type + store type + initial state const
- Pass store name (used in Reactotron devtools)
- Export from barrel as part of `store` object

### React Query Hook Pattern

```typescript
// src/data/api/responseApi.ts
export async function getResponseData(signal?: AbortSignal) {
  return HttpClient.getInstance().request<ApiResponse>({
    method: 'GET',
    endpoint: '/responses',
    signal, // Cancellation
  });
}

// src/data/queries/responseQueries.ts
export function useResponses() {
  return useQuery({
    queryKey: ['responses', 'list'],
    queryFn: ({ signal }) => responseApi.getResponseData(signal),
  });
}

// Component
const { data, isLoading, error } = useResponses();
```

**Rules:**
- queryKey is an inline array (no factory today)
- queryFn receives `{ signal }` for cancellation
- API layer always accepts optional `signal` parameter
- No `invalidateQueries` today; post-mutation data replaces via setState

## Quality Gates & Commands

| Command | What It Does | When It Runs | Enforces |
|---------|----------|--------------|----------|
| `pnpm lint` | ESLint + Prettier | Local (pre-commit), CI | Naming, no-shadow, no-console, quotes, semi, prettier format |
| `pnpm lint:tsc` | TypeScript strict check | CI only (not local pre-commit) | Strict mode, no `any`, type inference, unused vars |
| `pnpm test` | Jest suite (no coverage) | Local (pre-commit) | Unit + integration tests pass |
| `pnpm test:ci` | Jest + coverage | CI only | Tests + coverage thresholds (stmt 58%, branch 45%, func 51%, line 59%) |
| `pnpm prebuild:clean` | Regenerate native (manual) | Before native changes | Reproducible ios/ + android/ from ExpoConfig |
| `pnpm update-versions` | Sync README badges | Postinstall + pre-commit | Badge versions match package.json |

**Pre-commit hooks (lefthook.yml):**
- `versions` (glob package.json) → update README badges
- `lint-staged` (glob `*.{js,ts,jsx,tsx}`) → eslint --fix + prettier --write
- `test` (glob `src/**/*.{js,ts,jsx,tsx}`) → jest (no coverage)
- `commit-msg` → commitlint conventional

**CI gates:**
- Typecheck: `pnpm lint:tsc` (full suite, scripts/ + plugins/ excluded)
- Lint: `pnpm lint` (ESLint + Prettier)
- Test: `pnpm test:ci --coverage` (enforces thresholds)

**Important:**
- `pnpm lint:tsc` runs **only in CI**, not locally — hidden regressions are caught late
- Coverage thresholds only apply to `test:ci` — local `pnpm test` runs with no threshold enforcement
- Pre-commit gates do NOT include typecheck — use IDE autofix or rely on CI

## Known Inconsistencies & Convergence Points

| Inconsistency | Current State | Converge To |
|---------------|---------------|------------|
| Props interface naming | `I<Name>Props` (ui/) vs `<Name>Props` (features) | Pick one (recommend `<Name>Props` everywhere) |
| Navigation idioms | Imperative (SignIn: `RootNavigator.replaceName`) + Hook-based (SignUp: `useNavigation()`) | Choose one pattern, apply consistently |
| Tailwind variants | Hand-rolled `tv()` (avoids dependency) | Keep as-is if meeting needs |
| Dark mode | Theme system exists but only light is active | Activate or remove to reduce dead code |
| ListView pagination | Surface supports `onPressLoadMore` but nothing uses it | Remove or implement infinite scroll |
| ErrorHandler callbacks | `onError`, `onAuthError`, `onNetworkError` wired but unused | Implement Sentry/analytics integration or remove |

## TypeScript Configuration

**Enabled:**
- `strict: true` (strictNullChecks, noImplicitAny, strictPropertyInitialization, etc.)
- `noUncheckedIndexedAccess` (indexing returns T | undefined)
- `verbatimModuleSyntax` (enforces `import type` syntax)
- `isolatedModules` (single-file transpilers can handle each file independently)

**Excluded from `pnpm lint:tsc`:**
- `scripts/` (build scripts, no type checking)
- `plugins/` (config plugins, no type checking)

## Commit Conventions

```bash
# Format: <type>(<scope>): <subject>
# Types: feat, fix, refactor, test, chore, docs
# Scope: optional, lowercase
# Subject: imperative, lowercase, no period

git commit -m "feat(auth): add refresh token single-flight dedupe"
git commit -m "fix(validation): remove dead .min(1) chain in password schema"
git commit -m "test(http-client): add rate limiter rejection coverage"
```

**Configured via commitlint: @commitlint/config-conventional**

---

**Last Updated:** 2026-07-28
