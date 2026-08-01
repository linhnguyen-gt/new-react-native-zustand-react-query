import { createStaticNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';

import { RootNavigator } from '@/data/services';

import { KeyboardViewSpacer } from '../components/keyboardSpace';
import { Counter, LoginPage, MainPage, SignUpPage } from '../screens';

import { RouteName } from '@/shared/constants';
import { screenOptions } from '@/shared/helper';

import type { RootStackParamList } from './routes';

/**
 * The root stack, declared as configuration rather than as JSX children.
 *
 * React Navigation 7's static API takes the screen map up front, which is what lets the
 * library derive types from the tree instead of being told them. The dynamic form —
 * `<Stack.Navigator><Stack.Screen …/></Stack.Navigator>` — builds the same navigator, but
 * the screen list exists only at render time, so nothing can check that a `navigate()`
 * call names a route that is actually registered.
 *
 * `createStackNavigator<RootStackParamList>` binds the config to the param map in
 * `routes.ts`, so a screen registered under a name that map does not declare is a compile
 * error, and so is a name in the map with no screen behind it.
 */
const RootStack = createStackNavigator<RootStackParamList>({
    initialRouteName: RouteName.Login,
    screenOptions,
    screens: {
        [RouteName.Login]: LoginPage,
        [RouteName.SignUp]: SignUpPage,
        [RouteName.Main]: MainPage,
        [RouteName.Counter]: Counter,
    },
});

/**
 * `createStaticNavigation` returns the container component itself, so there is no separate
 * `<NavigationContainer>` — it forwards the same `ref`, which is how `RootNavigator` keeps
 * its imperative access for navigation from outside React (the HTTP layer logging a user
 * out, a push notification opening a screen).
 */
const Navigation = createStaticNavigation(RootStack);

const AppStack = () => {
    return (
        <KeyboardViewSpacer>
            <Navigation ref={RootNavigator.navigationRef} />
        </KeyboardViewSpacer>
    );
};

export default AppStack;
