import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { topUp, clearTopUpSuccess, clearError, fetchBalance } from '../../store/slices/walletSlice';
import { useStripe } from '@stripe/stripe-react-native';
import api from '../../services/api';

const QUICK_AMOUNTS = [100, 200, 500, 1000];

const AddBalanceScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { balance, currency, isLoading, error, topUpSuccess } = useSelector(
    (state) => state.wallet
  );

  const [amount, setAmount] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    if (topUpSuccess) {
      dispatch(fetchBalance()); // refresh balance from backend
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
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }

    setLocalError(null);
    setIsPaymentLoading(true);

    try {
      // 1. Fetch Intent
      const response = await api.post('/customer/wallet/topup/intent', { amount: numAmount });
      const { clientSecret, paymentIntentId } = response.data.data;

      // 2. Init Sheet
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

      // 3. Present Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        setIsPaymentLoading(false);
        if (presentError.code === 'Canceled') {
          return; // Ignore cancellation
        }
        setLocalError(presentError.message || 'Payment failed.');
        return;
      }

      // 4. Payment succeeded with Stripe, process in backend
      dispatch(topUp({ amount: numAmount, paymentIntentId }));

    } catch (err) {
      setLocalError(err.response?.data?.message || err.message || 'An error occurred during payment.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const selectQuickAmount = (value) => {
    setAmount(value.toString());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()}>
          Back
        </Button>
        <Text variant="titleLarge" style={styles.title}>
          Add Balance
        </Text>
        <View style={{ width: 80 }} />
      </View>

      <Card style={styles.balanceCard}>
        <Card.Content>
          <Text variant="labelMedium">Current Balance</Text>
          <Text variant="headlineMedium" style={styles.balanceAmount}>
            {Number(balance || 0).toFixed(2)} {currency}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quick Amount
        </Text>
        <View style={styles.quickAmounts}>
          {QUICK_AMOUNTS.map((value) => (
            <Button
              key={value}
              mode={amount === value.toString() ? 'contained' : 'outlined'}
              onPress={() => selectQuickAmount(value)}
              style={styles.quickButton}
              contentStyle={{ height: 40, paddingHorizontal: 0 }}
              labelStyle={{ fontSize: 16, marginHorizontal: 0 }}
            >
              {value}
            </Button>
          ))}
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Or Enter Amount
        </Text>
        <TextInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="decimal-pad"
          right={<TextInput.Affix text="TRY" />}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleTopUp}
          loading={isLoading || isPaymentLoading}
          disabled={isLoading || isPaymentLoading || !amount || parseFloat(amount) <= 0}
          style={styles.submitButton}
        >
          Add {amount ? `${amount} TRY` : 'Money'}
        </Button>
      </View>

      <Snackbar
        visible={!!error || !!localError}
        onDismiss={() => {
          dispatch(clearError());
          setLocalError(null);
        }}
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
        Top-up successful!
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  title: {
    fontWeight: 'bold',
  },
  balanceCard: {
    margin: 20,
    backgroundColor: '#6200EE',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
  },
  quickButton: {
    width: '22%',
    marginHorizontal: '1.5%',
    marginVertical: 5,
  },
  input: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    paddingVertical: 6,
  },
  note: {
    textAlign: 'center',
    color: '#999',
    marginTop: 16,
  },
  successSnackbar: {
    backgroundColor: '#4CAF50',
  },
});

export default AddBalanceScreen;
