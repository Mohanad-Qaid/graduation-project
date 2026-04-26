import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchTransactions } from '../../store/slices/transactionSlice';

const PURPLE_DARK = '#1A006B';
const PURPLE_MAIN = '#6200EE';

const TIME_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last Week', value: 'week' },
  { label: 'Last Month', value: 'month' },
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'Payment', value: 'payment' },
  { label: 'Top-up', value: 'topup' },
];

const formatDate = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString())
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === yesterday.toDateString())
    return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ── Transaction Row ── */
const TxRow = ({ tx, currency }) => {
  const out = tx.isOutgoing;
  const isTopup = (tx.type || '').toLowerCase() === 'topup';
  const accent = out ? '#EF5350' : '#26A69A';
  const bg = out ? '#FFEBEE' : '#E0F2F1';
  const iconName = isTopup ? 'cash-plus' : out ? 'arrow-top-right' : 'arrow-bottom-left';

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: bg }]}>
        <Icon name={iconName} size={18} color={accent} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>{tx.counterparty}</Text>
        <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
        {tx.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{tx.category}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: accent }]}>
          {out ? '−' : '+'}{Number(tx.amount || 0).toFixed(2)} {currency}
        </Text>
        {tx.referenceCode ? (
          <Text style={styles.refCode}>{tx.referenceCode}</Text>
        ) : null}
      </View>
    </View>
  );
};

/* ── Filter Pill ── */
const FilterPill = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.pill, active && styles.pillActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    <Icon name="chevron-down" size={14} color={active ? PURPLE_MAIN : '#888'} />
  </TouchableOpacity>
);

/* ── Main Screen ── */
const TransactionHistoryScreen = () => {
  const dispatch = useDispatch();
  const { list: transactions, pagination, isLoading } = useSelector((s) => s.transactions);
  const { currency } = useSelector((s) => s.wallet);

  const [timeFilter, setTimeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeMenuVisible, setTimeMenuVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);

  const loadTransactions = useCallback((page = 1) => {
    dispatch(fetchTransactions({ page }));
  }, [dispatch]);

  useEffect(() => { loadTransactions(1); }, [loadTransactions]);

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages && !isLoading) {
      loadTransactions(pagination.page + 1);
    }
  };

  const getLabel = (opts, val) => opts.find((o) => o.value === val)?.label || 'Filter';

  const filtered = transactions.filter((tx) => {
    const now = new Date();
    const d = new Date(tx.createdAt);
    if (timeFilter === '24h' && now - d > 86400000) return false;
    if (timeFilter === 'week' && now - d > 604800000) return false;
    if (timeFilter === 'month' && now - d > 2592000000) return false;
    if (typeFilter !== 'all') {
      const t = (tx.type || tx.transaction_type || '').toLowerCase();
      if (t !== typeFilter.toLowerCase()) return false;
    }
    return true;
  });

  const hasActiveFilter = timeFilter !== 'all' || typeFilter !== 'all';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

      {/* ── Header Banner ── */}
      <View style={styles.header}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.headerSub}>{filtered.length} transactions</Text>
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterBar}>
        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
          <Menu
            visible={timeMenuVisible}
            onDismiss={() => setTimeMenuVisible(false)}
            anchor={
              <FilterPill
                label={getLabel(TIME_OPTIONS, timeFilter)}
                active={timeFilter !== 'all'}
                onPress={() => setTimeMenuVisible(true)}
              />
            }
          >
            {TIME_OPTIONS.map((o) => (
              <Menu.Item
                key={o.value}
                title={o.label}
                onPress={() => { setTimeFilter(o.value); setTimeMenuVisible(false); }}
                titleStyle={timeFilter === o.value ? styles.menuActive : undefined}
              />
            ))}
          </Menu>

          <Menu
            visible={typeMenuVisible}
            onDismiss={() => setTypeMenuVisible(false)}
            anchor={
              <FilterPill
                label={getLabel(TYPE_OPTIONS, typeFilter)}
                active={typeFilter !== 'all'}
                onPress={() => setTypeMenuVisible(true)}
              />
            }
          >
            {TYPE_OPTIONS.map((o) => (
              <Menu.Item
                key={o.value}
                title={o.label}
                onPress={() => { setTypeFilter(o.value); setTypeMenuVisible(false); }}
                titleStyle={typeFilter === o.value ? styles.menuActive : undefined}
              />
            ))}
          </Menu>
        </View>

        {hasActiveFilter && (
          <TouchableOpacity onPress={() => { setTimeFilter('all'); setTypeFilter('all'); }}>
            <Text style={styles.clearBtn}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <TxRow tx={item} currency={currency} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadTransactions(1)}
            colors={[PURPLE_MAIN]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="receipt-text-outline" size={48} color="#D0D0D0" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },

  /* header */
  header: {
    backgroundColor: PURPLE_DARK,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#4A0099', opacity: 0.4, top: -50, right: -30,
  },
  blob2: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: PURPLE_MAIN, opacity: 0.25, bottom: -20, left: 60,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },

  /* filters */
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
    elevation: 1,
  },
  pillActive: { borderColor: PURPLE_MAIN, backgroundColor: '#F3E5F5' },
  pillText: { fontSize: 13, color: '#666', fontWeight: '500' },
  pillTextActive: { color: PURPLE_MAIN, fontWeight: '600' },
  menuActive: { color: PURPLE_MAIN, fontWeight: '700' },
  clearBtn: { color: PURPLE_MAIN, fontWeight: '600', fontSize: 13 },

  /* list */
  list: { paddingHorizontal: 16, paddingBottom: 24 },

  /* tx row */
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    marginBottom: 10, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  txIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1, marginRight: 8 },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  txDate: { fontSize: 12, color: '#ABABAB', marginTop: 2 },
  categoryBadge: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: '#EDE7F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
  categoryText: { fontSize: 11, color: PURPLE_MAIN, fontWeight: '600' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  refCode: { fontSize: 10, color: '#CCCCCC', marginTop: 2 },

  /* empty */
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: '#ABABAB', fontSize: 15 },
});

export default TransactionHistoryScreen;
