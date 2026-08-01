/**
 * Types for the shared variant table.
 *
 * A sibling declaration file, because `app.config.ts` reaches this module through
 * `require()` — which TypeScript types as `any`. Without this, replacing the local
 * `Record<AppVariant, {...}>` annotation with the shared table silently traded the
 * exhaustiveness check away: adding a fourth variant, or dropping `updateChannel`, would
 * stop being a compile error.
 */

export type AppVariant = 'development' | 'staging' | 'production';

export interface VariantConfig {
    bundleIdentifier: string;
    packageName: string;
    /**
     * Prefix for generated Xcode build configuration names.
     *
     * Inert for `development`: the iOS plugin skips the default variant when generating
     * per-variant configurations and schemes, so no `Development.Debug` or
     * `Development.xcscheme` exists. Use `iosScheme`/`iosConfiguration` for what is
     * actually built.
     */
    scheme: string;
    updateChannel: string;
    androidVariant: string;
    iosScheme: string;
    iosConfiguration: string;
}

export declare const IOS_PROJECT_NAME: string;
export declare const BASE_BUNDLE_IDENTIFIER: string;
export declare const BASE_PACKAGE_NAME: string;
export declare const DEFAULT_VARIANT: AppVariant;
export declare const VARIANTS: Record<AppVariant, VariantConfig>;
export declare const VARIANT_ENV_FILES: Record<AppVariant, string>;

/** EAS ships only development/preview/production, so `staging` maps onto `preview`. */
export type EasEnvironment = 'development' | 'preview' | 'production';

export declare const VARIANT_EAS_ENVIRONMENTS: Record<AppVariant, EasEnvironment>;
export declare function getAndroidAppId(variantName: AppVariant): string;
