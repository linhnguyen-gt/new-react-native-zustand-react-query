import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { Keyboard } from "react-native";
import * as z from "zod";

import { RootNavigator } from "@/data/services";

import { ControlledInput } from "@/presentation/components/input";
import { MyTouchable } from "@/presentation/components/touchable";
import { Box, ScrollView, Text, VStack } from "@/presentation/components/ui";
import { Colors, Errors, RouteName } from "@/shared/constants";

const RNLogo = () => (
    <Box
        width={120}
        height={120}
        backgroundColor={Colors.primaryColor}
        borderRadius={30}
        alignItems="center"
        justifyContent="center"
        shadowColor={Colors.primaryColor}
        shadowOffset={{ width: 0, height: 8 }}
        shadowOpacity={0.4}
        shadowRadius={12}
        elevation={10}
        marginBottom={20}
        overflow="visible">
        <Box
            width={100}
            height={100}
            borderRadius={25}
            borderWidth={3}
            borderColor="white"
            alignItems="center"
            justifyContent="center"
            overflow="visible">
            <Box height={50} alignItems="center" justifyContent="center" overflow="visible">
                <Text
                    color="white"
                    fontWeight="bold"
                    fontSize={42}
                    style={{
                        includeFontPadding: false,
                        lineHeight: 50
                    }}>
                    RN
                </Text>
            </Box>
        </Box>
    </Box>
);

const signUpSchema = z
    .object({
        fullName: z.string().min(1, Errors.REQUIRED_FULLNAME_INPUT),
        email: z
            .string()
            .min(1, Errors.REQUIRED_EMAIL_INPUT)
            .email(Errors.EMAIL_INVALID)
            .refine((value) => value.endsWith(".com"), {
                message: Errors.IS_NOT_EMAIL
            }),
        password: z.string().min(6, Errors.PASSWORD_MIN_LENGTH).min(1, Errors.REQUIRED_PASSWORD_INPUT),
        confirmPassword: z.string().min(1, Errors.REQUIRED_CONFIRM_PASSWORD_INPUT)
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: Errors.PASSWORD_NOT_MATCH,
        path: ["confirmPassword"] // Path of the error
    });

const SignUp = () => {
    const { control, handleSubmit } = useForm({
        defaultValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: ""
        },
        resolver: zodResolver(signUpSchema)
    });

    const handleSignUp = React.useCallback(() => {
        Keyboard.dismiss();
        handleSubmit((_values) => {
            RootNavigator.replaceName(RouteName.Main);
        })();
    }, [handleSubmit]);

    return (
        <Box flex={1} safeArea backgroundColor="white">
            <ScrollView>
                <Box flex={1} paddingHorizontal={24} paddingTop={40}>
                    <VStack alignItems="center" marginBottom={40} space="md">
                        <RNLogo />
                        <Text size="3xl" fontWeight="bold" color="#0f172a" marginTop={16}>
                            Create Account
                        </Text>
                        <Text size="md" color="#64748b">
                            Sign up to get started
                        </Text>
                    </VStack>

                    <VStack space="xl">
                        <ControlledInput
                            control={control}
                            name="fullName"
                            placeholder="Full Name"
                            shouldUseFieldError={true}
                            testID="full-name-input"
                        />

                        <ControlledInput
                            control={control}
                            name="email"
                            placeholder="Email"
                            shouldUseFieldError={true}
                            testID="email-input"
                        />

                        <ControlledInput
                            control={control}
                            name="password"
                            placeholder="Password"
                            shouldUseFieldError={true}
                            testID="password-input"
                        />

                        <ControlledInput
                            control={control}
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            shouldUseFieldError={true}
                            testID="confirm-password-input"
                        />

                        <MyTouchable onPress={handleSignUp} testID="signup-button">
                            <Box
                                backgroundColor={Colors.primaryColor}
                                padding={16}
                                borderRadius={16}
                                alignItems="center"
                                shadowColor={Colors.primaryColor}
                                shadowOffset={{ width: 0, height: 4 }}
                                shadowOpacity={0.3}
                                shadowRadius={8}
                                elevation={5}
                                marginTop={8}>
                                <Text size="xl" fontWeight="bold" color="white">
                                    Sign Up
                                </Text>
                            </Box>
                        </MyTouchable>

                        <Box flexDirection="row" justifyContent="center" marginTop={16}>
                            <Text color="#64748b" marginRight={4}>
                                Already have an account?
                            </Text>
                            <MyTouchable onPress={() => RootNavigator.goBack()}>
                                <Text color={Colors.primaryColor} fontWeight="bold">
                                    Sign In
                                </Text>
                            </MyTouchable>
                        </Box>
                    </VStack>
                </Box>
            </ScrollView>
        </Box>
    );
};

export default SignUp;
