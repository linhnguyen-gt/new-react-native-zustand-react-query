export class NavigationLogger {
    static logNavigation(route: string): void {
        // eslint-disable-next-line no-console
        console.log(`navigationRef ready, navigating to ${route}`);
    }

    static logReplace(route: string): void {
        // eslint-disable-next-line no-console
        console.log(`navigationRef ready, replaceName to ${route}`);
    }
}
