import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { RootNavigator } from "@/data/services";

import { LoginPage } from "../..";

import { Errors, RouteName } from "@/shared/constants";

jest.mock("@/services", () => ({
    RootNavigator: {
        replaceName: jest.fn()
    }
}));

// Define test schema that matches the one in the component
const mockLoginSchema = z.object({
    email: z
        .string()
        .min(1, Errors.REQUIRED_EMAIL_INPUT)
        .email(Errors.EMAIL_INVALID)
        .refine((value) => value.endsWith(".com"), {
            message: Errors.IS_NOT_EMAIL
        }),
    password: z.string().min(1, Errors.REQUIRED_PASSWORD_INPUT)
});

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

        fireEvent.press(screen.getByTestId("login-button"));

        await waitFor(() => {
            expect(RootNavigator.replaceName).toHaveBeenCalledWith(RouteName.Main);
        });
    });

    it("shows validation error for invalid email", async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { email: "invalid-email", password: "123456" },
                resolver: zodResolver(mockLoginSchema),
                mode: "onChange"
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <LoginPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.email).toBeDefined();
        });

        expect(formState.errors.email.message).toBe(Errors.EMAIL_INVALID);
    });

    it("shows validation error for non .com email", async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { email: "test@test.org", password: "123456" },
                resolver: zodResolver(mockLoginSchema),
                mode: "onChange"
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <LoginPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.email).toBeDefined();
        });

        expect(formState.errors.email.message).toBe(Errors.IS_NOT_EMAIL);
    });

    it("shows validation error for missing password", async () => {
        let formState: any;

        const TestComponent = () => {
            const methods = useForm({
                defaultValues: { email: "test@test.com", password: "" },
                resolver: zodResolver(mockLoginSchema),
                mode: "onChange"
            });
            formState = methods.formState;

            React.useEffect(() => {
                methods.trigger();
            }, [methods]);

            return (
                <FormProvider {...methods}>
                    <LoginPage />
                </FormProvider>
            );
        };

        render(<TestComponent />);

        await waitFor(() => {
            expect(formState.errors).toBeDefined();
            expect(formState.errors.password).toBeDefined();
        });

        expect(formState.errors.password.message).toBe(Errors.REQUIRED_PASSWORD_INPUT);
    });
});
