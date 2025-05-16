import React from "react";
import { StatusBar, useColorScheme } from "react-native";

import { environment, RootNavigator } from "@/data/services";

import { useResponse } from "@/presentation/hooks";

import { Loading } from "@/presentation/components/loading";
import { MyTouchable } from "@/presentation/components/touchable";
import { Box, ScrollView, Text, VStack } from "@/presentation/components/ui";
import { Colors, RouteName } from "@/shared/constants";

const ItemSeparator = () => <Box height={16} />;

const MainPage = () => {
    const { response, isLoading, error } = useResponse();
    const isDarkMode = useColorScheme() === "dark";

    const renderItem = ({ item }: { item: ResponseData }) => (
        <Box
            backgroundColor="white"
            padding={20}
            borderRadius={24}
            marginBottom={16}
            shadowColor={Colors.primaryColor}
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.15}
            shadowRadius={24}
            elevation={8}>
            <Box flexDirection="row" alignItems="center" marginBottom={16}>
                <Box
                    backgroundColor={Colors.primaryColor}
                    width={56}
                    height={56}
                    borderRadius={28}
                    justifyContent="center"
                    alignItems="center"
                    shadowColor={Colors.primaryColor}
                    shadowOffset={{ width: 0, height: 4 }}
                    shadowOpacity={0.3}
                    shadowRadius={8}>
                    <Text size="xl" fontWeight="bold" color="white">
                        {item.State.substring(0, 2)}
                    </Text>
                </Box>
                <Box flex={1} marginLeft={16}>
                    <Text size="xl" fontWeight="bold" color="#1e293b">
                        {item.State}
                    </Text>
                    <Box flexDirection="row" alignItems="center" marginTop={4}>
                        <Box
                            backgroundColor="#f1f5f9"
                            paddingHorizontal={12}
                            paddingVertical={4}
                            borderRadius={12}
                            marginRight={8}>
                            <Text size="sm" color="#64748b">
                                {item.Year}
                            </Text>
                        </Box>
                        <Text size="sm" color="#94a3b8">
                            ID: {item["ID State"]}
                        </Text>
                    </Box>
                </Box>
            </Box>

            <Box backgroundColor="#f8fafc" padding={16} borderRadius={20} flexDirection="row" alignItems="center">
                <Box
                    backgroundColor="#818cf8"
                    padding={12}
                    borderRadius={16}
                    shadowColor="#818cf8"
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowOpacity={0.2}
                    shadowRadius={4}>
                    <Text size="lg" color="white">
                        👥
                    </Text>
                </Box>
                <Box marginLeft={16}>
                    <Text size="sm" color="#64748b" marginBottom={2}>
                        Total Population
                    </Text>
                    <Text size="lg" fontWeight="bold" color="#1e293b">
                        {item.Population.toLocaleString()}
                    </Text>
                </Box>
            </Box>
        </Box>
    );

    if (error) {
        return (
            <Box flex={1} justifyContent="center" alignItems="center" padding={24}>
                <Box
                    backgroundColor="#fef2f2"
                    padding={24}
                    borderRadius={24}
                    width="100%"
                    alignItems="center"
                    shadowColor="#ef4444"
                    shadowOffset={{ width: 0, height: 8 }}
                    shadowOpacity={0.1}
                    shadowRadius={24}>
                    <Box backgroundColor="#fee2e2" padding={16} borderRadius={20} marginBottom={16}>
                        <Text size="2xl" color="#dc2626">
                            ⚠️
                        </Text>
                    </Box>
                    <Text size="xl" color="#dc2626" fontWeight="bold">
                        Error Occurred
                    </Text>
                    <Text size="md" color="#ef4444" marginTop={8} textAlign="center">
                        {error.message}
                    </Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flex={1}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <ScrollView flex={1}>
                <VStack space="3xl" padding={24}>
                    <Box alignItems="center" marginTop={40} marginBottom={32}>
                        <Box
                            backgroundColor="#818cf8"
                            width={80}
                            height={80}
                            borderRadius={40}
                            justifyContent="center"
                            alignItems="center"
                            marginBottom={20}
                            shadowColor="#818cf8"
                            shadowOffset={{ width: 0, height: 12 }}
                            shadowOpacity={0.4}
                            shadowRadius={24}
                            elevation={12}>
                            <Text size="3xl" fontWeight="bold" color="white">
                                RN
                            </Text>
                        </Box>
                        <Text size="3xl" fontWeight="bold" color="#1e293b">
                            React Native
                        </Text>
                        <Text size="lg" color="#64748b" marginTop={8} textAlign="center">
                            Clean Architecture Template
                        </Text>
                    </Box>

                    <Box flexDirection="row" justifyContent="space-between" gap={12}>
                        <Box
                            flex={1}
                            backgroundColor="white"
                            padding={20}
                            borderRadius={28}
                            shadowColor="#6366f1"
                            shadowOffset={{ width: 0, height: 8 }}
                            shadowOpacity={0.15}
                            shadowRadius={24}
                            elevation={8}>
                            <Box flexDirection="row" alignItems="center">
                                <Box
                                    backgroundColor="#818cf8"
                                    padding={16}
                                    borderRadius={20}
                                    shadowColor="#818cf8"
                                    shadowOffset={{ width: 0, height: 4 }}
                                    shadowOpacity={0.3}
                                    shadowRadius={8}>
                                    <Text size="xl" color="white">
                                        🛠
                                    </Text>
                                </Box>
                                <Box marginLeft={12}>
                                    <Text size="md" fontWeight="bold" color="#1e293b">
                                        Environment
                                    </Text>
                                    <Text size="lg" color="#818cf8" marginTop={4} fontWeight="bold">
                                        {environment.appFlavor}
                                    </Text>
                                </Box>
                            </Box>
                        </Box>

                        <MyTouchable onPress={() => RootNavigator.navigate(RouteName.Counter)}>
                            <Box
                                flex={1}
                                backgroundColor="#818cf8"
                                padding={20}
                                borderRadius={28}
                                alignItems="center"
                                justifyContent="center"
                                shadowColor="#818cf8"
                                shadowOffset={{ width: 0, height: 8 }}
                                shadowOpacity={0.4}
                                shadowRadius={24}
                                elevation={12}>
                                <Box
                                    backgroundColor="white"
                                    width={48}
                                    height={48}
                                    borderRadius={24}
                                    justifyContent="center"
                                    alignItems="center"
                                    marginBottom={12}
                                    shadowColor="#000"
                                    shadowOffset={{ width: 0, height: 2 }}
                                    shadowOpacity={0.1}
                                    shadowRadius={4}>
                                    <Text size="2xl" fontWeight="bold" color="#818cf8">
                                        →
                                    </Text>
                                </Box>
                                <Text size="md" fontWeight="bold" color="white">
                                    Counter Demo
                                </Text>
                            </Box>
                        </MyTouchable>
                    </Box>

                    <Box
                        backgroundColor="white"
                        padding={20}
                        borderRadius={24}
                        shadowColor="#6366f1"
                        shadowOffset={{ width: 0, height: 8 }}
                        shadowOpacity={0.15}
                        shadowRadius={24}
                        elevation={8}
                        flexDirection="row"
                        alignItems="center">
                        <Box
                            backgroundColor="#818cf8"
                            padding={16}
                            borderRadius={20}
                            shadowColor="#818cf8"
                            shadowOffset={{ width: 0, height: 4 }}
                            shadowOpacity={0.3}
                            shadowRadius={8}>
                            <Text size="xl" color="white">
                                📊
                            </Text>
                        </Box>
                        <Box marginLeft={16}>
                            <Text size="xl" fontWeight="bold" color="#1e293b">
                                Population Data
                            </Text>
                            <Text size="md" color="#64748b" marginTop={4}>
                                {response?.length || 0} states available
                            </Text>
                        </Box>
                    </Box>
                </VStack>

                <Box
                    backgroundColor="#f8fafc"
                    marginTop={24}
                    paddingTop={32}
                    borderTopLeftRadius={32}
                    borderTopRightRadius={32}
                    shadowColor={Colors.primaryColor}
                    shadowOffset={{ width: 0, height: -8 }}
                    shadowOpacity={0.1}
                    shadowRadius={24}
                    elevation={8}>
                    <Box paddingHorizontal={24} marginBottom={24}>
                        <Text size="2xl" fontWeight="bold" color="#1e293b">
                            States List
                        </Text>
                        <Text size="md" color="#64748b" marginTop={4}>
                            Scroll to explore all states
                        </Text>
                    </Box>

                    {response?.length > 0 ? (
                        response.map((item) => (
                            <Box key={item.State} paddingHorizontal={24}>
                                {renderItem({ item })}
                                <ItemSeparator />
                            </Box>
                        ))
                    ) : (
                        <Text>No data</Text>
                    )}
                </Box>
            </ScrollView>

            <Loading isLoading={isLoading} />
        </Box>
    );
};

export default MainPage;
