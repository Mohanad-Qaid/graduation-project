import React, { useEffect, useCallback, useState } from 'react';
import {
    View, StyleSheet, FlatList, RefreshControl,
    TouchableOpacity, StatusBar,
} from 'react-native';
import { Text, Menu } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchTransactions } from '../../store/slices/transactionSlice';

const PURPLE_DARK = '#1A006B';
const PURPLE_MAIN = '#4A148C';
const PURPLE_LIGHT = '#6200EE';

const TIME_OPTIONS = [
    { label: 'All Time',      value: 'all' },
    { label: 'Last 24 Hours', value: '24h' },
    { label: 'Last Week',     value: 'week' },
    { label: 'Last Month',    value: 'month' },
];

const TYPE_OPTIONS = [
    { label: 'All Types',  value: 'all' },
    { label: 'Payment',    value: 'PAYMENT' },
    { label: 'Withdrawal', value: 'WITHDRAWAL' },
];

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getTxType(tx) {
    return (tx.transaction_type || tx.type || '').toUpperCase();
}

function getTxIcon(tx) {
    const t = getTxType(tx);
    if (t === 'WITHDRAWAL') return { icon: 'bank-transfer-out', color: '#E65100', bg: '#FFF3E0' };
    if (tx.isOutgoing)      return { icon: 'arrow-up',          color: '#C62828', bg: '#FFEBEE' };
    return                         { icon: 'arrow-down',        color: '#2E7D32', bg: '#E8F5E9' };
}

function getTxTitle(tx) {
    if (getTxType(tx) === 'WITHDRAWAL') return 'Withdrawal';
    return tx.counterparty || 'Customer';
}

function getTxAmountStyle(tx) {
    const t = getTxType(tx);
    if (t === 'WITHDRAWAL') return { color: '#E65100' };
    if (tx.isOutgoing)      return { color: '#C62828' };
    return                         { color: '#2E7D32' };
}

const TransactionCard = ({ tx, currency }) => {
    const { icon, color, bg } = getTxIcon(tx);
    return (
        <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: bg }]}>
                <Icon name={icon} size={20} color={color} />
            </View>
            <View style={styles.cardMiddle}>
                <Text style={styles.cardTitle}>{getTxTitle(tx)}</Text>
                <Text style={styles.cardDate}>{formatDate(tx.createdAt)}</Text>
                {tx.reference_code ? (
                    <Text style={styles.cardRef}>{tx.reference_code}</Text>
                ) : null}
            </View>
            <Text style={[styles.cardAmount, getTxAmountStyle(tx)]}>
                {(tx.isOutgoing || getTxType(tx) === 'WITHDRAWAL') ? '−' : '+'}
                {(currency || 'TRY')} {Number(tx.amount || 0).toFixed(2)}
            </Text>
        </View>
    );
};

const TransactionHistoryScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { list: transactions, pagination, isLoading } = useSelector(
        (state) => state.transactions
    );
    const { currency } = useSelector((state) => state.wallet);

    const [timeFilter, setTimeFilter]           = useState('all');
    const [typeFilter, setTypeFilter]           = useState('all');
    const [timeMenuVisible, setTimeMenuVisible] = useState(false);
    const [typeMenuVisible, setTypeMenuVisible] = useState(false);

    const load = useCallback((page = 1) => {
        dispatch(fetchTransactions({ page }));
    }, [dispatch]);

    useEffect(() => { load(1); }, [load]);

    const handleLoadMore = () => {
        if (pagination && pagination.page < pagination.totalPages && !isLoading) {
            load(pagination.page + 1);
        }
    };

    const filtered = transactions.filter((tx) => {
        // Time filter
        if (timeFilter !== 'all') {
            const ms = Date.now() - new Date(tx.createdAt).getTime();
            const limits = { '24h': 86400000, week: 604800000, month: 2592000000 };
            if (ms > limits[timeFilter]) return false;
        }
        // Type filter
        if (typeFilter !== 'all') {
            if (getTxType(tx) !== typeFilter) return false;
        }
        return true;
    });

    const getLabel = (opts, val) => opts.find((o) => o.value === val)?.label || 'Filter';
    const hasFilter = timeFilter !== 'all' || typeFilter !== 'all';

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

            {/* Hero Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Transaction History</Text>
                    <Text style={styles.headerSub}>All your payments and withdrawals</Text>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterBar}>
                <View style={styles.filterRow}>
                    <Icon name="filter-variant" size={16} color={PURPLE_MAIN} />
                    <Text style={styles.filterBarLabel}>Filter:</Text>

                    {/* Time filter */}
                    <Menu
                        visible={timeMenuVisible}
                        onDismiss={() => setTimeMenuVisible(false)}
                        anchor={
                            <TouchableOpacity
                                style={[styles.filterChip, timeFilter !== 'all' && styles.filterChipActive]}
                                onPress={() => setTimeMenuVisible(true)}
                            >
                                <Text style={[styles.filterChipText, timeFilter !== 'all' && styles.filterChipTextActive]}>
                                    {getLabel(TIME_OPTIONS, timeFilter)}
                                </Text>
                                <Icon name="chevron-down" size={14} color={timeFilter !== 'all' ? PURPLE_LIGHT : '#666'} />
                            </TouchableOpacity>
                        }
                    >
                        {TIME_OPTIONS.map((o) => (
                            <Menu.Item key={o.value}
                                onPress={() => { setTimeFilter(o.value); setTimeMenuVisible(false); }}
                                title={o.label}
                                titleStyle={timeFilter === o.value ? styles.menuItemActive : undefined}
                            />
                        ))}
                    </Menu>

                    {/* Type filter */}
                    <Menu
                        visible={typeMenuVisible}
                        onDismiss={() => setTypeMenuVisible(false)}
                        anchor={
                            <TouchableOpacity
                                style={[styles.filterChip, typeFilter !== 'all' && styles.filterChipActive]}
                                onPress={() => setTypeMenuVisible(true)}
                            >
                                <Text style={[styles.filterChipText, typeFilter !== 'all' && styles.filterChipTextActive]}>
                                    {getLabel(TYPE_OPTIONS, typeFilter)}
                                </Text>
                                <Icon name="chevron-down" size={14} color={typeFilter !== 'all' ? PURPLE_LIGHT : '#666'} />
                            </TouchableOpacity>
                        }
                    >
                        {TYPE_OPTIONS.map((o) => (
                            <Menu.Item key={o.value}
                                onPress={() => { setTypeFilter(o.value); setTypeMenuVisible(false); }}
                                title={o.label}
                                titleStyle={typeFilter === o.value ? styles.menuItemActive : undefined}
                            />
                        ))}
                    </Menu>

                    {hasFilter && (
                        <TouchableOpacity onPress={() => { setTimeFilter('all'); setTypeFilter('all'); }}>
                            <Text style={styles.clearBtn}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id?.toString()}
                renderItem={({ item }) => <TransactionCard tx={item} currency={currency} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={() => load(1)}
                        colors={[PURPLE_MAIN]}
                        tintColor={PURPLE_MAIN}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <Icon name="receipt" size={64} color="#D1C4E9" />
                            <Text style={styles.emptyTitle}>No Transactions</Text>
                            <Text style={styles.emptyText}>
                                {hasFilter ? 'No transactions match your filter.' : 'Your transactions will appear here.'}
                            </Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F4F5FB' },

    header: {
        backgroundColor: PURPLE_DARK,
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 28,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backBtn:     { marginRight: 14 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    // Filter bar
    filterBar: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    filterBarLabel: { fontSize: 13, color: PURPLE_MAIN, fontWeight: '600' },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        gap: 4,
        elevation: 1,
    },
    filterChipActive:     { backgroundColor: '#EDE7F6', borderColor: PURPLE_LIGHT },
    filterChipText:       { fontSize: 12, color: '#666', fontWeight: '500' },
    filterChipTextActive: { color: PURPLE_LIGHT, fontWeight: '600' },
    menuItemActive:       { color: PURPLE_LIGHT, fontWeight: '700' },
    clearBtn:             { fontSize: 12, color: PURPLE_LIGHT, fontWeight: '600' },

    // List
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },

    // Card
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardMiddle:  { flex: 1 },
    cardTitle:   { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
    cardDate:    { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
    cardRef:     { fontSize: 10, color: '#BDBDBD', marginTop: 1 },
    cardAmount:  { fontSize: 14, fontWeight: '700' },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle:     { fontSize: 16, fontWeight: '700', color: '#4A148C', marginTop: 16 },
    emptyText:      { fontSize: 13, color: '#9E9E9E', marginTop: 6, textAlign: 'center' },
});

export default TransactionHistoryScreen;
