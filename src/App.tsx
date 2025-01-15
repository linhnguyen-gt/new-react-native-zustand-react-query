/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import { GluestackUIProvider, KeyboardViewSpacer } from "@/components";

import { RootNavigator } from "@/services";

import { screenOptions } from "@/helper";

import { RouteName } from "@/enums";
import { LoginPage, MainPage } from "@/screens";

import "../global.css";

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

const App = () => {
    return (
        <GluestackUIProvider>
            <AppStack />
        </GluestackUIProvider>
    );
};

export default App;
