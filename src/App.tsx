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
