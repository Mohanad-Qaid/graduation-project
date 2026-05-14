import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { requestWithdrawal, clearError, clearWithdrawalSuccess } from '../../store/slices/transactionSlice';
import { fetchBalance } from '../../store/slices/walletSlice';

const PURPLE_DARK  = '#1A006B';
const PURPLE_MAIN  = '#4A148C';
const PURPLE_LIGHT = '#6200EE';
const FEE_RATE = 0.05; // Must match WITHDRAWAL_FEE_RATE in fees.config.js (5%)

// Turkish IBAN regex: TR + exactly 24 digits = 26 chars total
const TURKISH_IBAN_REGEX = /^TR\d{24}$/;

const RequestWithdrawalScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { isLoading, error, withdrawalSuccess } = useSelector((state) => state.transactions);
    const { balance, currency } = useSelector((state) => state.wallet);

    const [amount, setAmount]                 = useState('');
    const [bankName, setBankName]             = useState('');
    const [ibanDigits, setIbanDigits]         = useState(''); // 24 digits; TR is static prefix
    const [bankAccountName, setBankAccountName] = useState('');
    const [fieldError, setFieldError]         = useState('');

    // Derived fee values — recomputed on every amount keystroke
    // Normalize comma-as-decimal-separator before parsing (e.g. "1000,50" → 1000.50)
    const parsedAmount  = parseFloat((amount || '').replace(',', '.'));
    const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
    const feeAmount     = isValidAmount ? (parsedAmount * FEE_RATE).toFixed(2) : null;
    const netAmount     = isValidAmount ? (parsedAmount - parseFloat(feeAmount)).toFixed(2) : null;

    useEffect(() => {
        if (error) {
            setFieldError(error);
            dispatch(clearError());
        }
        if (withdrawalSuccess) {
            dispatch(clearWithdrawalSuccess());
            dispatch(fetchBalance()); // refresh dashboard balance immediately
            navigation.navigate('Dashboard');
        }
    }, [error, withdrawalSuccess, dispatch, navigation]);

    const handleSubmit = () => {
        setFieldError('');

        // Presence checks
        if (!amount || !bankName.trim() || !ibanDigits || !bankAccountName.trim()) {
            setFieldError('Please fill in all fields.');
            return;
        }

        // Amount checks
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setFieldError('Please enter a valid amount.');
            return;
        }
        if (parsedAmount < 1000) {
            setFieldError('Minimum withdrawal amount is 1,000 TL.');
            return;
        }
        if (parsedAmount > parseFloat(balance || 0)) {
            setFieldError('Insufficient balance.');
            return;
        }

        // IBAN validation — TR prefix is static; validate the 24 digits
        if (ibanDigits.length !== 24) {
            setFieldError('IBAN must be exactly 24 digits after the TR prefix.');
            return;
        }
        const ibanClean = `TR${ibanDigits}`;

        dispatch(requestWithdrawal({
            amount: parsedAmount,
            bankName: bankName.trim(),
            bankAccount: ibanClean,
            bankAccountName: bankAccountName.trim(),
        }));
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Request Withdrawal</Text>
                    <Text style={styles.headerSub}>Transfer your balance to your bank</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {Number(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency || 'TRY'}
                    </Text>
                    <Text style={styles.balanceNote}>Minimum withdrawal: 1,000 TRY</Text>
                </View>

                {/* Error Banner */}
                {!!fieldError && (
                    <View style={styles.errorBanner}>
                        <Icon name="alert-circle-outline" size={18} color="#B71C1C" />
                        <Text style={styles.errorText}>{fieldError}</Text>
                    </View>
                )}

                {/* Input Form */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Withdrawal Details</Text>

                    <TextInput
                        label="Amount (TRY)"
                        value={amount}
                        onChangeText={(v) => { setAmount(v); setFieldError(''); }}
                        keyboardType="numeric"
                        style={styles.input}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={PURPLE_MAIN}
                        left={<TextInput.Icon icon="cash" color={PURPLE_MAIN} />}
                    />

                    {/* Live fee breakdown */}
                    {isValidAmount && parsedAmount >= 1000 && (
                        <View style={styles.feeBreakdown}>
                            <View style={styles.feeRow}>
                                <Text style={styles.feeLabel}>Platform fee ({(FEE_RATE * 100).toFixed(0)}%)</Text>
                                <Text style={styles.feeValue}>− {feeAmount} TRY</Text>
                            </View>
                            <View style={[styles.feeRow, styles.feeRowNet]}>
                                <Text style={styles.feeNetLabel}>You will receive</Text>
                                <Text style={styles.feeNetValue}>{netAmount} TRY</Text>
                            </View>
                        </View>
                    )}

                    <Text style={styles.sectionTitle2}>Bank Information</Text>

                    <TextInput
                        label="Bank Name"
                        value={bankName}
                        onChangeText={(v) => { setBankName(v); setFieldError(''); }}
                        style={styles.input}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={PURPLE_MAIN}
                        left={<TextInput.Icon icon="bank" color={PURPLE_MAIN} />}
                        placeholder="e.g. Ziraat Bankası"
                    />

                    <TextInput
                        label="Account Holder Name"
                        value={bankAccountName}
                        onChangeText={(v) => { setBankAccountName(v); setFieldError(''); }}
                        style={styles.input}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={PURPLE_MAIN}
                        left={<TextInput.Icon icon="account" color={PURPLE_MAIN} />}
                        placeholder="Full name as on the account"
                    />

                    <Text style={styles.ibanLabel}>IBAN</Text>
                    <View style={styles.ibanRow}>
                        <View style={styles.ibanPrefix}>
                            <Text style={styles.ibanPrefixText}>TR</Text>
                        </View>
                        <TextInput
                            value={ibanDigits}
                            onChangeText={(v) => { setIbanDigits(v.replace(/\D/g, '').slice(0, 24)); setFieldError(''); }}
                            keyboardType="numeric"
                            maxLength={24}
                            style={styles.ibanInput}
                            mode="outlined"
                            outlineColor="#E0E0E0"
                            activeOutlineColor={PURPLE_MAIN}
                            placeholder="24 digits"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>Submit Request</Text>
                                <Icon name="arrow-right" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                    <Icon name="information-outline" size={20} color="#1565C0" style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                        Withdrawals are reviewed by an admin and typically processed within 1-3 business days.
                        A 5% platform fee is deducted from the gross amount.
                    </Text>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
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
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    scrollContent: { padding: 20, paddingTop: 16, paddingBottom: 40 },

    balanceCard: {
        backgroundColor: PURPLE_LIGHT,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 4,
        shadowColor: PURPLE_LIGHT,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    balanceLabel:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
    balanceAmount: { color: '#fff', fontSize: 28, fontWeight: '800' },
    balanceNote:   { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 6 },

    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 14,
        gap: 8,
    },
    errorText: { flex: 1, color: '#B71C1C', fontSize: 13 },

    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
    sectionTitle2: { fontSize: 14, fontWeight: '600', color: '#4A148C', marginTop: 6, marginBottom: 12 },
    input: { backgroundColor: '#fff', marginBottom: 12 },
    ibanHint: { fontSize: 11, color: '#9E9E9E', marginTop: -8, marginBottom: 14, marginLeft: 4 },

    // Fee breakdown
    feeBreakdown: {
        backgroundColor: '#F3E5F5',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginTop: -4,
        marginBottom: 14,
    },
    feeRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
    feeRowNet:  { borderTopWidth: 1, borderTopColor: '#CE93D8', marginTop: 4, paddingTop: 6 },
    feeLabel:   { fontSize: 12, color: '#7B1FA2' },
    feeValue:   { fontSize: 12, color: '#7B1FA2' },
    feeNetLabel: { fontSize: 13, fontWeight: '600', color: '#4A148C' },
    feeNetValue: { fontSize: 13, fontWeight: '700', color: '#4A148C' },

    submitButton: {
        backgroundColor: PURPLE_MAIN,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginTop: 8,
        gap: 8,
    },
    submitButtonDisabled: { backgroundColor: '#B39DDB' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    infoIcon: { marginTop: 2, marginRight: 10 },
    infoText: { flex: 1, color: '#1565C0', fontSize: 13, lineHeight: 20 },

    /* IBAN split field */
    ibanLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 4 },
    ibanRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    ibanPrefix: {
        backgroundColor: '#EDE7F6',
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 56,
        justifyContent: 'center',
        marginRight: 8,
    },
    ibanPrefixText: { color: PURPLE_MAIN, fontWeight: '800', fontSize: 15 },
    ibanInput: { flex: 1, backgroundColor: '#fff' },
});

export default RequestWithdrawalScreen;
