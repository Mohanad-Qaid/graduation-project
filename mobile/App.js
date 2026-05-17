import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { initDatabase } from './src/services/offlineDb';
import { injectStore } from './src/services/api';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY } from './src/config/stripe';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200EE',
    secondary: '#03DAC6',
    error: '#B00020',
    background: '#F5F5F5',
    surface: '#FFFFFF',
  },
};

// Inject Redux store into the API layer immediately so that the Axios
// response interceptor can dispatch logout when refresh tokens expire.
injectStore(store);

const App = () => {
  useEffect(() => {
    initDatabase().catch(err => {
      console.warn("Offline DB Initialization failed (expected in Expo Go):", err);
    });
  }, []);

  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <RootNavigator />
            </NavigationContainer>
          </StripeProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </Provider>
  );
};

export default App;
