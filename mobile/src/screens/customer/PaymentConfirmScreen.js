import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Snackbar,
  Divider,
  TextInput,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { makePayment, clearPaymentResult, clearError } from '../../store/slices/transactionSlice';
import { fetchBalance } from '../../store/slices/walletSlice';

const PaymentConfirmScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { paymentResult, paymentSuccess, isLoading, error } = useSelector(
    (state) => state.transactions
  );
  const { balance, currency } = useSelector((state) => state.wallet);

  // These now come straight from the QR scanner (no server round-trip)
  const { merchantId, businessName } = route.params || {};

  const [amount, setAmount] = useState('');

  useEffect(() => {
    return () => {
      dispatch(clearPaymentResult());
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    if (paymentSuccess) {
      dispatch(fetchBalance());
    }
  }, [paymentSuccess, dispatch]);

  const parsedAmount = parseFloat(amount);
  const sufficientBalance = parsedAmount > 0 && balance >= parsedAmount;

  const handleConfirmPayment = () => {
    if (!merchantId || !parsedAmount || parsedAmount <= 0) return;
    dispatch(makePayment({ merchantId, amount: parsedAmount }));
  };

  const handleDone = () => {
    navigation.popToTop();
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (paymentSuccess && paymentResult) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Icon name="check-circle" size={80} color="#4CAF50" />
          </View>
          <Text variant="headlineSmall" style={styles.successTitle}>Payment Successful!</Text>
          <Text variant="displaySmall" style={styles.successAmount}>
            {Number(paymentResult.amount || 0).toFixed(2)} {currency}
          </Text>
          <Text variant="bodyMedium" style={styles.successMerchant}>
            Paid to {businessName}
          </Text>
          <Text variant="bodySmall" style={styles.reference}>
            Ref: {paymentResult.reference_code}
          </Text>

          <Button mode="contained" onPress={handleDone} style={styles.doneButton}>Done</Button>
        </View>
      </View>
    );
  }

  // ── Guard: no params ────────────────────────────────────────────────────────
  if (!merchantId) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#F44336" />
          <Text variant="titleMedium" style={styles.errorText}>No payment details found</Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </View>
    );
  }

  // ── Main payment form ───────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Button icon="arrow-left" onPress={() => navigation.goBack()}>Back</Button>
          <Text variant="titleLarge" style={styles.title}>Confirm Payment</Text>
          <View style={{ width: 80 }} />
        </View>

        {/* Merchant info — read-only */}
        <Card style={styles.merchantCard}>
          <Card.Content style={styles.merchantContent}>
            <View style={styles.merchantIcon}>
              <Icon name="store" size={40} color="#6200EE" />
            </View>
            <Text variant="titleMedium">{businessName}</Text>
          </Card.Content>
        </Card>

        {/* Amount entry */}
        <Card style={styles.detailsCard}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.amountLabel}>Enter Amount</Text>
            <TextInput
              label={`Amount (${currency})`}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.amountInput}
              right={<TextInput.Affix text={currency} />}
            />

            <Divider style={styles.divider} />

            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Your Balance</Text>
              <Text
                variant="bodyLarge"
                style={parsedAmount > 0 && !sufficientBalance ? styles.balanceLow : styles.balanceOk}
              >
                {Number(balance || 0).toFixed(2)} {currency}
              </Text>
            </View>

            {parsedAmount > 0 && !sufficientBalance && (
              <Text variant="bodySmall" style={styles.warningText}>
                Insufficient balance. Please top up first.
              </Text>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleConfirmPayment}
          loading={isLoading}
          disabled={isLoading || !parsedAmount || parsedAmount <= 0 || !sufficientBalance}
          style={styles.payButton}
        >
          {parsedAmount > 0
            ? `Pay ${Number(parsedAmount || 0).toFixed(2)} ${currency}`
            : 'Enter an Amount'}
        </Button>

        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton}>
          Cancel
        </Button>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => dispatch(clearError())}
        duration={5000}
        action={{ label: 'OK', onPress: () => dispatch(clearError()) }}
        style={{ backgroundColor: '#B71C1C' }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  title: { fontWeight: 'bold' },
  merchantCard: { marginHorizontal: 20, marginTop: 16, marginBottom: 16, backgroundColor: '#FFFFFF' },
  merchantContent: { alignItems: 'center', paddingVertical: 20 },
  merchantIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  detailsCard: { marginHorizontal: 20, backgroundColor: '#FFFFFF', marginBottom: 20 },
  amountLabel: { marginBottom: 8 },
  amountInput: { marginBottom: 8, backgroundColor: '#FFFFFF' },
  divider: { marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  detailLabel: { color: '#666' },
  balanceOk: { color: '#4CAF50' },
  balanceLow: { color: '#F44336' },
  warningText: { color: '#F44336', textAlign: 'center', marginTop: 8 },
  payButton: { marginHorizontal: 20, paddingVertical: 6, marginBottom: 12 },
  cancelButton: { marginHorizontal: 20, paddingVertical: 6, marginBottom: 30 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  successIcon: { marginBottom: 20 },
  successTitle: { color: '#4CAF50', marginBottom: 10 },
  successAmount: { fontWeight: 'bold', marginBottom: 8 },
  successMerchant: { color: '#666', marginBottom: 4 },
  reference: { color: '#999', marginBottom: 30 },
  doneButton: { width: '100%', paddingVertical: 6 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { marginVertical: 20, color: '#666' },
});

export default PaymentConfirmScreen;
