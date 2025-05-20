import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

import { GluestackUIProvider } from "./presentation/components/ui";
import { AppStack } from "./presentation/navigator";

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
