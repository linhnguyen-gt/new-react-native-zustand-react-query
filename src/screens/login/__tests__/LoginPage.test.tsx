import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useFormik } from "formik";
import React from "react";
import { object, string } from "yup";

import { RootNavigator } from "@/services";

import { Errors, RouteName } from "@/enums";
import { LoginPage } from "@/screens";

jest.mock("@/services", () => ({
    RootNavigator: {
        navigate: jest.fn()
    }
}));

describe("<LoginPage />", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders login form elements", () => {
        render(<LoginPage />);
        expect(screen.getByTestId("email-input")).toBeTruthy();
        expect(screen.getByTestId("password-input")).toBeTruthy();
        expect(screen.getByTestId("login-button")).toBeTruthy();
        expect(screen.getByText("Welcome Back")).toBeTruthy();
    });

    it("navigates to Main screen on valid form submission", async () => {
        render(<LoginPage />);

        await act(async () => {
            fireEvent.press(screen.getByTestId("login-button"));
        });

        await waitFor(() => {
            expect(RootNavigator.navigate).toHaveBeenCalledWith(RouteName.Main);
        });
    });

    it("shows validation error for invalid email", async () => {
        let formikBag: any;

        const TestComponent = () => {
            const formik = useFormik({
                initialValues: { email: "invalid-email", password: "123456" },
                onSubmit: () => {},
                validationSchema: object().shape({
                    email: string().email(Errors.EMAIL_INVALID).required(Errors.REQUIRED_EMAIL_INPUT),
                    password: string().required(Errors.REQUIRED_PASSWORD_INPUT)
                })
            });
            formikBag = formik;
            return <LoginPage />;
        };

        render(<TestComponent />);

        await act(async () => {
            formikBag.setFieldTouched("email", true);
            await formikBag.validateForm();
        });

        expect(formikBag.errors.email).toBe(Errors.EMAIL_INVALID);
    });

    it("shows validation error for non .com email", async () => {
        let formikBag: any;

        const TestComponent = () => {
            const formik = useFormik({
                initialValues: { email: "test@test.org", password: "123456" },
                onSubmit: () => {},
                validationSchema: object().shape({
                    email: string()
                        .email(Errors.EMAIL_INVALID)
                        .required(Errors.REQUIRED_EMAIL_INPUT)
                        .test("is-com-email", Errors.IS_NOT_EMAIL, (value) => (value ? value.endsWith(".com") : true)),
                    password: string().required(Errors.REQUIRED_PASSWORD_INPUT)
                })
            });
            formikBag = formik;
            return <LoginPage />;
        };

        render(<TestComponent />);

        await act(async () => {
            formikBag.setFieldTouched("email", true);
            await formikBag.validateForm();
        });

        expect(formikBag.errors.email).toBe(Errors.IS_NOT_EMAIL);
    });

    it("shows validation error for missing password", async () => {
        let formikBag: any;

        const TestComponent = () => {
            const formik = useFormik({
                initialValues: { email: "test@test.com", password: "" },
                onSubmit: () => {},
                validationSchema: object().shape({
                    email: string()
                        .email(Errors.EMAIL_INVALID)
                        .required(Errors.REQUIRED_EMAIL_INPUT)
                        .test("is-com-email", Errors.IS_NOT_EMAIL, (value) => (value ? value.endsWith(".com") : true)),
                    password: string().required(Errors.REQUIRED_PASSWORD_INPUT)
                })
            });
            formikBag = formik;
            return <LoginPage />;
        };

        render(<TestComponent />);

        await act(async () => {
            formikBag.setFieldTouched("password", true);
            await formikBag.validateForm();
        });

        expect(formikBag.errors.password).toBe(Errors.REQUIRED_PASSWORD_INPUT);
    });
});
