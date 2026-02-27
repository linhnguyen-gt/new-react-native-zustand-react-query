import React from 'react';

import { ControlledInput } from '@/presentation/components/input';
import { MyTouchable } from '@/presentation/components/touchable';
import { Box, RNLogo, ScrollView, Text, VStack } from '@/presentation/components/ui';
import { Colors } from '@/shared/constants';

import { SignUpStrings } from './constants/strings';
import { useSignUpForm } from './hooks/useSignUpForm';

const SignUp = () => {
    const { control, handleSubmit, isSubmitting, onSubmit, onSignInPress } = useSignUpForm();

    const handleSignUpPress = React.useCallback(() => {
        handleSubmit(onSubmit)();
    }, [handleSubmit, onSubmit]);

    return (
        <Box flex={1} safeArea backgroundColor="white" accessibilityLabel="Sign up screen">
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <Box flex={1} paddingHorizontal={24} paddingTop={40}>
                    <VStack alignItems="center" marginBottom={40} space="md">
                        <RNLogo
                            size={120}
                            backgroundColor={Colors.primaryColor}
                            marginBottom={20}
                            showShadow={true}
                            accessibilityLabel={SignUpStrings.logo.accessibilityLabel}
                        />
                        <Text size="3xl" fontWeight="bold" color="#0f172a" marginTop={16} accessibilityRole="header">
                            {SignUpStrings.title}
                        </Text>
                        <Text size="md" color="#64748b">
                            {SignUpStrings.subtitle}
                        </Text>
                    </VStack>

                    <VStack space="xl">
                        <ControlledInput<import('@/shared/validation/schemas').SignUpFormData>
                            control={control}
                            name="fullName"
                            placeholder={SignUpStrings.fullName.placeholder}
                            shouldUseFieldError={true}
                            testID="full-name-input"
                            accessibilityLabel={SignUpStrings.fullName.accessibilityLabel}
                        />

                        <ControlledInput<import('@/shared/validation/schemas').SignUpFormData>
                            control={control}
                            name="email"
                            placeholder={SignUpStrings.email.placeholder}
                            shouldUseFieldError={true}
                            testID="email-input"
                            accessibilityLabel={SignUpStrings.email.accessibilityLabel}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />

                        <ControlledInput<import('@/shared/validation/schemas').SignUpFormData>
                            control={control}
                            name="password"
                            placeholder={SignUpStrings.password.placeholder}
                            shouldUseFieldError={true}
                            testID="password-input"
                            accessibilityLabel={SignUpStrings.password.accessibilityLabel}
                            secureTextEntry={true}
                            autoComplete="password-new"
                        />

                        <ControlledInput<import('@/shared/validation/schemas').SignUpFormData>
                            control={control}
                            name="confirmPassword"
                            placeholder={SignUpStrings.confirmPassword.placeholder}
                            shouldUseFieldError={true}
                            testID="confirm-password-input"
                            accessibilityLabel={SignUpStrings.confirmPassword.accessibilityLabel}
                            secureTextEntry={true}
                            autoComplete="password-new"
                        />

                        <MyTouchable
                            onPress={handleSignUpPress}
                            testID="signup-button"
                            disabled={isSubmitting}
                            accessibilityLabel={SignUpStrings.signUpButton.accessibilityLabel}
                            accessibilityState={{ disabled: isSubmitting }}>
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
                                marginTop={8}
                                opacity={isSubmitting ? 0.7 : 1}>
                                {isSubmitting ? (
                                    <Text size="xl" fontWeight="bold" color="white">
                                        {SignUpStrings.signUpButton.loadingText}
                                    </Text>
                                ) : (
                                    <Text size="xl" fontWeight="bold" color="white">
                                        {SignUpStrings.signUpButton.text}
                                    </Text>
                                )}
                            </Box>
                        </MyTouchable>

                        <Box
                            flexDirection="row"
                            justifyContent="center"
                            marginTop={16}
                            accessibilityLabel="Sign in prompt">
                            <Text color="#64748b" marginRight={4}>
                                {SignUpStrings.signInLink.prompt}
                            </Text>
                            <MyTouchable
                                onPress={onSignInPress}
                                disabled={isSubmitting}
                                accessibilityLabel={SignUpStrings.signInLink.accessibilityLabel}>
                                <Text color={Colors.primaryColor} fontWeight="bold">
                                    {SignUpStrings.signInLink.text}
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
