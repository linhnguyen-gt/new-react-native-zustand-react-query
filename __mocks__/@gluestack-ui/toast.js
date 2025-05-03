import React from "react";

export const ToastProvider = ({ children }) => <>{children}</>;

export const createToastHook = () => {
    return () => ({
        show: jest.fn(),
        hide: jest.fn(),
        isActive: false,
        hideAll: jest.fn()
    });
};
