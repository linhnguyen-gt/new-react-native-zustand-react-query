/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";

import { screenOptions } from "@/helper";

import { RootNavigator } from "@/data";
import { RouteName } from "@/enums";
import { GluestackUIProvider, KeyboardViewSpacer } from "@/presentation";
import { LoginPage, MainPage } from "@/presentation/screens";

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
