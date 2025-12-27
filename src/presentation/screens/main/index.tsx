import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import Config from 'react-native-config';

import { RootNavigator } from '@/data/services';

import { useResponse } from '@/presentation/hooks';

import { Loading } from '@/presentation/components/loading';
import { MyTouchable } from '@/presentation/components/touchable';
import { Box, ScrollView, Text, VStack } from '@/presentation/components/ui';
import { RouteName } from '@/shared/constants';

const ItemSeparator = () => <Box className="h-4" />;

const MainPage = () => {
    const { response, isLoading, error } = useResponse();
    const isDarkMode = useColorScheme() === 'dark';

    const renderItem = ({ item }: { item: ResponseData }) => (
        <Box className="mb-4 rounded-3xl bg-white p-5 shadow-lg">
            <Box className="mb-4 flex-row items-center">
                <Box className="h-14 w-14 items-center justify-center rounded-full bg-indigo-500 shadow-md">
                    <Text size="xl" fontWeight="bold" className="text-white">
                        #{item.id}
                    </Text>
                </Box>
                <Box className="ml-4 flex-1">
                    <Text size="lg" fontWeight="bold" className="text-slate-800" numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Box className="mt-2 flex-row items-center">
                        <Box className="mr-2 rounded-xl bg-slate-100 px-3 py-1">
                            <Text size="sm" className="text-slate-500">
                                User: {item.userId}
                            </Text>
                        </Box>
                        <Text size="sm" className="text-slate-400">
                            Post ID: {item.id}
                        </Text>
                    </Box>
                </Box>
            </Box>

            <Box className="rounded-2xl bg-slate-50 p-4">
                <Box className="mb-2 flex-row items-start">
                    <Box className="rounded-2xl bg-indigo-400 p-3 shadow-sm">
                        <Text size="lg" className="text-white">
                            📝
                        </Text>
                    </Box>
                    <Box className="ml-4 flex-1">
                        <Text size="sm" className="mb-1 text-slate-500">
                            Content
                        </Text>
                        <Text size="md" className="text-slate-800" numberOfLines={3}>
                            {item.body}
                        </Text>
                    </Box>
                </Box>
            </Box>
        </Box>
    );

    if (error) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Box className="bg-red-50 w-full items-center rounded-3xl p-6 shadow-md">
                    <Box className="bg-red-100 mb-4 rounded-2xl p-4">
                        <Text size="2xl" className="text-red-600">
                            ⚠️
                        </Text>
                    </Box>
                    <Text size="xl" className="text-red-600 font-bold">
                        Error Occurred
                    </Text>
                    <Text size="md" className="text-red-500 mt-2 text-center">
                        {error.message}
                    </Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box className="flex-1">
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <ScrollView className="flex-1">
                <VStack space="3xl" className="p-6">
                    <Box className="mb-8 mt-10 items-center">
                        <Box className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-indigo-400 shadow-xl">
                            <Text size="3xl" fontWeight="bold" className="text-white">
                                RN
                            </Text>
                        </Box>
                        <Text size="3xl" fontWeight="bold" className="text-slate-800">
                            React Native
                        </Text>
                        <Text size="lg" className="mt-2 text-center text-slate-500">
                            Clean Architecture Template
                        </Text>
                    </Box>

                    <Box className="flex-row justify-between gap-3">
                        <Box className="flex-1 rounded-3xl bg-white p-5 shadow-lg">
                            <Box className="flex-row items-center">
                                <Box className="rounded-2xl bg-indigo-400 p-4 shadow-md">
                                    <Text size="xl" className="text-white">
                                        🛠
                                    </Text>
                                </Box>
                                <Box className="ml-3">
                                    <Text size="md" fontWeight="bold" className="text-slate-800">
                                        Environment
                                    </Text>
                                    <Text size="lg" className="mt-1 font-bold text-indigo-400">
                                        {Config.APP_FLAVOR}
                                    </Text>
                                </Box>
                            </Box>
                        </Box>

                        <MyTouchable onPress={() => RootNavigator.navigate(RouteName.Counter)}>
                            <Box className="flex-1 items-center justify-center rounded-3xl bg-indigo-400 p-5 shadow-xl">
                                <Box className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                                    <Text size="2xl" fontWeight="bold" className="text-indigo-400">
                                        →
                                    </Text>
                                </Box>
                                <Text size="md" fontWeight="bold" className="text-white">
                                    Counter Demo
                                </Text>
                            </Box>
                        </MyTouchable>
                    </Box>

                    <Box className="flex-row items-center rounded-3xl bg-white p-5 shadow-lg">
                        <Box className="rounded-2xl bg-indigo-400 p-4 shadow-md">
                            <Text size="xl" className="text-white">
                                📝
                            </Text>
                        </Box>
                        <Box className="ml-4">
                            <Text size="xl" fontWeight="bold" className="text-slate-800">
                                Posts Data
                            </Text>
                            <Text size="md" className="mt-1 text-slate-500">
                                {response?.length || 0} posts available
                            </Text>
                        </Box>
                    </Box>
                </VStack>

                <Box className="mt-6 rounded-t-[32px] bg-slate-50 pt-8 shadow-lg">
                    <Box className="mb-6 px-6">
                        <Text size="2xl" fontWeight="bold" className="text-slate-800">
                            Posts List
                        </Text>
                        <Text size="md" className="mt-1 text-slate-500">
                            Scroll to explore all posts
                        </Text>
                    </Box>

                    {response?.length > 0
                        ? response.map((item) => (
                              <Box key={item.id} className="px-6">
                                  {renderItem({ item })}
                                  <ItemSeparator />
                              </Box>
                          ))
                        : !isLoading && (
                              <Box className="items-center px-6 py-12">
                                  <Box className="mb-4 rounded-2xl bg-slate-100 p-6">
                                      <Text size="2xl">📭</Text>
                                  </Box>
                                  <Text size="lg" className="font-medium text-slate-500">
                                      No posts available
                                  </Text>
                                  <Text size="sm" className="mt-1 text-slate-400">
                                      Pull to refresh or check your connection
                                  </Text>
                              </Box>
                          )}
                </Box>
            </ScrollView>

            <Loading isLoading={isLoading} />
        </Box>
    );
};

export default MainPage;
