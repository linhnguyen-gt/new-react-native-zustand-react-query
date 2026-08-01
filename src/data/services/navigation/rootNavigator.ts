import { CommonActions, createNavigationContainerRef, type ParamListBase } from '@react-navigation/native';

import { type INavigationService } from './INavigationService';
import { NavigationLogger } from './navigationLogger';

/**
 * Route names and params, read from React Navigation's own registry — see
 * `INavigationService.ts` for why this file does not import the param map directly.
 */
type RouteParams = ReactNavigation.RootParamList;

/**
 * Imperative navigation from outside the React tree.
 *
 * The `declare global` block that used to close this file is gone. It generated
 * `RootStackParamList` as `Record<keyof typeof RouteName, Record<string, never>>` — a map
 * in which every route accepted no params and none ever could — and published it
 * program-wide, so nothing had to import it and nothing could tell where it came from.
 * The route contract now lives in `presentation/navigator/routes.ts` and reaches this file
 * through `ReactNavigation.RootParamList`, the extension point the library provides.
 */
class RootNavigator implements INavigationService {
    /**
     * Parameterised on `ParamListBase`, not on the app's route map.
     *
     * The container produced by `createStaticNavigation` accepts a ref over the base param
     * list; a ref narrowed to `RootParamList` is not assignable to it, because container
     * refs are invariant in their param list. Nothing is lost by widening here — the typed
     * surface callers use is `INavigationService`, whose `navigate`/`replaceName` are
     * checked against `ReactNavigation.RootParamList`, and dispatch goes through
     * `CommonActions` by route name regardless.
     */
    public readonly navigationRef = createNavigationContainerRef<ParamListBase>();

    async navigate<Name extends keyof RouteParams>(route: Name, params?: RouteParams[Name]): Promise<void> {
        if (!this.navigationRef.isReady()) return;

        NavigationLogger.logNavigation(route as string);

        return this.navigationRef.current?.dispatch(CommonActions.navigate(route as string, params));
    }

    goBack(): void {
        this.navigationRef?.current?.dispatch(CommonActions.goBack());
    }

    async replaceName<Name extends keyof RouteParams>(route: Name, params?: RouteParams[Name]): Promise<void> {
        if (!this.navigationRef.isReady()) return;

        NavigationLogger.logReplace(route as string);

        return this.navigationRef.current?.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: route as string, params }],
            })
        );
    }
}

export default new RootNavigator();
