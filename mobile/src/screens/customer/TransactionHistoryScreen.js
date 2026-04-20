import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, Menu, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchTransactions } from '../../store/slices/transactionSlice';

const TIME_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last Week', value: 'week' },
  { label: 'Last Month', value: 'month' },
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'PAYMENT', value: 'payment' },
  { label: 'TOPUP', value: 'topup' },
];

const TransactionHistoryScreen = () => {
  const dispatch = useDispatch();
  const { list: transactions, pagination, isLoading } = useSelector(
    (state) => state.transactions
  );
  const { currency } = useSelector((state) => state.wallet);

  const [timeFilter, setTimeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeMenuVisible, setTimeMenuVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);

  const loadTransactions = useCallback(
    (page = 1) => {
      // Backend fetches all; we filter combined locally
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

  const filteredTransactions = transactions.filter((tx) => {
    // 1. Time Filter
    const today = new Date();
    const txDate = new Date(tx.createdAt);

    if (timeFilter === '24h') {
      const diffMs = today - txDate;
      if (diffMs > 24 * 60 * 60 * 1000) return false;
    } else if (timeFilter === 'week') {
      const diffMs = today - txDate;
      if (diffMs > 7 * 24 * 60 * 60 * 1000) return false;
    } else if (timeFilter === 'month') {
      const diffMs = today - txDate;
      if (diffMs > 30 * 24 * 60 * 60 * 1000) return false;
    }

    // 2. Type Filter
    if (typeFilter !== 'all') {
      const txType = (tx.type || tx.transaction_type || '').toLowerCase();
      if (txType !== typeFilter.toLowerCase()) return false;
    }

    return true;
  });

  const getLabel = (options, val) => options.find((o) => o.value === val)?.label || 'Filter';

  const formatCurrency = (amount) => {
    return `${Number(amount || 0).toFixed(2)}  ${currency}`;
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
              <Chip style={styles.categoryChip} textStyle={{ includeFontPadding: false }}>
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

      <View style={styles.filterWrapper}>
        <View style={styles.filterHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="filter-variant" size={18} color="#666" />
            <Text style={styles.filterSectionTitle}>Filter by:</Text>
          </View>
          {(timeFilter !== 'all' || typeFilter !== 'all') && (
            <TouchableOpacity onPress={() => { setTimeFilter('all'); setTypeFilter('all'); }}>
              <Text style={styles.clearFilterText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersContainer}>
          <Menu
            visible={timeMenuVisible}
            onDismiss={() => setTimeMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[styles.filterButton, timeFilter !== 'all' && styles.filterButtonActive]}
                onPress={() => setTimeMenuVisible(true)}
              >
                <Text style={[styles.filterLabel, timeFilter !== 'all' && styles.filterLabelActive]}>
                  {getLabel(TIME_OPTIONS, timeFilter)}
                </Text>
                <Icon name="chevron-down" size={16} color={timeFilter !== 'all' ? '#6200EE' : '#666'} />
              </TouchableOpacity>
            }
          >
            {TIME_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                onPress={() => { setTimeFilter(opt.value); setTimeMenuVisible(false); }}
                title={opt.label}
                titleStyle={timeFilter === opt.value ? styles.menuItemActive : undefined}
              />
            ))}
          </Menu>

          <Menu
            visible={typeMenuVisible}
            onDismiss={() => setTypeMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[styles.filterButton, typeFilter !== 'all' && styles.filterButtonActive]}
                onPress={() => setTypeMenuVisible(true)}
              >
                <Text style={[styles.filterLabel, typeFilter !== 'all' && styles.filterLabelActive]}>
                  {getLabel(TYPE_OPTIONS, typeFilter)}
                </Text>
                <Icon name="chevron-down" size={16} color={typeFilter !== 'all' ? '#6200EE' : '#666'} />
              </TouchableOpacity>
            }
          >
            {TYPE_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                onPress={() => { setTypeFilter(opt.value); setTypeMenuVisible(false); }}
                title={opt.label}
                titleStyle={typeFilter === opt.value ? styles.menuItemActive : undefined}
              />
            ))}
          </Menu>
        </View>
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
  filterWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterSectionTitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: 'bold',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearFilterText: {
    color: '#6200EE',
    fontSize: 13,
    fontWeight: '600',
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#F3E5F5',
    borderColor: '#6200EE',
  },
  filterLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 6,
    fontWeight: '500',
  },
  filterLabelActive: {
    color: '#6200EE',
    fontWeight: '600',
  },
  menuItemActive: {
    color: '#6200EE',
    fontWeight: 'bold',
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
