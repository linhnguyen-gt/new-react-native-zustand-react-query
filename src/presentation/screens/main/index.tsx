import React from "react";
import { StatusBar, useColorScheme, View } from "react-native";
import { Colors, Header } from "react-native/Libraries/NewAppScreen";

import { Box, Loading, ScrollView, Text, VStack } from "../../components";
import { useResponse } from "../../hooks";

import { environment } from "@/data";

const MainPage = () => {
    const { response, isLoading, error } = useResponse();

    // const isLoading = useLoading([
    //     actions.CountActions.increment.type,
    //     actions.CountActions.decrement.type,
    //     actions.ResponseActions.getResponse.type
    // ]);

    // const { increment, decrement } = useActions({
    //     increment: actions.CountActions.increment,
    //     decrement: actions.CountActions.decrement
    // });

    // const getResponse = useActions(actions.ResponseActions.getResponse);

    // const count = useSelector(selectors.CountSelectors.count);
    // const response = useSelector(selectors.ResponseSelectors.response);
    const isDarkMode = useColorScheme() === "dark";

    const backgroundStyle = {
        backgroundColor: isDarkMode ? Colors.darker : Colors.lighter
    };

    // React.useEffect(() => {
    //     getResponse();
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, []);

    if (error) {
        return (
            <View>
                <Text>Error: {error.message}</Text>
            </View>
        );
    }

    return (
        <Box flex={1}>
            <StatusBar
                barStyle={isDarkMode ? "light-content" : "dark-content"}
                backgroundColor={backgroundStyle.backgroundColor}
            />
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                backgroundColor={isDarkMode ? Colors.darker : Colors.lighter}>
                <Header />

                <VStack space="sm" alignItems="center">
                    <Text size="2xl" fontWeight="bold">
                        Environment: {environment.appFlavor}
                    </Text>
                    <Text size="2xl" fontWeight="bold">
                        Response: {response.length}
                    </Text>
                    {/* <Text size="lg" color="gray" fontWeight="bold">
                        Counter: {count}
                    </Text>
                    <HStack space="lg">
                        <Button title="Increment" onPress={() => increment()} />
                        <Button title="Decrement" onPress={() => decrement()} />
                    </HStack> */}
                </VStack>
            </ScrollView>
            <Loading isLoading={isLoading} />
        </Box>
    );
};

export default MainPage;
