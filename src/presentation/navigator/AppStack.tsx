import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import { KeyboardViewSpacer } from "../components";
import { Counter, LoginPage, MainPage, SignUpPage } from "../screens";

import { RootNavigator } from "@/data";
import { RouteName, screenOptions } from "@/shared";

const Stack = createStackNavigator<RootStackParamList>();

const AppStack = () => {
    return (
        <KeyboardViewSpacer>
            <NavigationContainer ref={RootNavigator.navigationRef}>
                <Stack.Navigator screenOptions={screenOptions} initialRouteName={RouteName.Login}>
                    <Stack.Screen name={RouteName.Login} component={LoginPage} />
                    <Stack.Screen name={RouteName.SignUp} component={SignUpPage} />
                    <Stack.Screen name={RouteName.Main} component={MainPage} />
                    <Stack.Screen name={RouteName.Counter} component={Counter} />
                </Stack.Navigator>
            </NavigationContainer>
        </KeyboardViewSpacer>
    );
};

export default AppStack;
