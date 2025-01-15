/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";

import { AppStack, GluestackUIProvider } from "@/presentation";

import "../global.css";

const App = () => {
    return (
        <GluestackUIProvider>
            <AppStack />
        </GluestackUIProvider>
    );
};

export default App;
