import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import MerchantDashboard from '../screens/merchant/DashboardScreen';
import GenerateQRScreen from '../screens/merchant/GenerateQRScreen';
import RequestWithdrawalScreen from '../screens/merchant/RequestWithdrawalScreen';
import WithdrawalHistoryScreen from '../screens/merchant/WithdrawalHistoryScreen';
import TransactionHistoryScreen from '../screens/merchant/TransactionHistoryScreen';
import ProfileScreen from '../screens/merchant/ProfileScreen';

import NotificationsScreen from '../screens/merchant/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard"          component={MerchantDashboard} />
    <Stack.Screen name="GenerateQR"         component={GenerateQRScreen} />
    <Stack.Screen name="RequestWithdrawal"  component={RequestWithdrawalScreen} />
    <Stack.Screen name="WithdrawalHistory"  component={WithdrawalHistoryScreen} />
    <Stack.Screen name="Notifications"      component={NotificationsScreen} />
  </Stack.Navigator>
);

const MerchantNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'store' : 'store-outline';
          } else if (route.name === 'QR') {
            iconName = focused ? 'qrcode' : 'qrcode';
          } else if (route.name === 'History') {
            iconName = focused ? 'history' : 'history';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="QR" component={GenerateQRScreen} />
      <Tab.Screen name="History" component={TransactionHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MerchantNavigator;
