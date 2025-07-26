import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Keyboard } from 'react-native';
import * as z from 'zod';

import { RootNavigator } from '@/data/services';

import { ControlledInput } from '@/presentation/components/input';
import { MyTouchable } from '@/presentation/components/touchable';
import { Box, ScrollView, Text, VStack } from '@/presentation/components/ui';
import { Colors, Errors, RouteName } from '@/shared/constants';

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
                        lineHeight: 50,
                    }}>
                    RN
                </Text>
            </Box>
        </Box>
    </Box>
);

const loginSchema = z.object({
    email: z
        .string()
        .min(1, Errors.REQUIRED_EMAIL_INPUT)
        .pipe(z.email(Errors.EMAIL_INVALID))
        .refine((value) => value.endsWith('.com'), {
            message: Errors.IS_NOT_EMAIL,
        }),
    password: z.string().min(1, Errors.REQUIRED_PASSWORD_INPUT),
});

const Login = () => {
    const { control, handleSubmit } = useForm({
        defaultValues: {
            email: 'test@test.com',
            password: '123456',
        },
        resolver: zodResolver(loginSchema),
    });

    const handleLogin = React.useCallback(() => {
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
                            Welcome Back
                        </Text>
                        <Text size="md" color="#64748b">
                            Please sign in to your account
                        </Text>
                    </VStack>

                    <VStack space="xl">
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
                            isPassword
                            shouldUseFieldError={true}
                            testID="password-input"
                        />

                        <Box alignItems="flex-end">
                            <MyTouchable onPress={() => {}}>
                                <Text color={Colors.primaryColor} fontWeight="bold">
                                    Forgot Password?
                                </Text>
                            </MyTouchable>
                        </Box>

                        <MyTouchable onPress={handleLogin} testID="login-button">
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
                                    Sign In
                                </Text>
                            </Box>
                        </MyTouchable>

                        <Box flexDirection="row" justifyContent="center" marginTop={16}>
                            <Text color="#64748b" marginRight={4}>
                                Don&apos;t have an account?
                            </Text>
                            <MyTouchable onPress={() => RootNavigator.navigate(RouteName.SignUp)}>
                                <Text color={Colors.primaryColor} fontWeight="bold">
                                    Sign Up
                                </Text>
                            </MyTouchable>
                        </Box>
                    </VStack>
                </Box>
            </ScrollView>
        </Box>
    );
};

export default Login;
