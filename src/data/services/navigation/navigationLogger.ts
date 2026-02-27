export class NavigationLogger {
    static logNavigation(route: string): void {
        if (__DEV__) {
            console.warn(`navigationRef ready, navigating to ${route}`);
        }
    }

    static logReplace(route: string): void {
        if (__DEV__) {
            console.warn(`navigationRef ready, replaceName to ${route}`);
        }
    }
}
