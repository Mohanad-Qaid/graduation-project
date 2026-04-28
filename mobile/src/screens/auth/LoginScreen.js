import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../../store/slices/authSlice';
import { getUserProfile } from '../../services/offlineDb';

// Message the backend sends for PENDING accounts
const PENDING_PHRASE = 'under review';

/** Build two-letter initials from first + last name */
function getInitials(firstName, lastName) {
  const a = (firstName || '').trim()[0] || '';
  const b = (lastName || '').trim()[0] || '';
  return (a + b).toUpperCase();
}

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [cachedProfile, setCachedProfile] = useState(null);

  // Load cached profile from SQLite on mount — works fully offline
  useEffect(() => {
    getUserProfile().then((profile) => {
      if (profile) setCachedProfile(profile);
    });
  }, []);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleLogin = () => {
    if (!email || pin.length !== 6) return;
    dispatch(clearError());
    dispatch(login({ email: email.trim(), password: pin }));
  };

  // Split the error: show the amber banner for pending, Snackbar for everything else
  const isPending = error?.toLowerCase().includes(PENDING_PHRASE);
  const snackbarError = error && !isPending ? error : null;

  const initials = getInitials(cachedProfile?.first_name, cachedProfile?.last_name);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Letter avatar + greeting (shown when a previous session exists) ── */}
        {cachedProfile ? (
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.greetingName}>{cachedProfile.first_name} 👋</Text>
          </View>
        ) : (
          <View style={styles.header}>
            <Text variant="displaySmall" style={styles.title}>E-Wallet</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>Sign in to your account</Text>
          </View>
        )}

        {/* ── Pending account banner ───────────────────────────── */}
        {isPending && (
          <View style={styles.pendingBanner}>
            <Icon name="clock-outline" size={22} color="#7c4d00" style={styles.pendingIcon} />
            <View style={styles.pendingTextContainer}>
              <Text style={styles.pendingTitle}>Account Under Review</Text>
              <Text style={styles.pendingBody}>
                Your account is awaiting for approval. You'll be able to sign in once it's approved.
              </Text>
            </View>
          </View>
        )}

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

      {/* ── Generic error Snackbar (wrong credentials, suspended …) ── */}
      <Snackbar
        visible={!!snackbarError}
        onDismiss={() => dispatch(clearError())}
        duration={4000}
        action={{ label: 'OK', onPress: () => dispatch(clearError()) }}
      >
        {snackbarError}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  // ── No cached session — plain header ────────────────────────────────────────
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontWeight: 'bold', color: '#6200EE' },
  subtitle: { color: '#666', marginTop: 8 },

  // ── Cached session — avatar + greeting ──────────────────────────────────────
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 5,
    shadowColor: '#6200EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  greeting: { fontSize: 15, color: '#666' },
  greetingName: { fontSize: 24, fontWeight: '700', color: '#4A148C', marginTop: 2 },

  // ── Pending banner ───────────────────────────────────────────────────────────
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
  pendingIcon: { marginTop: 2, marginRight: 10 },
  pendingTextContainer: { flex: 1 },
  pendingTitle: { fontWeight: '700', color: '#7c4d00', fontSize: 14, marginBottom: 4 },
  pendingBody: { color: '#7c4d00', fontSize: 13, lineHeight: 18 },

  card: { backgroundColor: '#FFFFFF' },
  input: { marginBottom: 16 },
  button: { marginTop: 8, paddingVertical: 6 },
  linkButton: { marginTop: 16 },
});

export default LoginScreen;
