import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Surface, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchBalance, clearError as clearWalletError } from '../../store/slices/walletSlice';
import { fetchTransactions, clearError as clearTxError } from '../../store/slices/transactionSlice';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { balance, currency, isLoading: walletLoading, error: walletError } = useSelector((state) => state.wallet);
  const { list: transactions, isLoading: txLoading, error: txError } = useSelector((state) => state.transactions);

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  useEffect(() => {
    const err = walletError || txError;
    if (err) {
      setSnackMessage(err);
      setSnackVisible(true);
    }
  }, [walletError, txError]);

  const loadData = useCallback(() => {
    dispatch(fetchBalance());
    dispatch(fetchTransactions({ page: 1 }));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDismissSnack = () => {
    setSnackVisible(false);
    dispatch(clearWalletError());
    dispatch(clearTxError());
  };

  const formatCurrency = (amount) => `${Number(amount || 0).toFixed(2)}  ${currency}`;

  const firstName = user?.first_name || 'there';
  const recentTransactions = transactions.slice(0, 4);
  const isRefreshing = walletLoading || txLoading;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadData} />
        }
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.greeting}>
            Hello, {firstName}!
          </Text>
        </View>

        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text variant="labelMedium" style={styles.balanceLabel}>Available Balance</Text>
            <Text variant="displaySmall" style={styles.balanceAmount}>
              {formatCurrency(balance)}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.actionsContainer}>
          <Surface style={styles.actionButton} elevation={2}>
            <Button
              icon="plus"
              mode="text"
              onPress={() => navigation.navigate('AddBalance')}
              style={styles.actionButtonInner}
              labelStyle={styles.actionLabel}
            >
              Add Money
            </Button>
          </Surface>

          <Surface style={styles.actionButton} elevation={2}>
            <Button
              icon="qrcode-scan"
              mode="text"
              onPress={() => navigation.navigate('QRScanner')}
              style={styles.actionButtonInner}
              labelStyle={styles.actionLabel}
            >
              Pay
            </Button>
          </Surface>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium">Recent Transactions</Text>
            <Button mode="text" onPress={() => navigation.navigate('History')}>
              See All
            </Button>
          </View>

          {recentTransactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No transactions yet</Text>
              </Card.Content>
            </Card>
          ) : (
            recentTransactions.map((tx) => (
              <Card key={tx.id} style={styles.transactionCard}>
                <Card.Content style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        tx.isOutgoing ? styles.outgoingIcon : styles.incomingIcon,
                      ]}
                    >
                      <Icon
                        name={tx.isOutgoing ? 'arrow-up' : 'arrow-down'}
                        size={20}
                        color={tx.isOutgoing ? '#F44336' : '#4CAF50'}
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text variant="bodyMedium" style={styles.transactionTitle} numberOfLines={1} ellipsizeMode="tail">
                        {tx.counterparty}
                      </Text>
                      <Text variant="bodySmall" style={styles.transactionDate}>
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={[
                      styles.transactionAmount,
                      tx.isOutgoing ? styles.outgoingAmount : styles.incomingAmount,
                    ]}
                  >
                    {tx.isOutgoing ? '-' : '+'}{formatCurrency(tx.amount)}
                  </Text>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={snackVisible}
        onDismiss={handleDismissSnack}
        duration={4000}
        action={{ label: 'Dismiss', onPress: handleDismissSnack }}
      >
        {snackMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 20, paddingTop: 50 },
  greeting: { color: '#333' },
  balanceCard: { marginHorizontal: 20, backgroundColor: '#6200EE', borderRadius: 16 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { color: '#FFFFFF', fontWeight: 'bold', marginTop: 8 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginTop: 20 },
  actionButton: { flex: 1, marginHorizontal: 8, borderRadius: 12, backgroundColor: '#FFFFFF' },
  actionButtonInner: { paddingVertical: 8 },
  actionLabel: { fontSize: 12 },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyCard: { backgroundColor: '#FFFFFF' },
  emptyText: { textAlign: 'center', color: '#999' },
  transactionCard: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  transactionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  transactionDetails: { flex: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  outgoingIcon: { backgroundColor: '#FFEBEE' },
  incomingIcon: { backgroundColor: '#E8F5E9' },
  transactionTitle: { fontWeight: '500' },
  transactionDate: { color: '#999' },
  transactionAmount: { fontWeight: 'bold' },
  outgoingAmount: { color: '#F44336' },
  incomingAmount: { color: '#4CAF50' },
});

export default DashboardScreen;
