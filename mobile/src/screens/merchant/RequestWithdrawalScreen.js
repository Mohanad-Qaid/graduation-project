import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { Text, Snackbar, TextInput, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { requestWithdrawal, clearError, clearWithdrawalSuccess } from '../../store/slices/transactionSlice';

const PURPLE_DARK = '#1A006B';
const PURPLE_MAIN = '#6200EE';

const RequestWithdrawalScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { isLoading, error, withdrawalSuccess } = useSelector((state) => state.transactions);
    const { balance, currency } = useSelector((state) => state.wallet);

    const [amount, setAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccount, setBankAccount] = useState('');

    const [snackVisible, setSnackVisible] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');

    useEffect(() => {
        if (error) {
            setSnackMessage(error);
            setSnackVisible(true);
            dispatch(clearError());
        }
        if (withdrawalSuccess) {
            setSnackMessage('Withdrawal request submitted successfully');
            setSnackVisible(true);
            setAmount('');
            setBankName('');
            setBankAccount('');
            dispatch(clearWithdrawalSuccess());
            // Navigate to withdrawal history after short delay
            setTimeout(() => {
                navigation.navigate('WithdrawalHistory');
            }, 1500);
        }
    }, [error, withdrawalSuccess, dispatch, navigation]);

    const handleSubmit = () => {
        if (!amount || !bankName || !bankAccount) {
            setSnackMessage('Please fill all fields');
            setSnackVisible(true);
            return;
        }

        if (parseFloat(amount) <= 0) {
            setSnackMessage('Amount must be greater than zero');
            setSnackVisible(true);
            return;
        }

        if (parseFloat(amount) > balance) {
            setSnackMessage('Insufficient balance');
            setSnackVisible(true);
            return;
        }

        dispatch(requestWithdrawal({ amount: parseFloat(amount), bankName, bankAccount }));
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
                <Text style={styles.headerTitle}>Request Withdrawal</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {Number(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency || 'TRY'}
                    </Text>
                </View>

                {/* Input Form */}
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Withdrawal Details</Text>

                    <TextInput
                        label="Amount"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        style={styles.input}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={PURPLE_MAIN}
                        left={<TextInput.Icon icon="cash" color={PURPLE_MAIN} />}
                    />

                    <TextInput
                        label="Bank Name"
                        value={bankName}
                        onChangeText={setBankName}
                        style={styles.input}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={PURPLE_MAIN}
                        left={<TextInput.Icon icon="bank" color={PURPLE_MAIN} />}
                        placeholder="e.g. Ziraat Bankası"
                    />

                    <TextInput
                        label="IBAN / Account Number"
                        value={bankAccount}
                        onChangeText={setBankAccount}
                        style={styles.input}
                        mode="outlined"
                        outlineColor="#E0E0E0"
                        activeOutlineColor={PURPLE_MAIN}
                        left={<TextInput.Icon icon="card-account-details-outline" color={PURPLE_MAIN} />}
                        keyboardType="default"
                    />

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
                        Withdrawals typically take 1-3 business days to be processed and deposited into your account.
                    </Text>
                </View>

            </ScrollView>

            <Snackbar
                visible={snackVisible}
                onDismiss={() => setSnackVisible(false)}
                duration={3000}
                action={{ label: 'Dismiss', onPress: () => setSnackVisible(false) }}
            >
                {snackMessage}
            </Snackbar>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F4F5FB' },
    header: {
        backgroundColor: PURPLE_DARK,
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 25,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    scrollContent: { padding: 20, paddingTop: 10 },
    balanceCard: {
        backgroundColor: PURPLE_MAIN,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        marginTop: 10,
        elevation: 4, shadowColor: PURPLE_MAIN, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 5 },
    balanceAmount: { color: '#fff', fontSize: 28, fontWeight: '800' },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 15 },
    input: {
        backgroundColor: '#fff',
        marginBottom: 15,
    },
    submitButton: {
        backgroundColor: PURPLE_MAIN,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#B39DDB',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
    },
    infoIcon: { marginTop: 2, marginRight: 10 },
    infoText: { flex: 1, color: '#1565C0', fontSize: 13, lineHeight: 18 },
});

export default RequestWithdrawalScreen;
