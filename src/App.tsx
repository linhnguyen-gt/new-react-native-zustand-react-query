/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { GluestackUIProvider } from '@presentation/components/ui';
import { AppStack } from '@presentation/navigator';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

const App = () => {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <GluestackUIProvider>
                    <AppStack />
                </GluestackUIProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
};

export default App;
