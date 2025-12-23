import React from 'react';

import store from '@/app/store';

import { MyTouchable } from '@/presentation/components/touchable';
import { Box, HStack, Text, VStack } from '@/presentation/components/ui';

const CounterButton = React.memo<{
    onPress: () => void;
    children: React.ReactNode;
    testId?: string;
}>(({ onPress, children, testId }) => (
    <MyTouchable
        borderWidth={2}
        borderRadius={8}
        width={80}
        height={44}
        alignItems="center"
        backgroundColor="white"
        onPress={onPress}
        testID={testId}>
        <Text size="2xl" fontWeight="bold">
            {children}
        </Text>
    </MyTouchable>
));

CounterButton.displayName = 'CounterButton';

const Counter = () => {
    const count = store.useCounterStore((state) => state.count);
    const { increment, decrement, reset } = store.useCounterStore((state) => ({
        increment: state.increment,
        decrement: state.decrement,
        reset: state.reset,
    }));

    const handleIncrement = React.useCallback(() => {
        increment();
    }, [increment]);

    const handleDecrement = React.useCallback(() => {
        decrement();
    }, [decrement]);

    const handleReset = React.useCallback(() => {
        reset();
    }, [reset]);

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
                    <CounterButton onPress={handleDecrement} testId="decrement-button">
                        -
                    </CounterButton>

                    <CounterButton onPress={handleIncrement} testId="increment-button">
                        +
                    </CounterButton>

                    <MyTouchable
                        borderWidth={2}
                        borderRadius={8}
                        width={80}
                        height={44}
                        alignItems="center"
                        backgroundColor="white"
                        onPress={handleReset}
                        testID="reset-button">
                        <Text size="xl" fontWeight="bold">
                            Reset
                        </Text>
                    </MyTouchable>
                </HStack>
            </VStack>
        </Box>
    );
};

export default React.memo(Counter);
