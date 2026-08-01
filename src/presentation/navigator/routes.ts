import type { RouteName } from '@/shared/constants';

/**
 * The route → params contract for the root stack.
 *
 * This replaces a generated global:
 *
 * ```ts
 * declare global {
 *     type DefaultStackParamList = Record<keyof typeof RouteName, Record<string, never>>;
 *     export type RootStackParamList = DefaultStackParamList;
 * }
 * ```
 *
 * `Record<string, never>` is the type of an object that can have no properties at all, so
 * *every* route was typed as accepting no params — not "none today", but none possible.
 * Adding `navigate('Detail', { id })` to a screen was a type error with no local fix, in a
 * boilerplate whose entire purpose is being copied into apps that need exactly that.
 *
 * Written out per route instead of generated from `RouteName`, because that is what makes
 * a route able to differ from its neighbours. `undefined` means "takes no params" — the
 * honest current state of all four — and a route that needs them says so:
 *
 * ```ts
 * [RouteName.Detail]: { id: string };
 * ```
 *
 * Registered below into `ReactNavigation.RootParamList`, React Navigation's own global
 * registry. That augmentation is a library extension point — it is what types
 * `useNavigation()` and `navigationRef` everywhere without an import — and is a different
 * thing from the hand-rolled ambient types this codebase removed: it has one declaration
 * site, the library owns the interface, and nothing else can add to it by accident.
 */
export type RootStackParamList = {
    [RouteName.Login]: undefined;
    [RouteName.SignUp]: undefined;
    [RouteName.Main]: undefined;
    [RouteName.Counter]: undefined;
};

declare global {
    // A namespace because React Navigation declares `RootParamList` inside one; module
    // syntax cannot reach into it. The empty body is the whole point — the interface is
    // populated by extension, not by its own members.
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ReactNavigation {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface RootParamList extends RootStackParamList {}
    }
}
