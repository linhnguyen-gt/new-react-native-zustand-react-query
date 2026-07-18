/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { GluestackUIProvider } from '@presentation/components/ui';
import { AppStack } from '@presentation/navigator';
import React from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

LogBox.ignoreLogs(['SafeAreaView has been deprecated', 'InteractionManager has been deprecated']);

// Initialise Reactotron explicitly at boot, in dev only.
//
// It is an inline require rather than a static import on purpose: Metro performs no
// cross-module dead-code elimination, so a static import would ship the Reactotron
// graph — and its XHR interceptor — into release bundles regardless of any runtime
// guard. The minifier drops a require() behind the __DEV__ constant.
//
// Without this, dev initialisation depended on the store factory being reached
// through a screen's import chain; lazy-loading or deleting that screen would have
// silently disabled Reactotron with no error to explain it.
if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/data/services/reactotron');
}

import ErrorBoundary from '@presentation/components/ErrorBoundary';
import ModalUpdate from '@presentation/components/modalUpdate';

const App = () => {
    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <GluestackUIProvider>
                        <AppStack />
                        <ModalUpdate />
                    </GluestackUIProvider>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
};

export default App;
