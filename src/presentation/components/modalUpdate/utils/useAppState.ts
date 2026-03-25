import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export const useAppState = (): AppStateStatus => {
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            setAppState(nextAppState);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return appState;
};
