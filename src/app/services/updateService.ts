import {
    checkForUpdateAsync,
    fetchUpdateAsync,
    reloadAsync,
    useUpdates,
    type CurrentlyRunningInfo,
    type UseUpdatesReturnType,
} from 'expo-updates';

export interface UpdateInfo {
    isAvailable: boolean;
    isPending: boolean;
    isDownloading: boolean;
    downloadProgress: number;
    currentVersion: string | null;
    availableVersion: string | null;
    isCritical: boolean;
    error: Error | null;
}

interface ManifestExtra {
    extra?: {
        expoClient?: {
            extra?: {
                criticalIndex?: number;
                message?: string;
            };
        };
    };
}

export const checkForUpdate = async (): Promise<{
    isAvailable: boolean;
    isRollBackToEmbedded: boolean;
}> => {
    try {
        const result = await checkForUpdateAsync();
        return {
            isAvailable: result.isAvailable,
            isRollBackToEmbedded: result.isRollBackToEmbedded || false,
        };
    } catch (error) {
        throw new Error(`Failed to check for update: ${(error as Error).message}`);
    }
};

export const downloadUpdate = async (): Promise<boolean> => {
    try {
        const result = await fetchUpdateAsync();
        return result.isNew || result.isRollBackToEmbedded || false;
    } catch (error) {
        throw new Error(`Failed to download update: ${(error as Error).message}`);
    }
};

export const applyUpdate = async (): Promise<void> => {
    try {
        await reloadAsync();
    } catch (error) {
        throw new Error(`Failed to apply update: ${(error as Error).message}`);
    }
};

export const isInDevelopmentMode = (currentlyRunning: CurrentlyRunningInfo): boolean => {
    return __DEV__ && currentlyRunning.updateId === undefined;
};

export const isCriticalUpdate = (useUpdatesReturn: UseUpdatesReturnType): boolean => {
    const { currentlyRunning, availableUpdate } = useUpdatesReturn;

    const currentManifest = currentlyRunning.manifest as ManifestExtra | undefined;
    const currentCriticalIndex = currentManifest?.extra?.expoClient?.extra?.criticalIndex ?? 0;

    const availableManifest = availableUpdate?.manifest as ManifestExtra | undefined;
    const availableCriticalIndex = availableManifest?.extra?.expoClient?.extra?.criticalIndex ?? 0;

    return availableCriticalIndex > currentCriticalIndex;
};

export const getUpdateMessage = (manifest: ManifestExtra | null | undefined): string => {
    return manifest?.extra?.expoClient?.extra?.message ?? '';
};

export { useUpdates, reloadAsync };
export type { CurrentlyRunningInfo, UseUpdatesReturnType };
