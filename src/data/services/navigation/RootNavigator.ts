import { CommonActions, createNavigationContainerRef } from "@react-navigation/native";

import { NavigatorParamsType } from "@/model";

import { INavigationService } from "./INavigationService";
import { NavigationLogger } from "./NavigationLogger";

import { RouteName } from "@/enums";

class RootNavigator implements INavigationService {
    private static instance: RootNavigator;
    public readonly navigationRef = createNavigationContainerRef();

    private constructor() {}

    static getInstance(): RootNavigator {
        if (!RootNavigator.instance) {
            RootNavigator.instance = new RootNavigator();
        }
        return RootNavigator.instance;
    }

    async navigate<RouteName extends keyof RootStackParamList, Param extends RootStackParamList[RouteName]>(
        route: RouteName,
        params?: Param
    ): Promise<void> {
        if (!this.navigationRef.isReady()) return;

        NavigationLogger.logNavigation(route as string);

        return this.navigationRef.current?.dispatch(
            CommonActions.navigate({
                name: route,
                params: params
            })
        );
    }

    goBack(): void {
        if (this.navigationRef.isReady()) {
            this.navigationRef.current?.dispatch(CommonActions.goBack());
        }
    }

    async replaceName<RouteName extends keyof RootStackParamList, Param extends RootStackParamList[RouteName]>(
        route: RouteName,
        params?: Param
    ): Promise<void> {
        if (!this.navigationRef.isReady()) return;

        NavigationLogger.logReplace(route as string);

        return this.navigationRef.current?.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: route, params: params }]
            })
        );
    }
}

export default RootNavigator.getInstance();

declare global {
    type DefaultStackParamList = Record<keyof typeof RouteName, NavigatorParamsType>;

    export type RootStackParamList = DefaultStackParamList;
}
