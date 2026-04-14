import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { loadUser } from '../store/slices/authSlice';
import { initSocket, disconnectSocket } from '../services/socket';

import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import MerchantNavigator from './MerchantNavigator';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initSocket(user.id);
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user?.role === 'merchant' ? (
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
