/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { GluestackUIProvider } from '@presentation/components/ui';
import { AppStack } from '@presentation/navigator';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

const App = () => {
    return (
        <SafeAreaProvider>
            <GluestackUIProvider>
                <AppStack />
            </GluestackUIProvider>
        </SafeAreaProvider>
    );
};

export default App;
