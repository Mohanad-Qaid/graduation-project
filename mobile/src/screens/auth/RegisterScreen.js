import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button, Text, Card, Snackbar, SegmentedButtons } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError, clearRegistrationSuccess } from '../../store/slices/authSlice';

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error, registrationSuccess } = useSelector((state) => state.auth);

  const [role, setRole] = useState('CUSTOMER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearRegistrationSuccess());
    };
  }, [dispatch]);

  useEffect(() => {
    if (registrationSuccess) {
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    }
  }, [registrationSuccess, navigation]);

  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setValidationError('First and last name are required.');
      return false;
    }
    if (!email.trim()) {
      setValidationError('Email is required.');
      return false;
    }
    if (!phone.trim()) {
      setValidationError('Phone number is required.');
      return false;
    }
    if (!/^\d{6}$/.test(pin)) {
      setValidationError('PIN must be exactly 6 digits.');
      return false;
    }
    if (pin !== confirmPin) {
      setValidationError('PINs do not match.');
      return false;
    }
    if (role === 'MERCHANT' && !businessName.trim()) {
      setValidationError('Business name is required for merchants.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleRegister = () => {
    if (!validateForm()) return;

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: pin,
      role,
    };
    if (role === 'MERCHANT') {
      payload.business_name = businessName.trim();
    }

    dispatch(register(payload));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Create Account
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Register to start using E-Wallet
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {/* Role selector */}
            <Text variant="labelLarge" style={styles.label}>Account Type</Text>
            <SegmentedButtons
              value={role}
              onValueChange={setRole}
              buttons={[
                { value: 'CUSTOMER', label: 'Customer' },
                { value: 'MERCHANT', label: 'Merchant' },
              ]}
              style={styles.segmented}
            />

            {/* Name */}
            <TextInput
              label="First Name *"
              value={firstName}
              onChangeText={setFirstName}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            <TextInput
              label="Last Name *"
              value={lastName}
              onChangeText={setLastName}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" />}
            />

            {/* Email */}
            <TextInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />

            {/* Phone — required */}
            <TextInput
              label="Phone *"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              left={<TextInput.Icon icon="phone" />}
            />

            {/* Business name – shown only for merchants */}
            {role === 'MERCHANT' && (
              <TextInput
                label="Business Name *"
                value={businessName}
                onChangeText={setBusinessName}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="store" />}
              />
            )}

            {/* 6-digit PIN */}
            <TextInput
              label="6-Digit PIN *"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 6))}
              mode="outlined"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
            />
            <TextInput
              label="Confirm PIN *"
              value={confirmPin}
              onChangeText={(t) => setConfirmPin(t.replace(/\D/g, '').slice(0, 6))}
              mode="outlined"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              style={styles.input}
              left={<TextInput.Icon icon="lock-check" />}
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
            >
              Register
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.linkButton}
            >
              Already have an account? Sign In
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Error snackbar */}
      <Snackbar
        visible={!!error || !!validationError}
        onDismiss={() => {
          dispatch(clearError());
          setValidationError('');
        }}
        duration={3500}
      >
        {error || validationError}
      </Snackbar>

      {/* Success snackbar */}
      <Snackbar
        visible={registrationSuccess}
        onDismiss={() => dispatch(clearRegistrationSuccess())}
        duration={2500}
        style={styles.successSnackbar}
      >
        Registration successful! Awaiting admin approval.
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { flexGrow: 1, padding: 20 },
  header: { alignItems: 'center', marginVertical: 20 },
  title: { fontWeight: 'bold', color: '#6200EE' },
  subtitle: { color: '#666', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF' },
  label: { marginBottom: 8 },
  segmented: { marginBottom: 16 },
  input: { marginBottom: 12 },
  button: { marginTop: 8, paddingVertical: 6 },
  linkButton: { marginTop: 16 },
  successSnackbar: { backgroundColor: '#4CAF50' },
});

export default RegisterScreen;
