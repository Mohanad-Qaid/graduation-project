import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, SegmentedButtons } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { fetchExpenseStats } from '../../store/slices/transactionSlice';

const screenWidth = Dimensions.get('window').width;

const COLORS = ['#6200EE', '#03DAC6', '#FF5722', '#4CAF50', '#2196F3', '#FF9800'];

const ExpenseDashboardScreen = () => {
  const dispatch = useDispatch();
  const { stats, isLoading } = useSelector((state) => state.transactions);
  const { currency } = useSelector((state) => state.wallet);

  const [period, setPeriod] = useState('month');

  useEffect(() => {
    dispatch(fetchExpenseStats(period));
  }, [dispatch, period]);

  const formatCurrency = (amount) => {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  };

  const pieChartData = stats?.categoryBreakdown?.map((cat, index) => ({
    name: cat.label,
    amount: Number(cat.value || 0),
    color: COLORS[index % COLORS.length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  })) || [];

  const lineChartData = {
    labels: stats?.dailySpending?.slice(-7).map((d) =>
      new Date(d.date).toLocaleDateString([], { weekday: 'short' })
    ) || [],
    datasets: [
      {
        data: stats?.dailySpending?.slice(-7).map((d) => d.total) || [0],
        color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Expense Dashboard
        </Text>
      </View>

      <SegmentedButtons
        value={period}
        onValueChange={setPeriod}
        buttons={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'year', label: 'Year' },
        ]}
        style={styles.periodSelector}
      />

      <View style={styles.summaryCards}>
        <Card style={[styles.summaryCard, styles.spentCard]}>
          <Card.Content>
            <Text variant="labelMedium" style={styles.cardLabel}>
              Total Spent
            </Text>
            <Text variant="titleLarge" style={styles.cardValue}>
              {formatCurrency(stats?.totals?.spent || 0)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.summaryCard, styles.topupCard]}>
          <Card.Content>
            <Text variant="labelMedium" style={styles.cardLabel}>
              Total Top-up
            </Text>
            <Text variant="titleLarge" style={styles.cardValue}>
              {formatCurrency(stats?.totals?.topup || 0)}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Spending Trend
          </Text>
          {stats?.dailySpending?.length > 0 ? (
            <LineChart
              data={lineChartData}
              width={screenWidth - 60}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No data available</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.chartCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Spending by Category
          </Text>
          {pieChartData.length > 0 ? (
            <PieChart
              data={pieChartData}
              width={screenWidth - 60}
              height={200}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No spending data</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Statistics
          </Text>
          <View style={styles.statRow}>
            <Text variant="bodyMedium">Total Transactions</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {stats?.totals?.transactionCount || 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="bodyMedium">Average Transaction</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {stats?.totals?.transactionCount > 0
                ? formatCurrency(
                  (stats?.totals?.spent || 0) / stats?.totals?.transactionCount
                )
                : formatCurrency(0)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="bodyMedium">Top Category</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {stats?.categoryBreakdown?.[0]?.label || 'N/A'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
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
  periodSelector: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  spentCard: {
    backgroundColor: '#FFEBEE',
  },
  topupCard: {
    backgroundColor: '#E8F5E9',
  },
  cardLabel: {
    color: '#666',
  },
  cardValue: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  chartTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#999',
  },
  statsCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statValue: {
    fontWeight: '600',
  },
});

export default ExpenseDashboardScreen;
