import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { TextInput, Text, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { topUp, clearTopUpSuccess, clearError, fetchBalance } from '../../store/slices/walletSlice';
import { useStripe } from '@stripe/stripe-react-native';
import api from '../../services/api';

const QUICK_AMOUNTS = [100, 200, 500, 1000];
const PURPLE_DARK = '#1A006B';
const PURPLE_MAIN = '#6200EE';

const AddBalanceScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error, topUpSuccess } = useSelector((state) => state.wallet);

  const [amount, setAmount] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    if (topUpSuccess) {
      dispatch(fetchBalance());
      setTimeout(() => {
        dispatch(clearTopUpSuccess());
        navigation.goBack();
      }, 1500);
    }
  }, [topUpSuccess, dispatch, navigation]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearTopUpSuccess());
      setLocalError(null);
    };
  }, [dispatch]);

  const handleTopUp = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setLocalError(null);
    setIsPaymentLoading(true);

    try {
      const response = await api.post('/customer/wallet/topup/intent', { amount: numAmount });
      const { clientSecret, paymentIntentId } = response.data.data;

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'E-Wallet',
        allowsDelayedPaymentMethods: true,
      });

      if (initError) {
        setLocalError(initError.message || 'Failed to initialize payment sheet.');
        setIsPaymentLoading(false);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        setIsPaymentLoading(false);
        if (presentError.code === 'Canceled') return;
        setLocalError(presentError.message || 'Payment failed.');
        return;
      }

      dispatch(topUp({ amount: numAmount, paymentIntentId }));
    } catch (err) {
      setLocalError(err.response?.data?.message || err.message || 'An error occurred during payment.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const loading = isLoading || isPaymentLoading;
  const disabled = loading || !amount || parseFloat(amount) <= 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Balance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Quick Amounts */}
        <Text style={styles.sectionLabel}>Quick Select</Text>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((val) => {
            const active = amount === val.toString();
            return (
              <TouchableOpacity
                key={val}
                style={[styles.quickChip, active && styles.quickChipActive]}
                onPress={() => setAmount(val.toString())}
                activeOpacity={0.75}
              >
                <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                  {val} TRY
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Manual Input */}
        <Text style={styles.sectionLabel}>Or Enter Amount</Text>
        <TextInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="TRY" />}
          style={styles.input}
          outlineColor="#E0E0E0"
          activeOutlineColor={PURPLE_MAIN}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
          onPress={handleTopUp}
          disabled={disabled}
          activeOpacity={0.85}
        >
          {loading ? (
            <Icon name="loading" size={20} color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {amount ? `Add ${amount} TRY` : 'Add Money'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>Payments are processed securely via Stripe</Text>
      </ScrollView>

      <Snackbar
        visible={!!error || !!localError}
        onDismiss={() => { dispatch(clearError()); setLocalError(null); }}
        duration={3000}
      >
        {error || localError}
      </Snackbar>

      <Snackbar
        visible={topUpSuccess}
        onDismiss={() => dispatch(clearTopUpSuccess())}
        duration={2000}
        style={styles.successSnackbar}
      >
        ✓ Top-up successful!
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },

  /* header */
  header: {
    backgroundColor: PURPLE_DARK,
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#4A0099', opacity: 0.45, top: -50, right: -40,
  },
  blob2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: PURPLE_MAIN, opacity: 0.25, bottom: -30, left: 40,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  /* body */
  body: { padding: 24 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, marginTop: 8,
  },

  /* quick amounts */
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  quickChip: {
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#DDD',
    backgroundColor: '#fff',
  },
  quickChipActive: { backgroundColor: PURPLE_MAIN, borderColor: PURPLE_MAIN },
  quickChipText: { fontSize: 15, fontWeight: '600', color: '#555' },
  quickChipTextActive: { color: '#fff' },

  /* input */
  input: { backgroundColor: '#fff', marginBottom: 28 },

  /* submit */
  submitBtn: {
    backgroundColor: PURPLE_MAIN, borderRadius: 18,
    paddingVertical: 16, alignItems: 'center',
    elevation: 4, shadowColor: PURPLE_MAIN,
    shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  submitBtnDisabled: { backgroundColor: '#C5B4E3', elevation: 0, shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  note: { textAlign: 'center', color: '#ABABAB', fontSize: 12, marginTop: 16 },
  successSnackbar: { backgroundColor: '#26A69A' },
});

export default AddBalanceScreen;
