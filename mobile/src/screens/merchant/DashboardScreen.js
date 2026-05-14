import React, { useEffect, useCallback, useState } from 'react';
import {
  View, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchMerchantDashboard, clearError } from '../../store/slices/walletSlice';
import { getUnreadNotificationCount } from '../../services/offlineDb';

const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';

const getInitials = (firstName = '', lastName = '') =>
  ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';

/* ─── Quick Action Button ── */
const QuickAction = ({ icon, label, color, bg, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.actionIcon, { backgroundColor: bg }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ─── Stat Card ── */
const StatCard = ({ label, amount, count, iconName, iconColor, iconBg }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>
      <Icon name={iconName} size={18} color={iconColor} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statAmount}>{amount}</Text>
    <Text style={styles.statCount}>{count} txns</Text>
  </View>
);

const MerchantDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { balance, currency, merchantStats, isLoading, error } = useSelector((state) => state.wallet);

  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [unreadCount, setUnreadCount]   = useState(0);

  useEffect(() => {
    if (error) { setSnackMessage(error); setSnackVisible(true); }
  }, [error]);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch { /* SQLite may fail silently on Expo Go */ }
  }, []);

  const loadData = useCallback(() => {
    dispatch(fetchMerchantDashboard());
    refreshUnread();
  }, [dispatch, refreshUnread]);
  useEffect(() => { loadData(); }, [loadData]);

  const handleDismissSnack = () => { setSnackVisible(false); dispatch(clearError()); };

  const fmt = (amount) => `${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || 'TRY'}`;

  // Always show owner's personal name in greeting — business name is on the Profile page
  const ownerName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || 'Merchant';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#fff" />}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          {/* top bar */}
          <View style={styles.heroTop}>
            <View style={styles.greetBlock}>
              <Text style={styles.greetSmall}>Hello,</Text>
              <Text style={styles.greetName} numberOfLines={1}>{ownerName}</Text>
            </View>
            <View style={styles.heroTopRight}>
              {/* Bell notification button */}
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Icon name="bell-outline" size={22} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {getInitials(user?.first_name, user?.last_name)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* balance */}
          <View style={styles.balanceWrap}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{fmt(balance)}</Text>
            <View style={styles.pendingRow}>
              <Icon name="clock-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.pendingText}>
                {' '}Pending Withdrawal: {fmt(merchantStats?.pendingWithdrawal)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <QuickAction
              icon="qrcode"
              label="My QR Code"
              color={PURPLE_MAIN}
              bg="#EDE7F6"
              onPress={() => navigation.navigate('GenerateQR')}
            />
            <QuickAction
              icon="cash-multiple"
              label="Withdraw"
              color="#2E7D32"
              bg="#E8F5E9"
              onPress={() => navigation.navigate('RequestWithdrawal')}
            />
            <QuickAction
              icon="format-list-bulleted"
              label="History"
              color="#1565C0"
              bg="#E3F2FD"
              onPress={() => navigation.navigate('History')}
            />
            <QuickAction
              icon="bank-transfer-out"
              label="Withdrawals"
              color="#E65100"
              bg="#FFF3E0"
              onPress={() => navigation.navigate('WithdrawalHistory')}
            />
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.statsRow}>
            <StatCard
              label="Today"
              amount={fmt(merchantStats?.todayRevenue?.total)}
              count={merchantStats?.todayRevenue?.count || 0}
              iconName="weather-sunny"
              iconColor="#F57F17"
              iconBg="#FFFDE7"
            />
            <View style={styles.statDivider} />
            <StatCard
              label="This Week"
              amount={fmt(merchantStats?.weekRevenue?.total)}
              count={merchantStats?.weekRevenue?.count || 0}
              iconName="calendar-week"
              iconColor={PURPLE_MAIN}
              iconBg="#EDE7F6"
            />
          </View>
        </View>

        {/* ── Recent Payments ── */}
        <View style={styles.txSection}>
          <View style={styles.txHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {!merchantStats?.recentTransactions?.length ? (
            <View style={styles.emptyWrap}>
              <Icon name="inbox-outline" size={44} color="#CCC" />
              <Text style={styles.emptyText}>No payments received yet</Text>
            </View>
          ) : (
            merchantStats.recentTransactions.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txIconWrap}>
                  <Icon name="arrow-bottom-left" size={18} color="#2E7D32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txName}>{tx.customerName}</Text>
                  <Text style={styles.txTime}>
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.txAmount}>+{fmt(tx.amount)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Snackbar
        visible={snackVisible}
        onDismiss={handleDismissSnack}
        duration={4000}
        action={{ label: 'Dismiss', onPress: handleDismissSnack }}
      >
        {snackMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },

  /* hero */
  hero: {
    backgroundColor: PURPLE_DARK,
    paddingBottom: 28,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: PURPLE_MID, opacity: 0.4, top: -70, right: -60,
  },
  blob2: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: PURPLE_MAIN, opacity: 0.25, bottom: -30, left: 30,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 52, paddingHorizontal: 22, marginBottom: 20,
  },
  heroTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    position: 'relative',
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#FF1744',
    borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  greetSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  greetBlock: { flex: 1, marginRight: 12 },
  greetName: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  balanceWrap: { paddingHorizontal: 22 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 },
  balanceAmount: { color: '#fff', fontSize: 34, fontWeight: '800' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  pendingText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  /* cards */
  actionsCard: {
    backgroundColor: '#fff', borderRadius: 22,
    marginHorizontal: 20, marginTop: 16, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', flex: 1 },
  actionIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  actionLabel: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center' },

  /* stats */
  statsCard: {
    backgroundColor: '#fff', borderRadius: 22,
    marginHorizontal: 20, marginTop: 14, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 70, backgroundColor: '#F0F0F0', marginHorizontal: 8 },
  statIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  statLabel: { fontSize: 12, color: '#ABABAB', fontWeight: '600', marginBottom: 4 },
  statAmount: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  statCount: { fontSize: 11, color: '#ABABAB', marginTop: 2 },

  /* recent transactions */
  txSection: {
    backgroundColor: '#fff', borderRadius: 22,
    marginHorizontal: 20, marginTop: 14, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { color: PURPLE_MAIN, fontWeight: '600', fontSize: 13 },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  txIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  txName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  txTime: { fontSize: 12, color: '#ABABAB', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  emptyWrap: { alignItems: 'center', paddingVertical: 28 },
  emptyText: { color: '#ABABAB', marginTop: 10, fontSize: 14 },
});

export default MerchantDashboard;
