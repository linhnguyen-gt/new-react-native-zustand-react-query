import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Keyboard } from 'react-native';
import { z } from 'zod';

import { RootNavigator } from '@/data/services';

import { ControlledInput } from '@/presentation/components/input';
import { MyTouchable } from '@/presentation/components/touchable';
import { Box, RNLogo, ScrollView, Text, VStack } from '@/presentation/components/ui';
import { appConfig } from '@/shared/config/appConfig';
import { Colors, RouteName } from '@/shared/constants';
import { loginSchema } from '@/shared/validation/schemas';

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Build diagnostics for the sign-in screen.
 *
 * Gated behind __DEV__: this screen is reachable without authenticating, and the
 * variant/version/build triple tells an unauthenticated observer exactly which
 * release they are looking at — useful for selecting a known-vulnerable build, and
 * it also reveals when a staging or development build has shipped to users.
 */
const AppInfoBadge = React.memo(() => (
    <VStack space="xs" alignItems="center" marginTop={16}>
        <Text size="3xl" fontWeight="bold" color="#0f172a">
            Welcome Back
        </Text>
        {__DEV__ && (
            <>
                <Box
                    flexDirection="row"
                    alignItems="center"
                    paddingHorizontal={10}
                    paddingVertical={4}
                    backgroundColor="#e2e8f0"
                    borderRadius={999}>
                    <Text size="sm" color="#334155" fontWeight="bold">
                        Flavor:
                    </Text>
                    <Text size="sm" color="#0f172a" marginLeft={6}>
                        {appConfig.variant}
                    </Text>
                </Box>
                <VStack space="xs" marginTop={8}>
                    <Box flexDirection="row" justifyContent="center">
                        <Text size="sm" color="#64748b" marginRight={6}>
                            App Name:
                        </Text>
                        <Text size="sm" color="#0f172a" fontWeight="medium">
                            {appConfig.appName}
                        </Text>
                    </Box>
                    <Box flexDirection="row" justifyContent="center">
                        <Text size="sm" color="#64748b" marginRight={6}>
                            Version:
                        </Text>
                        <Text size="sm" color="#0f172a" fontWeight="medium">
                            {appConfig.versionName}
                        </Text>
                    </Box>
                    <Box flexDirection="row" justifyContent="center">
                        <Text size="sm" color="#64748b" marginRight={6}>
                            Build:
                        </Text>
                        <Text size="sm" color="#0f172a" fontWeight="medium">
                            {appConfig.versionCode}
                        </Text>
                    </Box>
                </VStack>
            </>
        )}
    </VStack>
));

AppInfoBadge.displayName = 'AppInfoBadge';

const SignUpLink = React.memo(() => (
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
));

SignUpLink.displayName = 'SignUpLink';

const SignInButton = React.memo<{ onPress: () => void }>(({ onPress }) => (
    <MyTouchable onPress={onPress} testID="login-button">
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
));

SignInButton.displayName = 'SignInButton';

const Login = () => {
    const { control, handleSubmit } = useForm<LoginFormData>({
        // Never prefill credentials. A literal here ships to production and puts a
        // working-looking password into the field on every launch.
        defaultValues: {
            email: '',
            password: '',
        },
        resolver: zodResolver(loginSchema),
    });

    const handleLogin = React.useCallback(() => {
        Keyboard.dismiss();
        handleSubmit((_values) => {
            RootNavigator.replaceName(RouteName.Main);
        })();
    }, [handleSubmit]);

    const handleForgotPassword = React.useCallback(() => {}, []);

    return (
        <Box flex={1} safeArea backgroundColor="white">
            <ScrollView>
                <Box flex={1} paddingHorizontal={24} paddingTop={40}>
                    <VStack alignItems="center" marginBottom={40} space="md">
                        <RNLogo />
                        <AppInfoBadge />
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
                            <MyTouchable onPress={handleForgotPassword}>
                                <Text color={Colors.primaryColor} fontWeight="bold">
                                    Forgot Password?
                                </Text>
                            </MyTouchable>
                        </Box>

                        <SignInButton onPress={handleLogin} />
                        <SignUpLink />
                    </VStack>
                </Box>
            </ScrollView>
        </Box>
    );
};

export default React.memo(Login);
