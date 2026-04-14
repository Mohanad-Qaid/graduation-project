import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/slices/authSlice';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleLogin = () => {
    if (!email || pin.length !== 6) return;
    dispatch(login({ email: email.trim(), password: pin }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>E-Wallet</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />

            <TextInput
              label="6-Digit PIN"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 6))}
              mode="outlined"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading || !email || pin.length !== 6}
              style={styles.button}
            >
              Sign In
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              style={styles.linkButton}
            >
              Don't have an account? Register
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => dispatch(clearError())}
        duration={3000}
        action={{ label: 'OK', onPress: () => dispatch(clearError()) }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontWeight: 'bold', color: '#6200EE' },
  subtitle: { color: '#666', marginTop: 8 },
  card: { backgroundColor: '#FFFFFF' },
  input: { marginBottom: 16 },
  button: { marginTop: 8, paddingVertical: 6 },
  linkButton: { marginTop: 16 },
});

export default LoginScreen;
