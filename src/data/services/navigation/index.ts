// `NavigatorParamsType` is no longer re-exported. It was `Record<string, never>` — the
// per-route params type feeding the old generated global — and had no consumer beyond that
// declaration. Route params are now declared per route in
// `presentation/navigator/routes.ts`.
export { default as RootNavigator } from './rootNavigator';
