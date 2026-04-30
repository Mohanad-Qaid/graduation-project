import React, { useEffect, useCallback } from 'react';
import {
    View, StyleSheet, FlatList, RefreshControl,
    TouchableOpacity, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchWithdrawals } from '../../store/slices/transactionSlice';

const PURPLE_DARK = '#1A006B';
const PURPLE_MAIN = '#4A148C';

// ── Status helpers ────────────────────────────────────────────────────────────
// Backend always sends uppercase: 'APPROVED', 'REJECTED', 'PENDING'
const STATUS_CONFIG = {
    APPROVED: { color: '#2E7D32', bg: '#E8F5E9', icon: 'check-circle',  label: 'Approved' },
    REJECTED: { color: '#C62828', bg: '#FFEBEE', icon: 'close-circle',  label: 'Rejected' },
    PENDING:  { color: '#E65100', bg: '#FFF3E0', icon: 'clock-outline', label: 'Pending'  },
};

function getStatus(raw) {
    return STATUS_CONFIG[raw?.toUpperCase()] ?? STATUS_CONFIG.PENDING;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Withdrawal Card ───────────────────────────────────────────────────────────
const WithdrawalCard = ({ item }) => {
    const s = getStatus(item.status);
    const grossAmount = parseFloat(item.amount || 0);
    const feeAmount   = parseFloat(item.fee_amount || 0);
    const netAmount   = parseFloat(item.net_amount || grossAmount);

    return (
        <View style={styles.card}>
            {/* Card header row */}
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <Icon name="bank-transfer-out" size={22} color={PURPLE_MAIN} />
                    <Text style={styles.cardAmount}>
                        {grossAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} TRY
                    </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: s.bg }]}>
                    <Icon name={s.icon} size={13} color={s.color} />
                    <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                </View>
            </View>

            {/* Fee breakdown */}
            <View style={styles.feeRow}>
                <View style={styles.feeBlock}>
                    <Text style={styles.feeLabel}>Platform Fee</Text>
                    <Text style={styles.feeValue}>−{feeAmount.toFixed(2)} TRY</Text>
                </View>
                <View style={styles.feeDivider} />
                <View style={styles.feeBlock}>
                    <Text style={styles.feeLabel}>You Receive</Text>
                    <Text style={[styles.feeValue, { color: '#2E7D32', fontWeight: '700' }]}>
                        {netAmount.toFixed(2)} TRY
                    </Text>
                </View>
            </View>

            {/* Bank info */}
            <View style={styles.section}>
                <Row icon="bank"                  label="Bank"    value={item.bank_name || '—'} />
                <Row icon="account"               label="Account" value={item.bank_account_name || '—'} />
                <Row icon="card-account-details-outline" label="IBAN"
                    value={item.bank_account ? `****${item.bank_account.slice(-4)}` : '—'} />
            </View>

            {/* Dates */}
            <View style={styles.section}>
                <Row icon="calendar-plus"  label="Requested" value={formatDate(item.createdAt)} />
                {item.updatedAt && item.status?.toUpperCase() !== 'PENDING' && (
                    <Row icon="calendar-check" label="Processed"
                        value={formatDate(item.updatedAt)} />
                )}
            </View>

            {/* Rejection reason */}
            {item.rejection_reason && (
                <View style={styles.rejectionBox}>
                    <Icon name="alert-circle-outline" size={15} color="#C62828" />
                    <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
                </View>
            )}
        </View>
    );
};

// Small helper row
function Row({ icon, label, value }) {
    return (
        <View style={styles.row}>
            <View style={styles.rowLeft}>
                <Icon name={icon} size={14} color="#9E9E9E" />
                <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
const WithdrawalHistoryScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { withdrawals, withdrawalPagination, isLoading } = useSelector(
        (state) => state.transactions
    );

    const load = useCallback((page = 1) => {
        dispatch(fetchWithdrawals({ page }));
    }, [dispatch]);

    useEffect(() => { load(1); }, [load]);

    const handleLoadMore = () => {
        if (
            withdrawalPagination &&
            withdrawalPagination.page < withdrawalPagination.totalPages &&
            !isLoading
        ) {
            load(withdrawalPagination.page + 1);
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

            {/* Hero Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Withdrawal History</Text>
                    <Text style={styles.headerSub}>All your bank withdrawal requests</Text>
                </View>
            </View>

            <FlatList
                data={withdrawals}
                keyExtractor={(item) => item.id?.toString()}
                renderItem={({ item }) => <WithdrawalCard item={item} />}
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
                            <Icon name="cash-refund" size={64} color="#D1C4E9" />
                            <Text style={styles.emptyTitle}>No Withdrawals Yet</Text>
                            <Text style={styles.emptyText}>Your withdrawal requests will appear here.</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
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

    listContent: { padding: 16, paddingBottom: 32 },

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardAmount:     { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },

    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
    },
    statusText: { fontSize: 12, fontWeight: '600' },

    // Fee breakdown row
    feeRow: {
        flexDirection: 'row',
        backgroundColor: '#F8F4FF',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        alignItems: 'center',
    },
    feeBlock:   { flex: 1, alignItems: 'center' },
    feeDivider: { width: 1, height: 28, backgroundColor: '#E0D4F5', marginHorizontal: 8 },
    feeLabel:   { fontSize: 11, color: '#9E9E9E', marginBottom: 2 },
    feeValue:   { fontSize: 13, fontWeight: '600', color: '#4A148C' },

    // Detail rows
    section: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 10,
        marginBottom: 6,
        gap: 6,
    },
    row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rowLabel: { fontSize: 12, color: '#9E9E9E' },
    rowValue: { fontSize: 12, color: '#424242', fontWeight: '500', maxWidth: '60%' },

    // Rejection
    rejectionBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
        gap: 6,
    },
    rejectionText: { flex: 1, fontSize: 12, color: '#C62828', lineHeight: 18 },

    // Empty
    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle:     { fontSize: 16, fontWeight: '700', color: '#4A148C', marginTop: 16 },
    emptyText:      { fontSize: 13, color: '#9E9E9E', marginTop: 6, textAlign: 'center' },
});

export default WithdrawalHistoryScreen;
