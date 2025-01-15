export interface INavigationService {
    navigate<RouteName extends keyof RootStackParamList, Param extends RootStackParamList[RouteName]>(
        route: RouteName,
        params?: Param
    ): Promise<void>;

    goBack(): void;

    replaceName<RouteName extends keyof RootStackParamList, Param extends RootStackParamList[RouteName]>(
        route: RouteName,
        params?: Param
    ): Promise<void>;
}
