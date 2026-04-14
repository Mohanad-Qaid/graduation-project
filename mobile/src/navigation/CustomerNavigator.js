import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import CustomerDashboard from '../screens/customer/DashboardScreen';
import AddBalanceScreen from '../screens/customer/AddBalanceScreen';
import QRScannerScreen from '../screens/customer/QRScannerScreen';
import PaymentConfirmScreen from '../screens/customer/PaymentConfirmScreen';
import TransactionHistoryScreen from '../screens/customer/TransactionHistoryScreen';
import ExpenseDashboardScreen from '../screens/customer/ExpenseDashboardScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={CustomerDashboard} />
    <Stack.Screen name="AddBalance" component={AddBalanceScreen} />
    <Stack.Screen name="QRScanner" component={QRScannerScreen} />
    <Stack.Screen name="PaymentConfirm" component={PaymentConfirmScreen} />
  </Stack.Navigator>
);

const CustomerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'history' : 'history';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'chart-pie' : 'chart-pie';
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
      <Tab.Screen name="History" component={TransactionHistoryScreen} />
      <Tab.Screen name="Stats" component={ExpenseDashboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default CustomerNavigator;
