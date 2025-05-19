import { createToastHook } from "@gluestack-ui/toast";
import { AnimatePresence, Motion } from "@legendapp/motion";
import React from "react";

import { MyTouchable } from "../components/touchable";
import { Text } from "../components/ui";
import Box from "../components/ui/box";
import HStack from "../components/ui/hStack";
import IconComponent from "../components/ui/icon";
import { Toast, ToastTitle } from "../components/ui/toast";

import { fullWidth } from "@/shared/helper";

const MotionView = Motion.View;

export const useToast = createToastHook(MotionView, AnimatePresence);

const getToastWidth = () => {
    return Math.min(fullWidth * 0.85, 350);
};

const getIcon = (type: string) => {
    switch (type) {
        case "success":
            return "check-circle";
        case "error":
            return "error";
        case "warning":
            return "warning";
        default:
            return "info";
    }
};

const getColor = (type: string) => {
    switch (type) {
        case "success":
            return "success-500";
        case "error":
            return "error-500";
        case "warning":
            return "warning-500";
        default:
            return "info-500";
    }
};

const useShowToast = () => {
    const toast = useToast();

    const showRegularToast = (
        message: string,
        type: "success" | "error" | "warning" | "info" = "info",
        duration: number = 3000
    ) => {
        toast.show({
            placement: "bottom",
            duration,
            render: ({ id }) => {
                const iconName = getIcon(type);
                const color = getColor(type);

                return React.createElement(
                    Toast,
                    {
                        action: type,
                        nativeID: `toast-${id}`,
                        className: "p-4 gap-3 mx-auto bg-background-0 shadow-hard-2 rounded-lg",
                        style: { width: getToastWidth() }
                    },
                    React.createElement(
                        HStack,
                        { space: "md", className: "items-center justify-center" },
                        React.createElement(
                            Box,
                            { className: `p-2 rounded-full bg-${color}/10` },
                            React.createElement(IconComponent, {
                                font: "material-icons",
                                name: iconName,
                                size: 24,
                                color: getColor(type)
                            })
                        ),
                        React.createElement(
                            Box,
                            { className: "flex-1" },
                            React.createElement(
                                ToastTitle,
                                {
                                    className: "text-typography-900 font-semibold text-center",
                                    numberOfLines: 2
                                },
                                message
                            )
                        )
                    )
                );
            }
        });
    };

    const showSuccessDialog = (message: string, onPress?: () => void) => {
        const toastId = toast.show({
            placement: "bottom",
            duration: 5000,
            render: ({ id }) => {
                const handlePress = () => {
                    if (onPress) onPress();
                    toast.close(id);
                };

                return React.createElement(
                    Toast,
                    {
                        action: "success",
                        nativeID: `toast-success-${id}`,
                        className: "p-[12px] rounded-md overflow-hidden mx-auto bg-success-50/90",
                        style: { width: getToastWidth() }
                    },
                    React.createElement(
                        HStack,
                        { space: "md", className: "items-center justify-center" },

                        React.createElement(
                            Box,
                            { className: "flex-1" },
                            React.createElement(
                                ToastTitle,
                                {
                                    className: "text-typography-900 font-semibold text-start text-green",
                                    numberOfLines: 2
                                },
                                message
                            )
                        ),
                        React.createElement(
                            MyTouchable,
                            {
                                onPress: handlePress
                            },
                            React.createElement(Text, { className: "text-green font-semibold", numberOfLines: 2 }, "OK")
                        )
                    )
                );
            }
        });

        return toastId;
    };

    const showErrorDialog = (message: string, onPress?: () => void) => {
        const toastId = toast.show({
            placement: "bottom",
            duration: 5000,
            render: ({ id }) => {
                const handlePress = () => {
                    if (onPress) onPress();
                    toast.close(id);
                };

                return React.createElement(
                    Toast,
                    {
                        action: "error",
                        nativeID: `toast-error-${id}`,
                        className: "p-[12px] rounded-md overflow-hidden mx-auto bg-error-50/90",
                        style: { width: getToastWidth() }
                    },
                    React.createElement(
                        HStack,
                        { space: "md", className: "items-center justify-center" },

                        React.createElement(
                            Box,
                            { className: "flex-1" },
                            React.createElement(
                                ToastTitle,
                                {
                                    className: "text-typography-900 font-semibold text-start text-red",
                                    numberOfLines: 2
                                },
                                message
                            )
                        ),
                        React.createElement(
                            MyTouchable,
                            {
                                onPress: handlePress
                            },
                            React.createElement(Text, { className: "text-red font-semibold", numberOfLines: 2 }, "OK")
                        )
                    )
                );
            }
        });

        return toastId;
    };

    return {
        show: showRegularToast,
        showError: showErrorDialog,
        showSuccess: showSuccessDialog
    };
};

export default useShowToast;
