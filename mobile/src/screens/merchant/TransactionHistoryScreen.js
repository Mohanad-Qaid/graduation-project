import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Searchbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchTransactions } from '../../store/slices/transactionSlice';

const TransactionHistoryScreen = () => {
  const dispatch = useDispatch();
  const { list: transactions, pagination, isLoading } = useSelector(
    (state) => state.transactions
  );

  const loadTransactions = useCallback(
    (page = 1) => {
      dispatch(fetchTransactions({ page }));
    },
    [dispatch]
  );

  useEffect(() => {
    loadTransactions(1);
  }, [loadTransactions]);

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages && !isLoading) {
      loadTransactions(pagination.page + 1);
    }
  };

  const formatCurrency = (amount) => {
    return `USD ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item: tx }) => (
    <Card style={styles.transactionCard}>
      <Card.Content style={styles.transactionContent}>
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.iconContainer,
              tx.type === 'withdrawal'
                ? styles.withdrawalIcon
                : tx.isOutgoing
                ? styles.outgoingIcon
                : styles.incomingIcon,
            ]}
          >
            <Icon
              name={
                tx.type === 'withdrawal'
                  ? 'bank-transfer-out'
                  : tx.isOutgoing
                  ? 'arrow-up'
                  : 'arrow-down'
              }
              size={20}
              color={
                tx.type === 'withdrawal'
                  ? '#FF9800'
                  : tx.isOutgoing
                  ? '#F44336'
                  : '#4CAF50'
              }
            />
          </View>
          <View style={styles.transactionDetails}>
            <Text variant="bodyMedium" style={styles.transactionTitle}>
              {tx.type === 'withdrawal' ? 'Withdrawal' : tx.counterparty}
            </Text>
            <Text variant="bodySmall" style={styles.transactionDate}>
              {formatDate(tx.createdAt)}
            </Text>
            <Text variant="bodySmall" style={styles.referenceCode}>
              {tx.referenceCode}
            </Text>
          </View>
        </View>
        <Text
          variant="bodyLarge"
          style={[
            styles.transactionAmount,
            tx.type === 'withdrawal'
              ? styles.withdrawalAmount
              : tx.isOutgoing
              ? styles.outgoingAmount
              : styles.incomingAmount,
          ]}
        >
          {tx.isOutgoing || tx.type === 'withdrawal' ? '-' : '+'}
          {formatCurrency(tx.amount)}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Transaction History
        </Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => loadTransactions(1)} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  transactionCard: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  outgoingIcon: {
    backgroundColor: '#FFEBEE',
  },
  incomingIcon: {
    backgroundColor: '#E8F5E9',
  },
  withdrawalIcon: {
    backgroundColor: '#FFF3E0',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontWeight: '500',
  },
  transactionDate: {
    color: '#999',
    marginTop: 2,
  },
  referenceCode: {
    color: '#BBB',
    fontSize: 10,
    marginTop: 2,
  },
  transactionAmount: {
    fontWeight: 'bold',
  },
  outgoingAmount: {
    color: '#F44336',
  },
  incomingAmount: {
    color: '#4CAF50',
  },
  withdrawalAmount: {
    color: '#FF9800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#999',
    marginTop: 12,
  },
});

export default TransactionHistoryScreen;
