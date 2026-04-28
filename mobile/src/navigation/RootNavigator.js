import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet, AppState } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { loadUser, lockSession } from '../store/slices/authSlice';
import { initSocket, disconnectSocket } from '../services/socket';

import AuthNavigator from './AuthNavigator';
import PinLockScreen from '../screens/auth/PinLockScreen';
import CustomerNavigator from './CustomerNavigator';
import MerchantNavigator from './MerchantNavigator';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user, isSessionLocked, deviceEmail } =
    useSelector((state) => state.auth);

  const appState = useRef(AppState.currentState);

  // ── Cold-start: restore session + device registration ─────────────────────
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // ── AppState listener: lock when app is backgrounded ──────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        dispatch(lockSession());
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
      </View>
    );
  }

  // ── Routing logic ───────────────────────────────────────────────────────────
  //
  //  1. Device email saved + (app was locked  OR  no valid JWT)
  //       → PinLockScreen  (handles both Scenario A and B internally)
  //
  //  2. No device email + not authenticated
  //       → Full Login Screen  (first time ever, or after wipeDevice)
  //
  //  3. Authenticated, session not locked
  //       → App navigator by role

  const showPinLock = !!deviceEmail && (isSessionLocked || !isAuthenticated);
  const showFullAuth = !isAuthenticated && !deviceEmail;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showPinLock ? (
        <Stack.Screen name="PinLock" component={PinLockScreen} />
      ) : showFullAuth ? (
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
});

export default RootNavigator;
