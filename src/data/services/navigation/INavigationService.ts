/**
 * Route names and their params come from `ReactNavigation.RootParamList`, the registry
 * React Navigation publishes for exactly this. The stack fills it in
 * `presentation/navigator/routes.ts`.
 *
 * Reading the registry rather than importing the param map keeps the dependency arrow
 * pointing the right way: this is the data layer, and importing a type out of
 * `presentation/` would invert the layering — for a type the library already exposes
 * globally.
 *
 * The generic is `Name`, not `RouteName`: `RouteName` is also the name of the route-name
 * constant these services import, and a type parameter that shadows it makes the two
 * impossible to tell apart at a glance.
 */
type RouteParams = ReactNavigation.RootParamList;

export interface INavigationService {
    navigate<Name extends keyof RouteParams>(route: Name, params?: RouteParams[Name]): Promise<void>;

    goBack(): void;

    replaceName<Name extends keyof RouteParams>(route: Name, params?: RouteParams[Name]): Promise<void>;
}
