import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { PieChart, LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchExpenseStats } from '../../store/slices/transactionSlice';

const { width } = Dimensions.get('window');
const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';
const CHART_COLORS = [PURPLE_MAIN, '#26A69A', '#EF5350', '#FFA726', '#42A5F5', '#AB47BC'];

const PERIODS = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const ExpenseDashboardScreen = () => {
  const dispatch = useDispatch();
  const { stats } = useSelector((state) => state.transactions);
  const { currency } = useSelector((state) => state.wallet);

  const [period, setPeriod] = useState('month');

  useEffect(() => {
    dispatch(fetchExpenseStats(period));
  }, [dispatch, period]);

  const fmt = (v) =>
    `${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const pieData =
    stats?.categoryBreakdown?.map((cat, i) => ({
      name: cat.label,
      amount: Number(cat.value || 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
      legendFontColor: '#666',
      legendFontSize: 12,
    })) || [];

  const lineData = {
    labels: stats?.dailySpending?.slice(-7).map((d) =>
      new Date(d.date).toLocaleDateString([], { weekday: 'short' })
    ) || [],
    datasets: [
      {
        data: stats?.dailySpending?.slice(-7).map((d) => d.total) || [0],
        color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
        strokeWidth: 2.5,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    labelColor: () => '#888',
    strokeWidth: 2,
    decimalPlaces: 0,
    propsForDots: { r: '4', strokeWidth: '2', stroke: PURPLE_MAIN },
  };

  const netFlow =
    (Number(stats?.totals?.topup || 0) - Number(stats?.totals?.spent || 0));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Your financial overview</Text>

          {/* Period Selector */}
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.periodChip, period === p.value && styles.periodChipActive]}
                onPress={() => setPeriod(p.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Summary Cards ── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.spentCard]}>
            <View style={styles.summaryIconWrap}>
              <Icon name="arrow-top-right" size={18} color="#EF5350" />
            </View>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={styles.summaryValue}>{fmt(stats?.totals?.spent || 0)}</Text>
          </View>

          <View style={[styles.summaryCard, styles.topupCard]}>
            <View style={[styles.summaryIconWrap, { backgroundColor: '#E0F2F1' }]}>
              <Icon name="arrow-bottom-left" size={18} color="#26A69A" />
            </View>
            <Text style={styles.summaryLabel}>Top-up</Text>
            <Text style={[styles.summaryValue, { color: '#26A69A' }]}>
              {fmt(stats?.totals?.topup || 0)}
            </Text>
          </View>
        </View>

        {/* Net Flow */}
        <View style={styles.netCard}>
          <View>
            <Text style={styles.netLabel}>Net Cash Flow</Text>
            <Text style={[styles.netValue, { color: netFlow >= 0 ? '#26A69A' : '#EF5350' }]}>
              {netFlow >= 0 ? '+' : ''}{fmt(netFlow)}
            </Text>
          </View>
          <Icon
            name={netFlow >= 0 ? 'trending-up' : 'trending-down'}
            size={32}
            color={netFlow >= 0 ? '#26A69A' : '#EF5350'}
          />
        </View>

        {/* ── Spending Trend ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending Trend</Text>
          {stats?.dailySpending?.length > 0 ? (
            <LineChart
              data={lineData}
              width={width - 64}
              height={190}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withShadow={false}
            />
          ) : (
            <View style={styles.noData}>
              <Icon name="chart-line" size={40} color="#DDD" />
              <Text style={styles.noDataText}>No data available</Text>
            </View>
          )}
        </View>

        {/* ── Category Pie ── */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          {pieData.length > 0 ? (
            <PieChart
              data={pieData}
              width={width - 64}
              height={180}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="10"
              style={styles.chart}
            />
          ) : (
            <View style={styles.noData}>
              <Icon name="chart-pie" size={40} color="#DDD" />
              <Text style={styles.noDataText}>No spending data</Text>
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsCard}>
          <Text style={styles.chartTitle}>Quick Stats</Text>
          {[
            {
              icon: 'swap-horizontal',
              label: 'Total Transactions',
              value: stats?.totals?.transactionCount || 0,
            },
            {
              icon: 'calculator-variant-outline',
              label: 'Average Transaction',
              value:
                stats?.totals?.transactionCount > 0
                  ? fmt((stats?.totals?.spent || 0) / stats?.totals?.transactionCount)
                  : fmt(0),
            },
            {
              icon: 'tag-outline',
              label: 'Top Category',
              value: stats?.categoryBreakdown?.[0]?.label || 'N/A',
            },
          ].map((s) => (
            <View key={s.label} style={styles.statRow}>
              <View style={styles.statIcon}>
                <Icon name={s.icon} size={18} color={PURPLE_MAIN} />
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },

  /* header */
  header: {
    backgroundColor: PURPLE_DARK,
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85,
    backgroundColor: PURPLE_MID, opacity: 0.45, top: -52, right: -40,
  },
  blob2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: PURPLE_MAIN, opacity: 0.25, bottom: -20, left: 60,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4, marginBottom: 20 },

  /* period selector */
  periodRow: { flexDirection: 'row', gap: 8 },
  periodChip: {
    paddingVertical: 7, paddingHorizontal: 18,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  periodChipActive: { backgroundColor: '#fff' },
  periodText: { color: 'rgba(255,255,255,0.75)', fontWeight: '600', fontSize: 13 },
  periodTextActive: { color: PURPLE_MAIN },

  /* summary cards */
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, gap: 12 },
  summaryCard: {
    flex: 1, borderRadius: 20, padding: 16, backgroundColor: '#fff',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  spentCard: {},
  topupCard: {},
  summaryIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  summaryLabel: { fontSize: 12, color: '#ABABAB', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#EF5350', marginTop: 4 },

  /* net card */
  netCard: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  netLabel: { fontSize: 13, color: '#ABABAB', fontWeight: '600' },
  netValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },

  /* charts */
  chartCard: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  chart: { borderRadius: 12 },
  noData: { height: 140, justifyContent: 'center', alignItems: 'center', gap: 8 },
  noDataText: { color: '#CCC', fontSize: 14 },

  /* stats */
  statsCard: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  statRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#EDE7F6',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  statLabel: { flex: 1, fontSize: 14, color: '#555' },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
});

export default ExpenseDashboardScreen;
