import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import {
  requestWithdrawal,
  clearWithdrawalSuccess,
  clearError,
} from '../../store/slices/transactionSlice';

const RequestWithdrawalScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, error, withdrawalSuccess } = useSelector(
    (state) => state.transactions
  );
  const { balance, currency } = useSelector((state) => state.wallet);

  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  useEffect(() => {
    if (withdrawalSuccess) {
      Alert.alert(
        'Request Submitted',
        'Your withdrawal request has been submitted and is pending admin approval.',
        [
          {
            text: 'OK',
            onPress: () => {
              dispatch(clearWithdrawalSuccess());
              navigation.goBack();
            },
          },
        ]
      );
    }
  }, [withdrawalSuccess, dispatch, navigation]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearWithdrawalSuccess());
    };
  }, [dispatch]);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (numAmount > balance) {
      Alert.alert('Error', 'Amount exceeds available balance');
      return;
    }

    if (!bankName.trim()) {
      Alert.alert('Error', 'Please enter bank name');
      return;
    }

    if (!bankAccount.trim()) {
      Alert.alert('Error', 'Please enter bank account number');
      return;
    }

    dispatch(
      requestWithdrawal({
        amount: numAmount,
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
      })
    );
  };

  const setMaxAmount = () => {
    setAmount(balance.toString());
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
          Request Withdrawal
        </Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.content}>
        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text variant="labelMedium">Available Balance</Text>
            <Text variant="headlineMedium" style={styles.balanceAmount}>
              {currency || 'USD'} {Number(balance || 0).toFixed(2)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.formTitle}>
              Withdrawal Details
            </Text>

            <View style={styles.amountRow}>
              <TextInput
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                mode="outlined"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="$" />}
                style={[styles.input, styles.amountInput]}
              />
              <Button mode="outlined" onPress={setMaxAmount} style={styles.maxButton}>
                Max
              </Button>
            </View>

            <TextInput
              label="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              mode="outlined"
              placeholder="e.g., Chase, Bank of America"
              style={styles.input}
            />

            <TextInput
              label="Bank Account Number"
              value={bankAccount}
              onChangeText={setBankAccount}
              mode="outlined"
              keyboardType="number-pad"
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={
                isLoading ||
                !amount ||
                parseFloat(amount) <= 0 ||
                !bankName ||
                !bankAccount
              }
              style={styles.submitButton}
            >
              Submit Request
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleSmall">Important:</Text>
            <Text variant="bodySmall" style={styles.infoText}>
              - Withdrawal requests require admin approval
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              - Processing may take 1-3 business days
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              - You can only have one pending request at a time
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => dispatch(clearError())}
        duration={3000}
      >
        {error}
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
  content: {
    flex: 1,
    padding: 20,
  },
  balanceCard: {
    marginBottom: 16,
    backgroundColor: '#6200EE',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  formTitle: {
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  amountInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  maxButton: {
    marginTop: 6,
  },
  submitButton: {
    paddingVertical: 6,
  },
  infoCard: {
    backgroundColor: '#FFF3E0',
  },
  infoText: {
    marginTop: 4,
    color: '#666',
  },
});

export default RequestWithdrawalScreen;
