import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { initDatabase } from './src/services/offlineDb';

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

const App = () => {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </PaperProvider>
    </Provider>
  );
};

export default App;
