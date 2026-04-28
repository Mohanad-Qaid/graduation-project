import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchBalance, clearError as clearWalletError } from '../../store/slices/walletSlice';
import { fetchTransactions, clearError as clearTxError } from '../../store/slices/transactionSlice';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmt = (amount, currency) =>
  `${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const getInitials = (firstName, lastName) => {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
};

/* ─── Quick Action Chip ───────────────────────────────────────────────────── */
const ActionChip = ({ icon, label, onPress, iconBg, iconColor }) => (
  <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.chipIcon, { backgroundColor: iconBg }]}>
      <Icon name={icon} size={22} color={iconColor} />
    </View>
    <Text style={styles.chipLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ─── Transaction Row ─────────────────────────────────────────────────────── */
const TxRow = ({ tx, currency }) => {
  const out = tx.isOutgoing;
  const accent = out ? '#EF5350' : '#26A69A';
  const bg = out ? '#FFEBEE' : '#E0F2F1';
  const iconName = out ? 'arrow-top-right' : 'arrow-bottom-left';

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIconWrap, { backgroundColor: bg }]}>
        <Icon name={iconName} size={18} color={accent} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>
          {tx.counterparty}
        </Text>
        <Text style={styles.txDate}>{fmtDate(tx.createdAt)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: accent }]}>
        {out ? '−' : '+'}
        {fmt(tx.amount, currency)}
      </Text>
    </View>
  );
};

/* ─── Main Screen ─────────────────────────────────────────────────────────── */
const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const {
    balance,
    currency,
    isLoading: walletLoading,
    error: walletError,
  } = useSelector((s) => s.wallet);
  const {
    list: transactions,
    isLoading: txLoading,
    error: txError,
  } = useSelector((s) => s.transactions);

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const err = walletError || txError;
    if (err) {
      setSnackMessage(err);
      setSnackVisible(true);
    }
  }, [walletError, txError]);

  const loadData = useCallback(() => {
    dispatch(fetchBalance());
    dispatch(fetchTransactions({ page: 1 }));
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const firstName = user?.first_name || 'there';
  const recentTx = transactions.slice(0, 5);
  const isRefreshing = walletLoading || txLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A006B" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadData}
            tintColor="#fff"
            colors={['#6200EE']}
          />
        }
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          {/* decorative blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          {/* top bar */}
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greetSmall}>Hello</Text>
              <Text style={styles.greetName} numberOfLines={1}>{firstName}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarInitials}>
                {getInitials(user?.first_name, user?.last_name)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* balance */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.balLabel}>Available Balance</Text>
            <Text style={styles.balAmount}>{fmt(balance, currency)}</Text>
          </Animated.View>

          {/* subtle card strip at bottom */}
          <View style={styles.heroStrip} />
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsCard}>
          <ActionChip
            icon="plus-circle-outline"
            label="Add Money"
            iconBg="#EDE7F6"
            iconColor="#6200EE"
            onPress={() => navigation.navigate('AddBalance')}
          />
          <ActionChip
            icon="qrcode-scan"
            label="Pay"
            iconBg="#E0F7FA"
            iconColor="#00838F"
            onPress={() => navigation.navigate('QRScanner')}
          />
          <ActionChip
            icon="chart-areaspline"
            label="Analytics"
            iconBg="#FDE8E8"
            iconColor="#EF5350"
            onPress={() => navigation.navigate('Stats')}
          />
          <ActionChip
            icon="format-list-bulleted"
            label="History"
            iconBg="#E8F5E9"
            iconColor="#2E7D32"
            onPress={() => navigation.navigate('History')}
          />
        </View>

        {/* ── Recent Transactions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {recentTx.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="receipt-text-outline" size={44} color="#D0D0D0" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubText}>Your activity will appear here</Text>
            </View>
          ) : (
            recentTx.map((tx) => (
              <TxRow key={tx.id} tx={tx} currency={currency} />
            ))
          )}
        </View>
      </ScrollView>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => {
          setSnackVisible(false);
          dispatch(clearWalletError());
          dispatch(clearTxError());
        }}
        duration={4000}
        action={{ label: 'OK', onPress: () => setSnackVisible(false) }}
      >
        {snackMessage}
      </Snackbar>
    </View>
  );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F5FB',
  },

  /* ── hero ──────────────────────────────────────────────────────────────── */
  hero: {
    backgroundColor: PURPLE_DARK,
    paddingTop: 56,
    paddingBottom: 52,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  blob1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: PURPLE_MID,
    opacity: 0.45,
    top: -60,
    right: -50,
  },
  blob2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: PURPLE_MAIN,
    opacity: 0.3,
    bottom: -30,
    left: 60,
  },
  blob3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9B59B6',
    opacity: 0.2,
    top: 20,
    left: -20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greetSmall: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  greetName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: '100%',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  balLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  balAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  heroStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: PURPLE_MAIN,
    opacity: 0.6,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },

  /* ── quick actions ──────────────────────────────────────────────────────── */
  actionsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 10,
    elevation: 8,
    shadowColor: PURPLE_MAIN,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  chip: {
    alignItems: 'center',
  },
  chipIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    marginTop: 6,
  },

  /* ── section ────────────────────────────────────────────────────────────── */
  section: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  seeAll: {
    fontSize: 13,
    color: PURPLE_MAIN,
    fontWeight: '600',
  },

  /* ── empty ──────────────────────────────────────────────────────────────── */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: '#ABABAB',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubText: {
    color: '#CCCCCC',
    fontSize: 13,
  },

  /* ── transaction row ────────────────────────────────────────────────────── */
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  txIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  txDate: {
    fontSize: 12,
    color: '#ABABAB',
    marginTop: 3,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DashboardScreen;
