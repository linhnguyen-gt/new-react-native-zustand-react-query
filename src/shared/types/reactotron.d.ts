import 'reactotron-react-native';

// Extend the DisplayConfig interface to include the color property
declare module 'reactotron-react-native' {
    interface DisplayConfig {
        color?: string;
    }
}
