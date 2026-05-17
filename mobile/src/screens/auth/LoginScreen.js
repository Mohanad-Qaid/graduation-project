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
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import {
  login,
  pinLogin,
  wipeDevice,
  clearError,
} from '../../store/slices/authSlice';

// ─── Design tokens (mirrors DashboardScreen) ─────────────────────────────────
const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';

const PENDING_PHRASE = 'under review';

function getInitials(firstName, lastName) {
  const a = (firstName || '').trim()[0] || '';
  const b = (lastName || '').trim()[0] || '';
  return (a + b).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 3;

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    isSubmitting: isLoading,
    error,
    failCount,
    cachedEmail,
    cachedFirstName,
    cachedLastName,
  } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  // Track the previous failCount so we can detect a NEW failure
  const prevFailCount = React.useRef(failCount);

  // Wipe device after MAX_ATTEMPTS wrong PIN attempts
  useEffect(() => {
    if (failCount >= MAX_ATTEMPTS) dispatch(wipeDevice());
  }, [failCount, dispatch]);

  // Clear PIN whenever a new failure is recorded (failCount went up)
  useEffect(() => {
    if (failCount > prevFailCount.current) {
      setPin('');
    }
    prevFailCount.current = failCount;
  }, [failCount]);

  // Reset fields when switching between views (e.g. after wipeDevice cachedEmail → null)
  useEffect(() => {
    setPin('');
    setEmail('');
    dispatch(clearError());
  }, [cachedEmail, dispatch]);

  // Clear error on unmount
  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const handleSubmit = () => {
    if (pin.length !== 6) return;
    dispatch(clearError());
    if (cachedEmail) {
      dispatch(pinLogin({ pin }));
    } else {
      dispatch(login({ email: email.trim(), password: pin }));
    }
  };

  const isExperienced = !!cachedEmail;
  const initials = getInitials(cachedFirstName, cachedLastName);
  const fullName = [cachedFirstName, cachedLastName].filter(Boolean).join(' ');
  const isPending  = typeof error === 'string' && error.toLowerCase().includes(PENDING_PHRASE);
  const isRejected = typeof error === 'string' && error.toLowerCase().includes('rejected');
  // Snackbar only for errors that don't have a dedicated inline banner
  const snackbarError = error && !isPending && !isRejected ? error : null;
  // Remaining attempts only shown in PIN mode after at least one failure
  const attemptsLeft = MAX_ATTEMPTS - failCount;
  const showAttemptsWarning = isExperienced && failCount > 0 && failCount < MAX_ATTEMPTS;

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
          {/* Decorative blobs — same as Dashboard */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          {isExperienced ? (
            /* Returning user — avatar + name */
            <View style={styles.heroContent}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials || '?'}</Text>
              </View>
              <Text style={styles.heroSmall}>Welcome back,</Text>
              <Text style={styles.heroName}>{fullName || 'User'}</Text>
            </View>
          ) : (
            /* New user — app brand */
            <View style={styles.heroContent}>
              <View style={styles.brandIcon}>
                <Icon name="wallet-outline" size={36} color="#fff" />
              </View>
              <Text style={styles.heroSmall}>Welcome to</Text>
              <Text style={styles.heroName}>E-Wallet</Text>
              <Text style={styles.heroSub}>Sign in to your account</Text>
            </View>
          )}
        </View>

        {/* ── Floating form panel ─────────────────────────────────────────── */}
        <View style={styles.panel}>

          {/* Pending banner — amber, for accounts awaiting approval */}
          {isPending && (
            <View style={styles.pendingBanner}>
              <Icon name="clock-outline" size={18} color="#7c4d00" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Account Under Review</Text>
                <Text style={styles.pendingBody}>
                  Your account is awaiting approval. You'll be notified once it's approved.
                </Text>
              </View>
            </View>
          )}

          {/* Rejected banner — rose-red, for rejected accounts */}
          {isRejected && (
            <View style={styles.rejectedBanner}>
              <Icon name="account-cancel-outline" size={18} color="#7f1d1d" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectedTitle}>Account Not Approved</Text>
                <Text style={styles.rejectedBody}>
                  Your registration was not approved. Please contact support for assistance.
                </Text>
              </View>
            </View>
          )}

          {/* Inline PIN error — red, shows attempt countdown */}
          {showAttemptsWarning && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle-outline" size={18} color="#B71C1C" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>
                Incorrect PIN.{' '}
                <Text style={{ fontWeight: '700' }}>
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining.
                </Text>
              </Text>
            </View>
          )}

          {/* Email — hidden for returning users */}
          {!isExperienced && (
            <TextInput
              label="Email"
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
          )}

          {/* PIN — always shown */}
          <TextInput
            label="6-Digit PIN"
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

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (isLoading || pin.length !== 6 || (!isExperienced && !email)) && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || pin.length !== 6 || (!isExperienced && !email)}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <Text style={styles.submitText}>Verifying…</Text>
            ) : (
              <Text style={styles.submitText}>{isExperienced ? 'Log In' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          {/* Register link — only shown for new users */}
          {!isExperienced && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Register</Text></Text>
            </TouchableOpacity>
          )}

          {/* Forgot PIN — always shown */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotLinkText}>Forgot PIN?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!snackbarError}
        onDismiss={() => dispatch(clearError())}
        duration={5000}
        action={{ label: 'OK', onPress: () => dispatch(clearError()) }}
        style={{ backgroundColor: '#B71C1C' }}
      >
        {snackbarError}
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

  /* Avatar (returning user) */
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },

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

  /* Inputs */
  input: { marginBottom: 14, backgroundColor: '#fff' },

  /* Submit button */
  submitBtn: {
    backgroundColor: PURPLE_DARK,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    elevation: 4,
    shadowColor: PURPLE_DARK,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitDisabled: { backgroundColor: '#B0BEC5', elevation: 0, shadowOpacity: 0 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },

  /* Links */
  linkBtn: { alignItems: 'center', marginTop: 18 },
  linkText: { color: '#888', fontSize: 14 },
  linkAccent: { color: PURPLE_MAIN, fontWeight: '700' },

  /* Pending banner — amber */
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB300',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  pendingTitle: { fontWeight: '700', color: '#7c4d00', fontSize: 13, marginBottom: 3 },
  pendingBody: { color: '#7c4d00', fontSize: 12, lineHeight: 17 },

  /* Rejected banner — rose-red */
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  rejectedTitle: { fontWeight: '700', color: '#7f1d1d', fontSize: 13, marginBottom: 3 },
  rejectedBody: { color: '#7f1d1d', fontSize: 12, lineHeight: 17 },

  /* Inline PIN error banner */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF9A9A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { flex: 1, color: '#B71C1C', fontSize: 13 },

  /* Forgot PIN link */
  forgotLink: { alignItems: 'center', marginTop: 14 },
  forgotLinkText: { color: PURPLE_MAIN, fontSize: 13, fontWeight: '600' },
});

export default LoginScreen;
