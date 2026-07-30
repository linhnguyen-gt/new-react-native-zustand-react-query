# Expo Updates Integration

This project uses `expo-updates` for OTA JavaScript updates. Environment selection is Expo-native and available through both CLI scripts and native IDE variants.

## Configuration Model

Environment variables are loaded from:

- `.env`
- `.env.staging`
- `.env.production`

Required Expo Updates keys:

```env
EXPO_PROJECT_ID=your-project-id
EXPO_UPDATE_URL=https://u.expo.dev/your-project-id
EXPO_UPDATE_CHANNEL=development
```

`app.config.ts` maps those values into:

```ts
updates: {
  url: process.env.EXPO_UPDATE_URL,
  checkAutomatically: 'ON_LOAD',
  fallbackToCacheTimeout: 0,
},
runtimeVersion: process.env.VERSION_NAME || '1.0.0',
extra: {
  updateChannel: process.env.EXPO_UPDATE_CHANNEL,
}
```

## Variant Mapping

Use `APP_VARIANT` to pick the environment in scripts:

- `development`
- `staging`
- `production`

The repo scripts already do this for you and target the generated native variants:

```bash
pnpm android
pnpm android:stg
pnpm android:prod
pnpm ios
pnpm ios:stg
pnpm ios:prod
```

Native IDE builds use the generated schemes and flavors:

- Xcode schemes: `NewReactNativeZustandRNQ` for development, `Staging`, `Production`
- Xcode configurations: `Debug` for development, `Staging.Debug`, `Production.Debug`
- Android variants: `developmentDebug`, `stagingDebug`, `productionDebug`

If you need to regenerate native folders:

```bash
pnpm prebuild:clean
```

## Build Before OTA

OTA updates only apply to binaries whose native runtime already contains the matching `runtimeVersion`.

Build a client for the target variant first:

```bash
# Development client
pnpm android
pnpm ios

# Production binary
pnpm android:prod
pnpm ios:prod
```

## Publish Updates

Preferred flow:

```bash
pnpm update:push
```

The script:

- prompts for channel
- loads the matching `.env` file
- sets `APP_VARIANT` for Expo config resolution
- runs `eas update --channel=... --environment=...`

List updates:

```bash
pnpm update:list
pnpm update:check
```

## Test Flow

Quick helper:

```bash
pnpm update:test
```

Manual flow:

1. Build a client for the target variant with `pnpm android`, `pnpm ios`, or the staging/production equivalents.
2. Make a JS-only change.
3. Run `pnpm update:push`.
4. Reopen the installed app and verify the update modal and reload flow.

## Constraints

- OTA updates are disabled in `__DEV__`.
- Native changes still require a new store/TestFlight/Play build.
- `runtimeVersion` is tied to `VERSION_NAME`, so changing that value splits OTA compatibility.
- The update channel should stay aligned with `APP_VARIANT` unless you have a deliberate release strategy.

## Troubleshooting

If updates do not apply:

1. Check `EXPO_PROJECT_ID` and `EXPO_UPDATE_URL` in the correct `.env` file.
2. Confirm the published channel matches the app's `APP_VARIANT`.
3. Confirm the installed binary was built with the same `VERSION_NAME`.
4. Rebuild the native client after changing any native dependency or Expo config that affects runtime.

## References

- https://docs.expo.dev/versions/latest/sdk/updates/
- https://docs.expo.dev/eas-update/introduction/
- https://docs.expo.dev/eas-update/runtime-versions/
