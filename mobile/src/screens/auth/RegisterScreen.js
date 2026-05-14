import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Text, Snackbar, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import {
  register, clearError, clearRegistrationSuccess,
  sendOTP, verifyEmail, clearOtpState,
} from '../../store/slices/authSlice';
import OTPInput from '../../components/OTPInput';

// ─── Design tokens (mirrors DashboardScreen) ─────────────────────────────────
const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';

const OTP_SECONDS = 180;

// Countdown hook shared with ForgotPasswordScreen
function useCountdown(startSeconds, active) {
  const [remaining, setRemaining] = useState(startSeconds);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (!active) { setRemaining(startSeconds); return; }
    setRemaining(startSeconds);
    intervalRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) { clearInterval(intervalRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [active, startSeconds]);
  return remaining;
}

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isSubmitting: isLoading, error, registrationSuccess, otpLoading, otpError, otpSuccess } = useSelector((state) => state.auth);

  // Step 1 = registration form, Step 2 = OTP verify
  const [step, setStep] = useState(1);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
  const [otpActive, setOtpActive] = useState(false);

  const countdown = useCountdown(OTP_SECONDS, otpActive);
  const timerRunning = countdown > 0 && otpActive;
  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');
  const otpCode = otpDigits.join('');
  const otpComplete = otpCode.length === 6;

  const [role, setRole] = useState('CUSTOMER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDigits, setPhoneDigits] = useState(''); // 10 digits only; +90 is static
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [validationError, setValidationError] = useState('');

  // Combined error — shows server error OR local validation error
  const displayError = error || validationError;

  // Clear errors as soon as the user starts fixing their input
  const clearErrors = () => {
    if (validationError) setValidationError('');
    if (error) dispatch(clearError());
  };

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearRegistrationSuccess());
      dispatch(clearOtpState());
    };
  }, [dispatch]);

  // After registration success → transition to OTP step
  useEffect(() => {
    if (registrationSuccess && step === 1) {
      const emailSent = email.trim().toLowerCase();
      setRegisteredEmail(emailSent);
      dispatch(clearRegistrationSuccess());
      // Fire the OTP send immediately after registration
      dispatch(sendOTP({ email: emailSent, purpose: 'verify' })).then(() => {
        setStep(2);
        setOtpActive(true);
      });
    }
  }, [registrationSuccess]);

  // After email verified → go to login with snackbar
  useEffect(() => {
    if (otpSuccess && step === 2) {
      const t = setTimeout(() => {
        dispatch(clearOtpState());
        navigation.navigate('Login');
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [otpSuccess]);

  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setValidationError('First and last name are required.');
      return false;
    }
    if (!email.trim()) {
      setValidationError('Email is required.');
      return false;
    }
    if (phoneDigits.length !== 10) {
      setValidationError('Phone number must be exactly 10 digits (after +90).');
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
    if (role === 'MERCHANT' && !businessCategory) {
      setValidationError('Please select a business category.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleRegister = () => {
    if (!validateForm()) return;
    const fullPhone = `+90${phoneDigits}`;
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: fullPhone,
      password: pin,
      role,
    };
    if (role === 'MERCHANT') {
      payload.business_name = businessName.trim();
      payload.business_category = businessCategory;
    }
    dispatch(register(payload));
  };

  const handleVerifyOTP = async () => {
    if (!otpComplete) return;
    dispatch(verifyEmail({ email: registeredEmail, code: otpCode }));
  };

  const handleResendOTP = () => {
    setOtpDigits(Array(6).fill(''));
    dispatch(clearOtpState());
    dispatch(sendOTP({ email: registeredEmail, purpose: 'verify', isResend: true }));
    setOtpActive(false);
    setTimeout(() => setOtpActive(true), 50);
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

          {/* ── Inline error banner — shown for both validation & server errors ── */}
          {!!displayError && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={18} color="#B71C1C" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.errorBannerText}>{displayError}</Text>
            </View>
          )}

          {/* Name */}
          <TextInput
            label="First Name *"
            value={firstName}
            onChangeText={(v) => { setFirstName(v); clearErrors(); }}
            mode="outlined"
            style={styles.input}
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="account-outline" color={PURPLE_MAIN} />}
          />
          <TextInput
            label="Last Name *"
            value={lastName}
            onChangeText={(v) => { setLastName(v); clearErrors(); }}
            mode="outlined"
            style={styles.input}
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="account-outline" color={PURPLE_MAIN} />}
          />

          <TextInput
            label="Email *"
            value={email}
            onChangeText={(v) => { setEmail(v); clearErrors(); }}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            activeOutlineColor={PURPLE_MAIN}
            outlineColor="#DDD"
            left={<TextInput.Icon icon="email-outline" color={PURPLE_MAIN} />}
          />

          {/* Phone — split field: static +90 prefix + 10-digit input */}
          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <View style={styles.phoneRow}>
            <View style={styles.phonePrefix}>
              <Icon name="phone-outline" size={16} color={PURPLE_MAIN} style={{ marginRight: 6 }} />
              <Text style={styles.phonePrefixText}>+90</Text>
            </View>
            <TextInput
              value={phoneDigits}
              onChangeText={(v) => {
                setPhoneDigits(v.replace(/\D/g, '').slice(0, 10));
                clearErrors();
              }}
              mode="outlined"
              keyboardType="numeric"
              maxLength={10}
              placeholder="5XXXXXXXXX"
              style={styles.phoneInput}
              activeOutlineColor={PURPLE_MAIN}
              outlineColor="#DDD"
            />
          </View>

          {role === 'MERCHANT' && (
            <>
              <TextInput
                label="Business Name *"
                value={businessName}
                onChangeText={(v) => { setBusinessName(v); clearErrors(); }}
                mode="outlined"
                style={styles.input}
                activeOutlineColor={PURPLE_MAIN}
                outlineColor="#DDD"
                left={<TextInput.Icon icon="store-outline" color={PURPLE_MAIN} />}
              />
              {/* Business category chips */}
              <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Business Category *</Text>
              <View style={styles.categoryRow}>
                {[
                  { value: 'FOOD_AND_DRINK',      label: '🍔 Food & Drink' },
                  { value: 'SHOPPING',             label: '🛍 Shopping' },
                  { value: 'TRANSPORT',            label: '🚗 Transport' },
                  { value: 'BILLS_AND_UTILITIES',  label: '⚡ Bills' },
                  { value: 'LIFESTYLE',            label: '✨ Lifestyle' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      businessCategory === cat.value && styles.categoryChipActive,
                    ]}
                    onPress={() => { setBusinessCategory(cat.value); clearErrors(); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      businessCategory === cat.value && styles.categoryChipTextActive,
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
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

      {/* ── STEP 2: Email OTP Verification ─────────────────────────────── */}
      {step === 2 && (
        <View style={styles.otpOverlay}>
          <View style={styles.otpCard}>
            <Icon name="shield-key-outline" size={36} color={PURPLE_MAIN} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.otpTitle}>Verify Your Email</Text>
            <Text style={styles.otpDesc}>
              A 6-digit code was sent to{' '}
              <Text style={styles.otpEmail}>{registeredEmail}</Text>.{' '}
              Enter it below to complete registration.
            </Text>

            <OTPInput
              value={otpDigits}
              onChange={setOtpDigits}
              disabled={otpLoading}
            />

            {/* Timer + Resend */}
            <View style={styles.otpTimerRow}>
              <Text style={styles.otpTimerText}>
                {timerRunning ? `Expires in ${mm}:${ss}` : 'Code expired'}
              </Text>
              <TouchableOpacity onPress={handleResendOTP} disabled={otpLoading} activeOpacity={0.7}>
                <Text style={[styles.resendText, timerRunning && styles.resendTextDimmed]}>
                  Resend Code
                </Text>
              </TouchableOpacity>
            </View>

            {(otpError) && (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle-outline" size={15} color="#B71C1C" />
                <Text style={styles.errorBannerText}>{otpError}</Text>
              </View>
            )}

            {otpSuccess && (
              <View style={[styles.errorBanner, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
                <Icon name="check-circle-outline" size={15} color="#2E7D32" />
                <Text style={[styles.errorBannerText, { color: '#2E7D32' }]}>Email verified! Redirecting…</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, (!otpComplete || otpLoading) && styles.submitDisabled]}
              onPress={handleVerifyOTP}
              disabled={!otpComplete || otpLoading}
              activeOpacity={0.85}
            >
              {otpLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitText}>Verify Email</Text>
              }
            </TouchableOpacity>

            <Text style={styles.otpNote}>
              You can verify later from your profile, but some features may be limited.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.linkAccent}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error is now shown as inline banner — no error Snackbar needed */}

      {/* Success snackbar */}
      <Snackbar
        visible={false}
        onDismiss={() => {}}
        duration={2500}
        style={styles.successSnackbar}
      >
        Registration successful!
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

  /* Inline error banner */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF9A9A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { flex: 1, color: '#B71C1C', fontSize: 13, lineHeight: 18 },

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

  /* OTP overlay */
  otpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F4F5FB',
    justifyContent: 'center',
    padding: 20,
    zIndex: 99,
  },
  otpCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    shadowColor: PURPLE_MAIN, shadowOpacity: 0.12,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  otpTitle: {
    textAlign: 'center', fontSize: 18, fontWeight: '800',
    color: PURPLE_DARK, marginBottom: 8,
  },
  otpDesc: { textAlign: 'center', fontSize: 13, color: '#777', lineHeight: 20, marginBottom: 24 },
  otpEmail: { fontWeight: '700', color: PURPLE_DARK },
  otpTimerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 16, marginBottom: 4,
  },
  otpTimerText: { fontSize: 12, color: '#999' },
  resendText: { fontSize: 13, fontWeight: '700', color: PURPLE_MAIN },
  resendTextDimmed: { color: '#BBBBBB', fontWeight: '400' },
  otpNote: { fontSize: 12, color: '#AAA', textAlign: 'center', marginTop: 16, lineHeight: 18 },

  /* Phone split field */
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE7F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginRight: 8,
    height: 56,
  },
  phonePrefixText: {
    color: PURPLE_MAIN,
    fontWeight: '700',
    fontSize: 15,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* Business category chips */
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D0C4F0',
    backgroundColor: '#F3F0FF',
  },
  categoryChipActive: {
    backgroundColor: PURPLE_DARK,
    borderColor: PURPLE_DARK,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: PURPLE_MAIN,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
});

export default RegisterScreen;
