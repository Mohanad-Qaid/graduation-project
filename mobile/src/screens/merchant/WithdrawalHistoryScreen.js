import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchWithdrawals } from '../../store/slices/transactionSlice';

const WithdrawalHistoryScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { withdrawals, withdrawalPagination, isLoading } = useSelector(
        (state) => state.transactions
    );
    const { currency } = useSelector((state) => state.wallet);

    const loadWithdrawals = useCallback(
        (page = 1) => {
            dispatch(fetchWithdrawals({ page }));
        },
        [dispatch]
    );

    useEffect(() => {
        loadWithdrawals(1);
    }, [loadWithdrawals]);

    const handleLoadMore = () => {
        if (
            withdrawalPagination &&
            withdrawalPagination.page < withdrawalPagination.pages &&
            !isLoading
        ) {
            loadWithdrawals(withdrawalPagination.page + 1);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return '#4CAF50';
            case 'rejected':
                return '#F44336';
            case 'pending':
            default:
                return '#FF9800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return 'check-circle';
            case 'rejected':
                return 'close-circle';
            case 'pending':
            default:
                return 'clock-outline';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderWithdrawal = ({ item }) => (
        <Card style={styles.withdrawalCard}>
            <Card.Content>
                <View style={styles.cardHeader}>
                    <View style={styles.amountContainer}>
                        <Text variant="titleLarge" style={styles.amount}>
                            {currency || 'USD'} {Number(item.amount || 0).toFixed(2)}
                        </Text>
                        <Chip
                            icon={() => (
                                <Icon
                                    name={getStatusIcon(item.status)}
                                    size={14}
                                    color={getStatusColor(item.status)}
                                />
                            )}
                            style={[
                                styles.statusChip,
                                { borderColor: getStatusColor(item.status) },
                            ]}
                            textStyle={{ color: getStatusColor(item.status), fontSize: 12 }}
                        >
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Chip>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.label}>
                        Bank:
                    </Text>
                    <Text variant="bodyMedium">{item.bankName}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.label}>
                        Account:
                    </Text>
                    <Text variant="bodyMedium">****{item.bankAccount?.slice(-4)}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Text variant="bodySmall" style={styles.label}>
                        Requested:
                    </Text>
                    <Text variant="bodySmall">{formatDate(item.createdAt)}</Text>
                </View>

                {item.processedAt && (
                    <View style={styles.detailRow}>
                        <Text variant="bodySmall" style={styles.label}>
                            Processed:
                        </Text>
                        <Text variant="bodySmall">{formatDate(item.processedAt)}</Text>
                    </View>
                )}

                {item.rejectionReason && (
                    <View style={styles.rejectionContainer}>
                        <Text variant="bodySmall" style={styles.rejectionLabel}>
                            Rejection Reason:
                        </Text>
                        <Text variant="bodySmall" style={styles.rejectionText}>
                            {item.rejectionReason}
                        </Text>
                    </View>
                )}
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>
                    Withdrawal History
                </Text>
            </View>

            <FlatList
                data={withdrawals}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderWithdrawal}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={() => loadWithdrawals(1)} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="cash-refund" size={60} color="#CCC" />
                        <Text style={styles.emptyText}>No withdrawal requests yet</Text>
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
        paddingTop: 0,
    },
    withdrawalCard: {
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
    },
    cardHeader: {
        marginBottom: 12,
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amount: {
        fontWeight: 'bold',
    },
    statusChip: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    label: {
        color: '#999',
    },
    rejectionContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#FFEBEE',
        borderRadius: 8,
    },
    rejectionLabel: {
        color: '#F44336',
        fontWeight: '500',
    },
    rejectionText: {
        color: '#666',
        marginTop: 4,
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

export default WithdrawalHistoryScreen;
