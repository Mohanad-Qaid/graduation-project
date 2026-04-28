import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, AppState } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { loadUser, lockSession } from '../store/slices/authSlice';
import { initSocket, disconnectSocket } from '../services/socket';

import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import MerchantNavigator from './MerchantNavigator';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user, isSessionLocked, cachedEmail, isOffline } =
    useSelector((state) => state.auth);

  const appState = useRef(AppState.currentState);

  // ── Cold-start: restore session + device registration ─────────────────────
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // ── AppState listener: lock if away for more than LOCK_DELAY_MS ──────────
  // setTimeout does NOT reliably fire in the background on React Native —
  // the JS thread is suspended by the OS. Instead we record the timestamp
  // when the app backgrounds and check elapsed time on foreground entry.
  const backgroundTimestamp = useRef(null);
  const LOCK_DELAY_MS = 15 * 1000; // 15 seconds

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current === 'active' && nextState === 'background') {
        // Stamp the moment we left
        backgroundTimestamp.current = Date.now();
      }

      if (nextState === 'active' && appState.current !== 'active') {
        // Back in foreground — check how long we were away
        if (backgroundTimestamp.current !== null) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (elapsed >= LOCK_DELAY_MS) {
            dispatch(lockSession());
          }
          backgroundTimestamp.current = null;
        }
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [dispatch]);

  // ── Socket lifecycle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && !isSessionLocked && user?.id) {
      initSocket(user.id);
    } else {
      disconnectSocket();
    }
    return () => disconnectSocket();
  }, [isAuthenticated, isSessionLocked, user?.id]);

  // ── Splash / loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              No Internet Connection
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ── Routing logic ───────────────────────────────────────────────────────────
  //
  //  1. Not authenticated OR session is locked
  //       → AuthNavigator (LoginScreen renders PIN pad or full login internally)
  //
  //  2. Authenticated + session active → role-based navigator

  const showAuth = !isAuthenticated || isSessionLocked;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showAuth ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user?.role?.toUpperCase() === 'MERCHANT' ? (
        <Stack.Screen name="Merchant" component={MerchantNavigator} />
      ) : (
        <Stack.Screen name="Customer" component={CustomerNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  offlineBanner: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB300',
  },
  offlineText: {
    color: '#7c4d00',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RootNavigator;
