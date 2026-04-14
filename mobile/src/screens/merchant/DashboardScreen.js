import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Surface, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchMerchantDashboard, clearError } from '../../store/slices/walletSlice';

const MerchantDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { balance, merchantStats, isLoading, error } = useSelector((state) => state.wallet);

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  useEffect(() => {
    if (error) {
      setSnackMessage(error);
      setSnackVisible(true);
    }
  }, [error]);

  const loadData = useCallback(() => {
    dispatch(fetchMerchantDashboard());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDismissSnack = () => {
    setSnackVisible(false);
    dispatch(clearError());
  };

  const formatCurrency = (amount) => `TRY ${(amount || 0).toFixed(2)}`;

  const displayName = user?.business_name
    || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
    || 'Merchant';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.greeting}>{displayName}</Text>
          <Text variant="bodySmall" style={styles.subGreeting}>Merchant Dashboard</Text>
        </View>

        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text variant="labelMedium" style={styles.balanceLabel}>Available Balance</Text>
            <Text variant="displaySmall" style={styles.balanceAmount}>
              {formatCurrency(balance)}
            </Text>
            <View style={styles.balanceRow}>
              <Text variant="bodySmall" style={styles.pendingLabel}>Pending Withdrawal:</Text>
              <Text variant="bodySmall" style={styles.pendingAmount}>
                {formatCurrency(merchantStats?.pendingWithdrawal)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.statsRow}>
          <Card style={[styles.statCard, styles.todayCard]}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.statLabel}>Today's Revenue</Text>
              <Text variant="titleLarge" style={styles.statValue}>
                {formatCurrency(merchantStats?.todayRevenue?.total)}
              </Text>
              <Text variant="bodySmall" style={styles.statCount}>
                {merchantStats?.todayRevenue?.count || 0} transactions
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, styles.weekCard]}>
            <Card.Content>
              <Text variant="labelSmall" style={styles.statLabel}>This Week</Text>
              <Text variant="titleLarge" style={styles.statValue}>
                {formatCurrency(merchantStats?.weekRevenue?.total)}
              </Text>
              <Text variant="bodySmall" style={styles.statCount}>
                {merchantStats?.weekRevenue?.count || 0} transactions
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.actionsContainer}>
          <Surface style={styles.actionButton} elevation={2}>
            <Button
              icon="qrcode"
              mode="text"
              onPress={() => navigation.navigate('GenerateQR')}
              style={styles.actionButtonInner}
              labelStyle={styles.actionLabel}
            >
              My QR Code
            </Button>
          </Surface>

          <Surface style={styles.actionButton} elevation={2}>
            <Button
              icon="cash"
              mode="text"
              onPress={() => navigation.navigate('RequestWithdrawal')}
              style={styles.actionButtonInner}
              labelStyle={styles.actionLabel}
            >
              Withdraw
            </Button>
          </Surface>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium">Recent Payments</Text>
            <Button mode="text" onPress={() => navigation.navigate('History')}>See All</Button>
          </View>

          {!merchantStats?.recentTransactions?.length ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No payments received yet</Text>
              </Card.Content>
            </Card>
          ) : (
            merchantStats.recentTransactions.map((tx) => (
              <Card key={tx.id} style={styles.transactionCard}>
                <Card.Content style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View style={styles.iconContainer}>
                      <Icon name="arrow-down" size={20} color="#4CAF50" />
                    </View>
                    <View>
                      <Text variant="bodyMedium" style={styles.transactionTitle}>
                        {tx.customerName}
                      </Text>
                      <Text variant="bodySmall" style={styles.transactionDate}>
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <Text variant="bodyLarge" style={styles.transactionAmount}>
                    +{formatCurrency(tx.amount)}
                  </Text>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        <Button
          mode="outlined"
          onPress={() => navigation.navigate('WithdrawalHistory')}
          style={styles.historyButton}
          icon="history"
        >
          Withdrawal History
        </Button>
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
  greeting: { color: '#333', fontWeight: 'bold' },
  subGreeting: { color: '#666', marginTop: 2 },
  balanceCard: { marginHorizontal: 20, backgroundColor: '#6200EE', borderRadius: 16 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { color: '#FFFFFF', fontWeight: 'bold', marginTop: 8 },
  balanceRow: { flexDirection: 'row', marginTop: 12 },
  pendingLabel: { color: 'rgba(255,255,255,0.7)' },
  pendingAmount: { color: '#FFFFFF', marginLeft: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 16 },
  statCard: { flex: 1, marginHorizontal: 4 },
  todayCard: { backgroundColor: '#E8F5E9' },
  weekCard: { backgroundColor: '#E3F2FD' },
  statLabel: { color: '#666' },
  statValue: { fontWeight: 'bold', marginTop: 4 },
  statCount: { color: '#999', marginTop: 2 },
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
  transactionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionTitle: { fontWeight: '500' },
  transactionDate: { color: '#999' },
  transactionAmount: { fontWeight: 'bold', color: '#4CAF50' },
  historyButton: { marginHorizontal: 20, marginBottom: 30 },
});

export default MerchantDashboard;
