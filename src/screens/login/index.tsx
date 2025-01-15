import { useFormik } from "formik";
import React from "react";
import { Keyboard } from "react-native";
import { object, string } from "yup";

import { Box, Input, MyTouchable, ScrollView, Text, VStack } from "@/components";

import { RootNavigator } from "@/services";

import { getColor } from "@/hooks";

import { Errors, RouteName } from "@/enums";

const RNLogo = () => (
    <Box width={80} height={80} backgroundColor="black" borderRadius={16} alignItems="center" justifyContent="center">
        <Text color="white" fontWeight="bold" fontSize={24}>
            RN
        </Text>
    </Box>
);

const Login = () => {
    const formik = useFormik({
        initialValues: {
            email: "test@test.com",
            password: "123456"
        },
        validationSchema: object().shape({
            email: string()
                .email(Errors.EMAIL_INVALID)
                .required(Errors.REQUIRED_EMAIL_INPUT)
                .test("is-com-email", Errors.IS_NOT_EMAIL, (value) => (value ? value.endsWith(".com") : true)),
            password: string().required(Errors.REQUIRED_PASSWORD_INPUT)
        }),
        onSubmit: () => {
            RootNavigator.navigate(RouteName.Main);
        }
    });

    const handleLogin = React.useCallback(() => {
        Keyboard.dismiss();
        formik.handleSubmit();
    }, [formik]);

    return (
        <Box flex={1} safeArea>
            <ScrollView>
                <Box flex={1} backgroundColor="white" paddingHorizontal={16}>
                    <VStack alignItems="center" justifyContent="center" marginTop={20} marginBottom={12} space="sm">
                        <RNLogo />
                        <Text size="2xl" fontWeight="bold" marginTop={6}>
                            Welcome Back
                        </Text>
                        <Text fontSize={14} marginTop={2} color="gray">
                            Please sign in to your account
                        </Text>
                    </VStack>

                    <VStack space="lg" marginTop={6}>
                        <Input
                            placeholder="Email"
                            fieldName="email"
                            error={formik.touched.email && formik.errors.email}
                            value={formik.values.email}
                            onChangeValue={formik.setFieldValue}
                            testID="email-input"
                        />

                        <Input
                            placeholder="Password"
                            isPassword
                            fieldName="password"
                            error={formik.touched.password && formik.errors.password}
                            value={formik.values.password}
                            onChangeValue={formik.setFieldValue}
                            testID="password-input"
                        />

                        <Text fontSize={14} color={getColor("primary.600")} fontWeight="medium" textAlign="right">
                            Forgot Password?
                        </Text>

                        <MyTouchable
                            onPress={handleLogin}
                            className="bg-primary-600 rounded-xl py-4 items-center mt-4 shadow-sm"
                            testID="login-button">
                            <Text fontWeight="bold" size="lg" color="white">
                                Sign In
                            </Text>
                        </MyTouchable>
                    </VStack>
                </Box>
            </ScrollView>
        </Box>
    );
};

export default Login;
