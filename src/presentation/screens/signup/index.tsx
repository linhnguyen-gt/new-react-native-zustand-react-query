import { useFormik } from "formik";
import React from "react";
import { Keyboard } from "react-native";
import * as Yup from "yup";
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

const SignUp = () => {
    const formik = useFormik({
        initialValues: {
            fullName: "",
            email: "",
            password: "",
            confirmPassword: ""
        },
        validationSchema: object().shape({
            fullName: string().required(Errors.REQUIRED_FULLNAME_INPUT),
            email: string()
                .email(Errors.EMAIL_INVALID)
                .required(Errors.REQUIRED_EMAIL_INPUT)
                .test("is-com-email", Errors.IS_NOT_EMAIL, (value) => (value ? value.endsWith(".com") : true)),
            password: string().min(6, Errors.PASSWORD_MIN_LENGTH).required(Errors.REQUIRED_PASSWORD_INPUT),
            confirmPassword: string()
                .oneOf([Yup.ref("password")], Errors.PASSWORD_NOT_MATCH)
                .required(Errors.REQUIRED_CONFIRM_PASSWORD_INPUT)
        }),
        onSubmit: () => {
            RootNavigator.replaceName(RouteName.Main);
        }
    });

    const handleSignUp = React.useCallback(() => {
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
                            Create Account
                        </Text>
                        <Text size="md" color="#64748b">
                            Sign up to get started
                        </Text>
                    </VStack>

                    <VStack space="xl">
                        <Input
                            placeholder="Full Name"
                            fieldName="fullName"
                            error={formik.touched.fullName && formik.errors.fullName}
                            value={formik.values.fullName}
                            onChangeValue={formik.setFieldValue}
                            testID="fullname-input"
                        />

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

                        <Input
                            placeholder="Confirm Password"
                            isPassword
                            fieldName="confirmPassword"
                            error={formik.touched.confirmPassword && formik.errors.confirmPassword}
                            value={formik.values.confirmPassword}
                            onChangeValue={formik.setFieldValue}
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
