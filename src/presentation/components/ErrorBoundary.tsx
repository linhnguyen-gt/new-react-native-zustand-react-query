import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Logger } from '@/shared/helper';

import { Box, Text, VStack } from './ui';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /**
     * Values that identify the content being rendered. When any of them changes the
     * boundary clears its error state.
     *
     * Without this, "Try Again" only re-rendered the identical subtree, so a
     * deterministic error (a bad prop, bad cached data) re-threw immediately and the
     * user was left tapping a button that could never succeed. Pass something that
     * actually changes — a route key, a query key — so retrying can differ.
     */
    resetKeys?: readonly unknown[];
}

interface State {
    hasError: boolean;
    error?: Error;
}

const haveResetKeysChanged = (previous?: readonly unknown[], next?: readonly unknown[]): boolean => {
    if (!previous || !next) return false;
    if (previous.length !== next.length) return true;
    return previous.some((value, index) => !Object.is(value, next[index]));
};

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidUpdate(previousProps: Props) {
        if (this.state.hasError && haveResetKeysChanged(previousProps.resetKeys, this.props.resetKeys)) {
            this.setState({ hasError: false, error: undefined });
        }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        Logger.error('ErrorBoundary', 'Component error caught', {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            errorInfo: {
                componentStack: errorInfo.componentStack,
            },
        });

        this.props.onError?.(error, errorInfo);
    }

    private handleRetry = () => {
        // Clears the error so the subtree remounts. If the underlying cause is
        // deterministic this will re-throw — pass `resetKeys` so a retry can actually
        // render something different.
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Box flex={1} justifyContent="center" alignItems="center" padding={24} backgroundColor="white">
                    <VStack space="lg" alignItems="center">
                        <Text size="2xl" fontWeight="bold" color="#ef4444">
                            Oops! Something went wrong
                        </Text>
                        <Text size="md" color="#64748b" textAlign="center">
                            We&apos;re sorry for the inconvenience. Please try again.
                        </Text>
                        {__DEV__ && this.state.error && (
                            <Box
                                backgroundColor="#fef2f2"
                                padding={12}
                                borderRadius={8}
                                borderWidth={1}
                                borderColor="#fecaca"
                                marginTop={16}>
                                <Text size="sm" color="#dc2626" fontFamily="monospace">
                                    {this.state.error.message}
                                </Text>
                            </Box>
                        )}
                        <Box
                            backgroundColor="#3b82f6"
                            paddingHorizontal={24}
                            paddingVertical={12}
                            borderRadius={8}
                            marginTop={16}>
                            <Text
                                size="md"
                                color="white"
                                fontWeight="medium"
                                onPress={this.handleRetry}
                                accessibilityRole="button"
                                accessibilityLabel="Retry">
                                Try Again
                            </Text>
                        </Box>
                    </VStack>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
