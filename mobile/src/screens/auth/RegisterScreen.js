import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Text, Snackbar, SegmentedButtons } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError, clearRegistrationSuccess } from '../../store/slices/authSlice';

// ─── Design tokens (mirrors DashboardScreen) ─────────────────────────────────
const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';

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
      setTimeout(() => { navigation.navigate('Login'); }, 2000);
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
    if (role === 'MERCHANT') payload.business_name = businessName.trim();
    dispatch(register(payload));
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero header ─────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          <View style={styles.heroContent}>
            <View style={styles.brandIcon}>
              <Icon name="account-plus-outline" size={34} color="#fff" />
            </View>
            <Text style={styles.heroSmall}>Join E-Wallet</Text>
            <Text style={styles.heroName}>Create Account</Text>
            <Text style={styles.heroSub}>Start your digital wallet journey</Text>
          </View>
        </View>

        {/* ── Floating form panel ─────────────────────────────────────────── */}
        <View style={styles.panel}>

          {/* Account type selector */}
          <Text style={styles.fieldLabel}>Account Type</Text>
          <SegmentedButtons
            value={role}
            onValueChange={setRole}
            buttons={[
              {
                value: 'CUSTOMER',
                label: 'Customer',
                icon: 'account-outline',
                checkedColor: '#fff',
                uncheckedColor: PURPLE_MAIN,
                style: role === 'CUSTOMER' ? { backgroundColor: PURPLE_DARK } : {},
              },
              {
                value: 'MERCHANT',
                label: 'Merchant',
                icon: 'store-outline',
                checkedColor: '#fff',
                uncheckedColor: PURPLE_MAIN,
                style: role === 'MERCHANT' ? { backgroundColor: PURPLE_DARK } : {},
              },
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
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="account-outline" color={PURPLE_MAIN} />}
          />
          <TextInput
            label="Last Name *"
            value={lastName}
            onChangeText={setLastName}
            mode="outlined"
            style={styles.input}
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="account-outline" color={PURPLE_MAIN} />}
          />

          <TextInput
            label="Email *"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="email-outline" color={PURPLE_MAIN} />}
          />

          <TextInput
            label="Phone *"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="phone-outline" color={PURPLE_MAIN} />}
          />

          {role === 'MERCHANT' && (
            <TextInput
              label="Business Name *"
              value={businessName}
              onChangeText={setBusinessName}
              mode="outlined"
              style={styles.input}
              activeOutlineColor={PURPLE_MAIN}
              outlineColor="#DDD"
              left={<TextInput.Icon icon="store-outline" color={PURPLE_MAIN} />}
            />
          )}

          <TextInput
            label="6-Digit PIN *"
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 6))}
            mode="outlined"
            keyboardType="numeric"
            secureTextEntry
            maxLength={6}
            style={styles.input}
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="lock-outline" color={PURPLE_MAIN} />}
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
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="lock-check-outline" color={PURPLE_MAIN} />}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>{isLoading ? 'Creating account…' : 'Register'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkAccent}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Error snackbar */}
      <Snackbar
        visible={!!error || !!validationError}
        onDismiss={() => { dispatch(clearError()); setValidationError(''); }}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },
  scroll: { flexGrow: 1 },

  /* ── Hero ──────────────────────────────────────────────────────────────── */
  hero: {
    backgroundColor: PURPLE_DARK,
    paddingTop: 72,
    paddingBottom: 60,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },
  blob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: PURPLE_MID, opacity: 0.45, top: -60, right: -50,
  },
  blob2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: PURPLE_MAIN, opacity: 0.3, bottom: -30, left: 60,
  },
  blob3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#9B59B6', opacity: 0.2, top: 20, left: -20,
  },
  heroContent: { alignItems: 'center', zIndex: 1 },
  brandIcon: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  heroSmall: { color: 'rgba(255,255,255,0.65)', fontSize: 13, letterSpacing: 0.3 },
  heroName: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 4, letterSpacing: 0.2 },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 6 },

  /* ── Floating form panel ─────────────────────────────────────────────── */
  panel: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -28,
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: PURPLE_MAIN,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 32,
  },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },

  segmented: { marginBottom: 16 },

  input: { marginBottom: 12, backgroundColor: '#fff' },

  submitBtn: {
    backgroundColor: PURPLE_DARK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: PURPLE_DARK,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitDisabled: { backgroundColor: '#B0BEC5', elevation: 0, shadowOpacity: 0 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

  linkBtn: { alignItems: 'center', marginTop: 18 },
  linkText: { color: '#888', fontSize: 14 },
  linkAccent: { color: PURPLE_MAIN, fontWeight: '700' },

  successSnackbar: { backgroundColor: '#4CAF50' },
});

export default RegisterScreen;
