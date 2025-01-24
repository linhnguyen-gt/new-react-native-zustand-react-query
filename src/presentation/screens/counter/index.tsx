import React from "react";

import { useCounterStore } from "@/app/store";
import { Box, HStack, MyTouchable, Text, VStack } from "@/presentation/components";

const Counter = () => {
    const { count, increment, decrement, reset } = useCounterStore();

    return (
        <Box flex={1} justifyContent="center" alignItems="center" backgroundColor="white">
            <VStack space="xl" alignItems="center">
                <Text size="4xl" fontWeight="bold">
                    Counter
                </Text>

                <Box backgroundColor="gray" padding={32} borderRadius={16} borderWidth={2} borderColor="black">
                    <Text size="6xl" fontWeight="bold" color="black">
                        {count}
                    </Text>
                </Box>

                <HStack space="md">
                    <MyTouchable
                        borderWidth={2}
                        borderRadius={8}
                        width={80}
                        height={44}
                        alignItems="center"
                        bg="white"
                        onPress={decrement}>
                        <Text size="2xl" fontWeight="bold">
                            -
                        </Text>
                    </MyTouchable>

                    <MyTouchable
                        borderWidth={2}
                        borderRadius={8}
                        width={80}
                        height={44}
                        alignItems="center"
                        bg="white"
                        onPress={increment}>
                        <Text size="2xl" fontWeight="bold">
                            +
                        </Text>
                    </MyTouchable>

                    <MyTouchable
                        borderWidth={2}
                        borderRadius={8}
                        width={80}
                        height={44}
                        alignItems="center"
                        bg="white"
                        onPress={reset}>
                        <Text size="xl" fontWeight="bold">
                            Reset
                        </Text>
                    </MyTouchable>
                </HStack>
            </VStack>
        </Box>
    );
};

export default Counter;
