import { Box, Button, Text } from '@presentation/components/ui';
import { checkForUpdateAsync, fetchUpdateAsync, reloadAsync, useUpdates } from 'expo-updates';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal } from 'react-native';
import { useAppState, usePrevious } from './utils';

interface AppUpdateModalProps {
    /** Whether to show non-critical updates */
    showNonCritical?: boolean;
    /** Callback when update check completes */
    onCheckComplete?: (isAvailable: boolean) => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ showNonCritical = false, onCheckComplete }) => {
    const useUpdatesReturn = useUpdates();
    const {
        isUpdateAvailable: maybeUpdateAvailable,
        isUpdatePending: maybeUpdatePending,
        isDownloading,
    } = useUpdatesReturn;

    // expo-updates doesn't expose downloadProgress directly in the hook
    // Show indeterminate progress when downloading
    const progress = isDownloading ? 50 : 0;

    const [isRollBackToEmbedded, setIsRollBackToEmbedded] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const appState = useAppState();
    const prevAppState = usePrevious(appState);

    const isUpdateDifferent =
        useUpdatesReturn.availableUpdate?.updateId !== undefined &&
        useUpdatesReturn.availableUpdate?.updateId !== useUpdatesReturn.currentlyRunning.updateId;

    const isUpdateAvailable = maybeUpdateAvailable && (isUpdateDifferent || isRollBackToEmbedded);
    const isUpdatePending = maybeUpdatePending && (isUpdateDifferent || isRollBackToEmbedded);

    const shouldShowModal = isUpdateAvailable && (showNonCritical || isRollBackToEmbedded);

    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const checkAndFetchUpdate = useCallback(async () => {
        if (__DEV__) {
            return;
        }

        setIsChecking(true);
        setError(null);

        try {
            const result = await checkForUpdateAsync();
            if (!isMounted.current) return;
            setIsRollBackToEmbedded(result.isRollBackToEmbedded);

            if (result.isAvailable || result.isRollBackToEmbedded) {
                const fetchResult = await fetchUpdateAsync();
                if (!isMounted.current) return;
                if (fetchResult.isNew || fetchResult.isRollBackToEmbedded) {
                    // Update downloaded successfully
                }
            }

            onCheckComplete?.(result.isAvailable);
        } catch (err) {
            if (!isMounted.current) return;
            setError((err as Error).message);
        } finally {
            if (isMounted.current) {
                setIsChecking(false);
            }
        }
    }, [onCheckComplete]);

    const handleRestart = useCallback(async () => {
        try {
            await reloadAsync();
        } catch (err) {
            if (isMounted.current) {
                setError((err as Error).message);
            }
        }
    }, []);

    useEffect(() => {
        if (shouldShowModal) {
            Keyboard.dismiss();
        }
    }, [shouldShowModal]);

    useEffect(() => {
        if (__DEV__) {
            return;
        }

        checkAndFetchUpdate();
    }, [checkAndFetchUpdate]);

    useEffect(() => {
        if (__DEV__) {
            return;
        }

        if (appState === 'active' && prevAppState?.match(/inactive|background/)) {
            checkAndFetchUpdate();
        }
    }, [appState, prevAppState, checkAndFetchUpdate]);

    useEffect(() => {
        if (isUpdatePending && isRollBackToEmbedded) {
            handleRestart().catch((err) => {
                if (isMounted.current) {
                    setError((err as Error).message);
                }
            });
        }
    }, [isUpdatePending, isRollBackToEmbedded, handleRestart]);

    if (!shouldShowModal && !isChecking && !error) {
        return null;
    }

    return (
        <Modal visible={shouldShowModal || isChecking || !!error} transparent animationType="fade" statusBarTranslucent>
            <Box className="flex-1 items-center justify-center bg-black/50 px-6">
                <Box className="w-full max-w-[340px] items-center rounded-xl bg-white p-6">
                    <ActivityIndicator size="large" color="#007AFF" />

                    <Text className="mb-2 mt-4 text-center text-lg font-semibold">
                        {isUpdatePending ? 'Update Ready' : 'Updating App'}
                    </Text>

                    <Text className="mb-6 text-center text-sm text-gray-600">
                        {isUpdatePending
                            ? 'A new version has been downloaded and is ready to install.'
                            : isDownloading
                              ? 'Please wait while we download the latest update...'
                              : 'Checking for updates...'}
                    </Text>

                    {(isDownloading || isUpdatePending) && (
                        <Box className="mb-4 w-full">
                            <Box className="h-1 overflow-hidden rounded bg-gray-200">
                                <Box
                                    className="h-full rounded bg-blue-500"
                                    style={{ width: `${isUpdatePending ? 100 : progress}%` }}
                                />
                            </Box>
                            <Text className="mt-2 text-center text-xs text-gray-600">
                                {isUpdatePending ? '100%' : `${Math.round(progress)}%`}
                            </Text>
                        </Box>
                    )}

                    {isUpdatePending && (
                        <Box className="w-full gap-3">
                            <Button onPress={handleRestart}>
                                <Text>Restart Now</Text>
                            </Button>
                        </Box>
                    )}

                    {error && (
                        <Box className="w-full gap-3">
                            <Text className="text-red-500 mb-6 text-center text-sm text-gray-600">{error}</Text>
                            <Button onPress={checkAndFetchUpdate}>
                                <Text>Retry</Text>
                            </Button>
                        </Box>
                    )}
                </Box>
            </Box>
        </Modal>
    );
};
