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
            iconName = focused ? 'format-list-bulleted' : 'format-list-bulleted-square';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'chart-areaspline' : 'chart-areaspline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200EE',
        tabBarInactiveTintColor: '#ABABAB',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#1A006B',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          height: 62,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
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
