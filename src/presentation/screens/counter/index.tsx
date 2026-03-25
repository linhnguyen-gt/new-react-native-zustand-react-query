import React from 'react';

import store from '@/app/store';
import { useShallow } from 'zustand/react/shallow';

import { MyTouchable } from '@/presentation/components/touchable';
import { Box, HStack, Text, VStack } from '@/presentation/components/ui';

const CounterButton = React.memo<{
    onPress: () => void;
    children: React.ReactNode;
    testId?: string;
}>(({ onPress, children, testId }) => (
    <MyTouchable className="h-11 w-20 items-center rounded-lg border-2 bg-white" onPress={onPress} testID={testId}>
        <Text className="text-2xl font-bold">{children}</Text>
    </MyTouchable>
));

CounterButton.displayName = 'CounterButton';

const Counter = () => {
    const count = store.useCounterStore((state) => state.count);
    const { increment, decrement, reset } = store.useCounterStore(
        useShallow((state) => ({
            increment: state.increment,
            decrement: state.decrement,
            reset: state.reset,
        }))
    );

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
        <Box className="flex-1 items-center justify-center bg-white">
            <VStack space="xl" className="flex-1 items-center justify-center">
                <Text className="text-4xl font-bold">Counter</Text>

                <Box className="rounded-3xl border-2 border-black bg-gray-100 p-8">
                    <Text className="text-6xl font-bold text-black">{count}</Text>
                </Box>

                <HStack space="md">
                    <CounterButton onPress={handleDecrement} testId="decrement-button">
                        -
                    </CounterButton>

                    <CounterButton onPress={handleIncrement} testId="increment-button">
                        +
                    </CounterButton>

                    <MyTouchable
                        className="h-11 w-20 items-center rounded-lg border-2 bg-white"
                        onPress={handleReset}
                        testID="reset-button">
                        <Text className="text-xl font-bold">Reset</Text>
                    </MyTouchable>
                </HStack>
            </VStack>
        </Box>
    );
};

export default React.memo(Counter);
