import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip, Searchbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchTransactions } from '../../store/slices/transactionSlice';

const FILTERS = [
  { label: 'All', value: null },
  { label: 'Payments', value: 'payment' },
  { label: 'Top-ups', value: 'topup' },
];

const TransactionHistoryScreen = () => {
  const dispatch = useDispatch();
  const { list: transactions, pagination, isLoading } = useSelector(
    (state) => state.transactions
  );
  const { currency } = useSelector((state) => state.wallet);

  const [selectedFilter, setSelectedFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTransactions = useCallback(
    (page = 1) => {
      dispatch(fetchTransactions({ page, type: selectedFilter }));
    },
    [dispatch, selectedFilter]
  );

  useEffect(() => {
    loadTransactions(1);
  }, [loadTransactions]);

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages && !isLoading) {
      loadTransactions(pagination.page + 1);
    }
  };

  const handleFilterChange = (value) => {
    setSelectedFilter(value);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tx.counterparty?.toLowerCase().includes(query) ||
      tx.referenceCode?.toLowerCase().includes(query) ||
      tx.description?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (amount) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
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
              tx.isOutgoing ? styles.outgoingIcon : styles.incomingIcon,
            ]}
          >
            <Icon
              name={
                tx.type === 'topup'
                  ? 'cash-plus'
                  : tx.isOutgoing
                  ? 'arrow-up'
                  : 'arrow-down'
              }
              size={20}
              color={tx.isOutgoing ? '#F44336' : '#4CAF50'}
            />
          </View>
          <View style={styles.transactionDetails}>
            <Text variant="bodyMedium" style={styles.transactionTitle}>
              {tx.counterparty}
            </Text>
            <Text variant="bodySmall" style={styles.transactionDate}>
              {formatDate(tx.createdAt)}
            </Text>
            {tx.category && (
              <Chip compact style={styles.categoryChip}>
                {tx.category}
              </Chip>
            )}
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text
            variant="bodyLarge"
            style={[
              styles.transactionAmount,
              tx.isOutgoing ? styles.outgoingAmount : styles.incomingAmount,
            ]}
          >
            {tx.isOutgoing ? '-' : '+'}
            {formatCurrency(tx.amount)}
          </Text>
          <Text variant="bodySmall" style={styles.referenceCode}>
            {tx.referenceCode}
          </Text>
        </View>
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

      <Searchbar
        placeholder="Search transactions..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <View style={styles.filters}>
        {FILTERS.map((filter) => (
          <Chip
            key={filter.label}
            selected={selectedFilter === filter.value}
            onPress={() => handleFilterChange(filter.value)}
            style={styles.filterChip}
          >
            {filter.label}
          </Chip>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
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
  searchbar: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  transactionCard: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  categoryChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 24,
  },
  transactionRight: {
    alignItems: 'flex-end',
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
  referenceCode: {
    color: '#999',
    fontSize: 10,
    marginTop: 2,
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
