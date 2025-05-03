import { useFormik } from "formik";
import React from "react";
import { Keyboard } from "react-native";
import { object, string } from "yup";

import { RootNavigator } from "@/data/services";
import { Input } from "@/presentation/components/input";
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
            RootNavigator.replaceName(RouteName.Main);
        }
    });

    const handleLogin = React.useCallback(() => {
        Keyboard.dismiss();
        formik.handleSubmit();
    }, [formik]);

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
