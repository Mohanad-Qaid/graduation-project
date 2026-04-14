import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { topUp, clearTopUpSuccess, clearError, fetchBalance } from '../../store/slices/walletSlice';

const QUICK_AMOUNTS = [50, 100, 200, 500];

const AddBalanceScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { balance, currency, isLoading, error, topUpSuccess } = useSelector(
    (state) => state.wallet
  );

  const [amount, setAmount] = useState('');

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
    };
  }, [dispatch]);

  const handleTopUp = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return;
    }
    dispatch(topUp(numAmount));
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
            {currency} {balance.toFixed(2)}
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
            >
              ${value}
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
          left={<TextInput.Affix text="$" />}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleTopUp}
          loading={isLoading}
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
          style={styles.submitButton}
        >
          Add {amount ? `$${amount}` : 'Money'}
        </Button>

        <Text variant="bodySmall" style={styles.note}>
          This is a simulated top-up for demonstration purposes.
        </Text>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => dispatch(clearError())}
        duration={3000}
      >
        {error}
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
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    marginHorizontal: 4,
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
