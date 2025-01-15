import React from "react";
import { StatusBar, useColorScheme } from "react-native";
import { Colors } from "react-native/Libraries/NewAppScreen";

import { Box, Loading, MyTouchable, ScrollView, Text, VStack } from "../../components";
import { useResponse } from "../../hooks";

import { environment, RootNavigator } from "@/data";
import { RouteName } from "@/shared";

const MainPage = () => {
    const { response, isLoading, error } = useResponse();
    const isDarkMode = useColorScheme() === "dark";

    if (error) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center">
                <Text size="xl" color="error" fontWeight="bold">
                    Error: {error.message}
                </Text>
            </Box>
        );
    }

    return (
        <Box flex={1} backgroundColor={isDarkMode ? Colors.darker : Colors.lighter}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <ScrollView flex={1}>
                <VStack space="3xl" alignItems="center" padding={24}>
                    <Box alignItems="center" marginTop={40} marginBottom={20}>
                        <Box backgroundColor="#2563eb" padding={24} borderRadius={20} marginBottom={16}>
                            <Text size="4xl" fontWeight="bold" color="white">
                                RN
                            </Text>
                        </Box>
                        <Text size="2xl" fontWeight="bold" color="#2563eb">
                            React Native Template
                        </Text>
                        <Text size="md" color="gray" marginTop={8}>
                            Clean Architecture & Best Practices
                        </Text>
                    </Box>

                    <Box
                        backgroundColor="white"
                        padding={24}
                        borderRadius={20}
                        width="100%"
                        shadowColor="black"
                        shadowOffset={{ width: 0, height: 2 }}
                        shadowOpacity={0.1}
                        shadowRadius={8}
                        elevation={3}>
                        <Box backgroundColor="#f1f5f9" padding={20} borderRadius={16} marginBottom={16}>
                            <Text size="lg" fontWeight="bold" color="#2563eb">
                                Environment
                            </Text>
                            <Text size="xl" marginTop={8} color="#0f172a">
                                {environment.appFlavor}
                            </Text>
                        </Box>

                        <Box backgroundColor="#f1f5f9" padding={20} borderRadius={16}>
                            <Text size="lg" fontWeight="bold" color="#2563eb">
                                API Response
                            </Text>
                            <Text size="xl" marginTop={8} color="#0f172a">
                                {response.length} items loaded
                            </Text>
                        </Box>
                    </Box>

                    <MyTouchable onPress={() => RootNavigator.navigate(RouteName.Counter)}>
                        <Box
                            backgroundColor="#2563eb"
                            padding={20}
                            borderRadius={16}
                            width="100%"
                            alignItems="center"
                            justifyContent="center"
                            flexDirection="row"
                            shadowColor="#2563eb"
                            shadowOffset={{ width: 0, height: 4 }}
                            shadowOpacity={0.3}
                            shadowRadius={8}
                            elevation={5}>
                            <Box backgroundColor="white" padding={12} borderRadius={10} marginRight={16}>
                                <Text size="2xl" fontWeight="bold" color="#2563eb">
                                    →
                                </Text>
                            </Box>
                            <Text size="2xl" fontWeight="bold" color="white">
                                Counter Demo
                            </Text>
                        </Box>
                    </MyTouchable>
                </VStack>
            </ScrollView>

            <Loading isLoading={isLoading} />
        </Box>
    );
};

export default MainPage;
