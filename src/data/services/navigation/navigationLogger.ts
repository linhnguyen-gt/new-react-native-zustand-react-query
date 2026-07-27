import { Logger } from '@/shared/helper';

export class NavigationLogger {
    static logNavigation(route: string): void {
        Logger.debug('Navigation', `navigationRef ready, navigating to ${route}`);
    }

    static logReplace(route: string): void {
        Logger.debug('Navigation', `navigationRef ready, replaceName to ${route}`);
    }
}
