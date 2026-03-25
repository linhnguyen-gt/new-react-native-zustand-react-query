import { Box, Button, IconComponent, Text } from '@presentation/components/ui';
import { checkForUpdateAsync, fetchUpdateAsync, reloadAsync, useUpdates } from 'expo-updates';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal } from 'react-native';
import { useAppState, usePrevious } from './utils';

interface ModalUpdateProps {
    /** Whether to show non-critical updates */
    showNonCritical?: boolean;
    /** Callback when update check completes */
    onCheckComplete?: (isAvailable: boolean) => void;
}

const ModalUpdate: React.FC<ModalUpdateProps> = ({ showNonCritical = false, onCheckComplete }) => {
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

    const renderIcon = () => {
        if (error) {
            return (
                <Box className="bg-red-50 mb-4 h-20 w-20 items-center justify-center rounded-full">
                    <IconComponent name="warning" size={40} color="#EF4444" font="ant-design" />
                </Box>
            );
        }
        if (isUpdatePending) {
            return (
                <Box className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-green-50">
                    <IconComponent name="check-circle" size={40} color="#22C55E" font="ant-design" />
                </Box>
            );
        }
        return (
            <Box className="w-full items-center justify-center">
                <Box className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                    <ActivityIndicator size="large" color="#3B82F6" />
                </Box>
            </Box>
        );
    };

    return (
        <Modal visible={shouldShowModal || isChecking || !!error} transparent animationType="fade" statusBarTranslucent>
            <Box className="flex-1 items-center justify-center bg-black/60 px-6">
                <Box className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-white shadow-2xl">
                    {/* Top accent bar */}
                    <Box className={`h-1 ${error ? 'bg-red-500' : isUpdatePending ? 'bg-green-500' : 'bg-blue-500'}`} />

                    <Box className="px-6 pb-6 pt-8">
                        {/* Icon */}
                        {renderIcon()}

                        {/* Title */}
                        <Text className="mb-2 text-center text-xl font-bold text-gray-900">
                            {error
                                ? 'Update Failed'
                                : isUpdatePending
                                  ? 'Update Ready'
                                  : isDownloading
                                    ? 'Downloading Update'
                                    : 'Checking for Updates'}
                        </Text>

                        {/* Description */}
                        <Text className="mb-6 text-center text-sm leading-relaxed text-gray-500">
                            {error
                                ? error
                                : isUpdatePending
                                  ? 'A new version has been downloaded and is ready to install. Restart now to apply the update.'
                                  : isDownloading
                                    ? 'Please wait while we download the latest update. This may take a few moments.'
                                    : 'Checking for the latest version of the app...'}
                        </Text>

                        {/* Progress bar */}
                        {(isDownloading || isUpdatePending) && (
                            <Box className="mb-6 w-full">
                                <Box className="h-2 overflow-hidden rounded-full bg-gray-100">
                                    <Box
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            isUpdatePending ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${isUpdatePending ? 100 : progress}%` }}
                                    />
                                </Box>
                                <Text className="mt-2 text-center text-xs font-medium text-gray-400">
                                    {isUpdatePending ? 'Download complete' : `${Math.round(progress)}%`}
                                </Text>
                            </Box>
                        )}

                        {/* Action buttons */}
                        {isUpdatePending && (
                            <Box className="gap-3">
                                <Button action="positive" onPress={handleRestart} className="w-full rounded-xl py-3.5">
                                    <Text className="font-semibold text-white">Restart Now</Text>
                                </Button>
                            </Box>
                        )}

                        {error && (
                            <Box className="gap-3">
                                <Button
                                    action="negative"
                                    onPress={checkAndFetchUpdate}
                                    className="w-full rounded-xl py-3.5">
                                    <Text className="font-semibold text-white">Try Again</Text>
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Modal>
    );
};

export default ModalUpdate;
