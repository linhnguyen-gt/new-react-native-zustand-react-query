/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";

import "../global.css";
import { GluestackUIProvider } from "./presentation/components/ui";
import { AppStack } from "./presentation/navigator";

const App = () => {
    return (
        <GluestackUIProvider>
            <AppStack />
        </GluestackUIProvider>
    );
};

export default App;
