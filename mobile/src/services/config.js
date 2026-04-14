import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Dynamically resolves the backend API base URL.
 *
 * Priority order:
 *  1. EXPO_PUBLIC_API_PORT env var (set in .env in mobile root)
 *  2. Fallback to port 5000
 *
 * IP resolution:
 *  - Physical device (Expo Go) → LAN IP from Constants.expoConfig.hostUri
 *  - Android emulator → 10.0.2.2
 *  - Web → localhost
 */
const PORT = process.env.EXPO_PUBLIC_API_PORT || '5000';

function getBaseUrl() {
    if (Platform.OS === 'web') {
        return `http://localhost:${PORT}/api/v1`;
    }

    // hostUri is set by Expo dev server, e.g. "192.168.1.10:8081"
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const lanIp = hostUri.split(':')[0];
        // Non-loopback IP means we're on a physical device
        if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
            return `http://${lanIp}:${PORT}/api/v1`;
        }
    }

    // Android emulator — host machine is reachable at 10.0.2.2
    if (Platform.OS === 'android') {
        return `http://10.0.2.2:${PORT}/api/v1`;
    }

    // iOS simulator
    return `http://localhost:${PORT}/api/v1`;
}

export const API_BASE_URL = getBaseUrl();
