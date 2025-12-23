import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Logger } from '@/shared/helper';

import { Box, Text, VStack } from './ui';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
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
