import React, { useEffect } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import { generateQR, clearError } from '../../store/slices/transactionSlice';

const GenerateQRScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { qrData, isLoading, error } = useSelector((state) => state.transactions);
  const { user } = useSelector((state) => state.auth);

  // Auto-generate/retrieve the static QR on mount
  useEffect(() => {
    dispatch(generateQR());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const displayName = user?.business_name || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  const handleShare = async () => {
    if (qrData?.payload) {
      try {
        await Share.share({
          message: `Pay ${displayName} using E-Wallet. Scan the QR code in the app.`,
        });
      } catch (e) {
        console.error('Share error:', e);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading your QR code…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()}>Back</Button>
        <Text variant="titleLarge" style={styles.title}>My QR Code</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={styles.content}>
        <Card style={styles.qrCard}>
          <Card.Content style={styles.qrContent}>
            <Text variant="titleMedium" style={styles.merchantName}>{displayName}</Text>

            {qrData?.payload ? (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrData.payload}
                  size={220}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>
            ) : (
              <View style={styles.qrWrapper}>
                <Text style={styles.noQrText}>No QR code available.</Text>
              </View>
            )}

            <Text variant="bodySmall" style={styles.hint}>
              Show this to your customer. They scan it and enter the amount.
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="share"
          onPress={handleShare}
          disabled={!qrData?.payload}
          style={styles.shareButton}
        >
          Share QR Code
        </Button>

        <Button
          mode="outlined"
          icon="refresh"
          onPress={() => dispatch(generateQR())}
          loading={isLoading}
          style={styles.refreshButton}
        >
          Refresh
        </Button>
      </View>

      <Snackbar visible={!!error} onDismiss={() => dispatch(clearError())} duration={3000}>
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 16, color: '#666' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 10,
  },
  title: { fontWeight: 'bold' },
  content: { flex: 1, padding: 20, alignItems: 'center' },
  qrCard: { backgroundColor: '#FFFFFF', width: '100%', marginBottom: 20 },
  qrContent: { alignItems: 'center', paddingVertical: 30 },
  merchantName: { marginBottom: 24, color: '#333', fontWeight: '600' },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  noQrText: { color: '#999', textAlign: 'center' },
  hint: { color: '#666', textAlign: 'center', paddingHorizontal: 16 },
  shareButton: { width: '100%', marginBottom: 12, paddingVertical: 4 },
  refreshButton: { width: '100%' },
});

export default GenerateQRScreen;
