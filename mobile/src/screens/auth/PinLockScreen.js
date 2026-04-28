import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Vibration,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as SecureStore from 'expo-secure-store';
import { useDispatch, useSelector } from 'react-redux';
import {
    pinLogin,
    unlockSession,
    incrementFailCount,
    wipeDevice,
    clearError,
} from '../../store/slices/authSlice';

const MAX_ATTEMPTS = 3;
const KEY_PIN_HASH = 'ewallet_pin_hash';

// Must match the hash function in authSlice.js
function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

const PIN_LENGTH = 6;

/** Build two-letter initials from first + last name */
function getInitials(firstName, lastName) {
    const a = (firstName || '').trim()[0] || '';
    const b = (lastName || '').trim()[0] || '';
    return (a + b).toUpperCase();
}

const PinLockScreen = () => {
    const dispatch = useDispatch();
    const {
        isAuthenticated,
        isLoading,
        error,
        failCount,
        cachedFirstName,
        cachedLastName,
    } = useSelector((state) => state.auth);

    const [pin, setPin] = useState('');
    const [localError, setLocalError] = useState('');

    // If failCount hits MAX_ATTEMPTS, wipe the device
    useEffect(() => {
        if (failCount >= MAX_ATTEMPTS) {
            dispatch(wipeDevice());
        }
    }, [failCount, dispatch]);

    // Auto-submit when 6 digits are entered
    useEffect(() => {
        if (pin.length === PIN_LENGTH) {
            handleSubmit(pin);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pin]);

    const handleSubmit = async (enteredPin) => {
        setLocalError('');
        if (isAuthenticated) {
            // ── Scenario A: Soft Lock — compare locally ──────────────────────
            const storedHash = await SecureStore.getItemAsync(KEY_PIN_HASH);
            if (storedHash && simpleHash(enteredPin) === storedHash) {
                dispatch(unlockSession());
            } else {
                Vibration.vibrate(200);
                dispatch(incrementFailCount());
                const remaining = MAX_ATTEMPTS - (failCount + 1);
                if (remaining > 0) {
                    setLocalError(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
                }
                setPin('');
            }
        } else {
            // ── Scenario B: Hard Logout — authenticate against backend ───────
            dispatch(pinLogin({ pin: enteredPin }));
            setPin('');
        }
    };

    const handleKeyPress = (key) => {
        if (isLoading) return;
        if (key === 'del') {
            setPin((p) => p.slice(0, -1));
            setLocalError('');
        } else if (pin.length < PIN_LENGTH) {
            setPin((p) => p + key);
        }
    };

    const handleSwitchAccount = () => {
        dispatch(wipeDevice());
    };

    const displayError = localError || error;
    const attemptsLeft = MAX_ATTEMPTS - failCount;
    const isPendingError = typeof displayError === 'string' &&
        displayError.toLowerCase().includes('under review');

    const initials = getInitials(cachedFirstName, cachedLastName);

    return (
        <View style={styles.container}>
            {/* ── Header ──────────────────────────────────────────────────── */}
            <View style={styles.header}>
                {initials ? (
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                ) : (
                    <View style={styles.logoCircle}>
                        <Icon name="wallet" size={40} color="#FFFFFF" />
                    </View>
                )}

                <Text style={styles.welcomeText}>Welcome back</Text>
                {cachedFirstName ? (
                    <Text style={styles.nameText}>{cachedFirstName} 👋</Text>
                ) : null}
                <Text style={styles.subText}>Enter your PIN to continue</Text>
            </View>

            {/* ── Pending account banner ───────────────────────────────────── */}
            {isPendingError && (
                <View style={styles.pendingBanner}>
                    <Icon name="clock-outline" size={18} color="#7c4d00" style={{ marginRight: 8 }} />
                    <Text style={styles.pendingText}>
                        Your account is under review and awaiting approval.
                    </Text>
                </View>
            )}

            {/* ── PIN dots ─────────────────────────────────────────────────── */}
            <View style={styles.dotsRow}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i < pin.length && styles.dotFilled,
                        ]}
                    />
                ))}
            </View>

            {/* ── Attempts warning ─────────────────────────────────────────── */}
            {displayError && !isPendingError ? (
                <Text style={styles.errorText}>{displayError}</Text>
            ) : null}
            {!displayError && failCount > 0 ? (
                <Text style={styles.errorText}>
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                </Text>
            ) : null}

            {/* ── Number pad ──────────────────────────────────────────────── */}
            <View style={styles.pad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, idx) => {
                    if (key === '') return <View key={idx} style={styles.keyPlaceholder} />;
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={styles.key}
                            onPress={() => handleKeyPress(key)}
                            disabled={isLoading}
                            activeOpacity={0.7}
                        >
                            {key === 'del' ? (
                                <Icon name="backspace-outline" size={26} color="#4A148C" />
                            ) : (
                                <Text style={styles.keyText}>{key}</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Loading indicator ────────────────────────────────────────── */}
            {isLoading && (
                <Text style={styles.loadingText}>Verifying…</Text>
            )}

            {/* ── Switch account ───────────────────────────────────────────── */}
            <TouchableOpacity onPress={handleSwitchAccount} style={styles.switchBtn}>
                <Text style={styles.switchText}>Sign in with a different account</Text>
            </TouchableOpacity>

            {/* ── Snackbar for non-pending backend errors ───────────────────── */}
            <Snackbar
                visible={!!error && !isPendingError && !isLoading}
                onDismiss={() => dispatch(clearError())}
                duration={4000}
                action={{ label: 'OK', onPress: () => dispatch(clearError()) }}
            >
                {error}
            </Snackbar>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3E5F5',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#6200EE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 6,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#6200EE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 6,
        shadowColor: '#6200EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '700',
    },
    welcomeText: {
        fontSize: 16,
        color: '#555',
        fontWeight: '500',
    },
    nameText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#4A148C',
        marginTop: 4,
    },
    subText: {
        fontSize: 14,
        color: '#777',
        marginTop: 8,
    },

    pendingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        borderWidth: 1,
        borderColor: '#FFB300',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        width: '100%',
    },
    pendingText: {
        flex: 1,
        color: '#7c4d00',
        fontSize: 13,
        lineHeight: 18,
    },

    dotsRow: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 14,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#6200EE',
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: '#6200EE',
    },

    errorText: {
        color: '#C62828',
        fontSize: 13,
        marginBottom: 12,
        textAlign: 'center',
    },
    loadingText: {
        color: '#6200EE',
        fontSize: 14,
        marginTop: 8,
    },

    pad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 280,
        justifyContent: 'center',
        marginTop: 8,
    },
    key: {
        width: 80,
        height: 80,
        margin: 6,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    keyPlaceholder: {
        width: 80,
        height: 80,
        margin: 6,
    },
    keyText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#4A148C',
    },

    switchBtn: {
        marginTop: 28,
        padding: 8,
    },
    switchText: {
        color: '#6200EE',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});

export default PinLockScreen;
