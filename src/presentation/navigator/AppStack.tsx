import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import { KeyboardViewSpacer } from "../components";
import { LoginPage, MainPage } from "../screens";

import { RootNavigator } from "@/data";
import { RouteName } from "@/enums";
import { screenOptions } from "@/shared";

const Stack = createStackNavigator();

const AppStack = () => {
    return (
        <KeyboardViewSpacer>
            <NavigationContainer ref={RootNavigator.navigationRef}>
                <Stack.Navigator screenOptions={screenOptions} initialRouteName={RouteName.Login}>
                    <Stack.Screen name={RouteName.Login} component={LoginPage} />
                    <Stack.Screen name={RouteName.Main} component={MainPage} />
                </Stack.Navigator>
            </NavigationContainer>
        </KeyboardViewSpacer>
    );
};

export default AppStack;
