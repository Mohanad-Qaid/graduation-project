import React, { useEffect } from 'react';
import {
  View, StyleSheet, Share, StatusBar, TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { generateQR, clearError } from '../../store/slices/transactionSlice';

const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';

const GenerateQRScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { qrData, isLoading, error } = useSelector((state) => state.transactions);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(generateQR());
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const displayName = user?.business_name
    || `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  const handleShare = async () => {
    if (qrData?.payload) {
      try {
        await Share.share({ message: `Pay ${displayName} using the Wallet app. Scan their QR code in the app.` });
      } catch (e) { }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PURPLE_MAIN} />
        <Text style={styles.loadingText}>Loading your QR code…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

      {/* ── Banner Header ── */}
      <View style={styles.banner}>
        <View style={styles.bannerBlob1} />
        <View style={styles.bannerBlob2} />
        <View style={styles.bannerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.bannerTitle}>My QR Code</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.bannerSub}>{displayName}</Text>
      </View>

      {/* ── QR Card ── */}
      <View style={styles.content}>
        <View style={styles.qrCard}>
          <View style={styles.qrFrame}>
            {qrData?.payload ? (
              <QRCode
                value={qrData.payload}
                size={220}
                backgroundColor="#FFFFFF"
                color="#1A1A2E"
              />
            ) : (
              <View style={styles.noQrWrap}>
                <Icon name="qrcode-remove" size={60} color="#CCC" />
                <Text style={styles.noQrText}>No QR code available</Text>
              </View>
            )}
          </View>
          <Text style={styles.hint}>
            Show this to your customer. They scan it and enter the amount.
          </Text>
        </View>

        {/* ── Actions ── */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn, !qrData?.payload && { opacity: 0.5 }]}
          onPress={handleShare}
          disabled={!qrData?.payload}
          activeOpacity={0.85}
        >
          <Icon name="share-variant" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Share QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.secondaryBtn]}
          onPress={() => dispatch(generateQR())}
          activeOpacity={0.85}
        >
          <Icon name="refresh" size={18} color={PURPLE_MAIN} />
          <Text style={styles.secondaryBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <Snackbar visible={!!error} onDismiss={() => dispatch(clearError())} duration={3000}>
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F5FB' },
  loadingText: { marginTop: 16, color: '#666' },

  banner: {
    backgroundColor: PURPLE_DARK,
    paddingBottom: 24, overflow: 'hidden',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  bannerBlob1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: PURPLE_MID, opacity: 0.4, top: -40, right: -30,
  },
  bannerBlob2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: PURPLE_MAIN, opacity: 0.25, bottom: -20, left: 20,
  },
  bannerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, marginBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', paddingBottom: 4 },

  content: { flex: 1, padding: 20, alignItems: 'center' },

  qrCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%',
    alignItems: 'center', marginTop: 16, marginBottom: 20,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  qrFrame: {
    padding: 20, borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
    marginBottom: 20,
  },
  noQrWrap: { alignItems: 'center', paddingVertical: 20 },
  noQrText: { color: '#999', marginTop: 10 },
  hint: { color: '#777', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 15, width: '100%', marginBottom: 12,
  },
  primaryBtn: { backgroundColor: PURPLE_MAIN },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { borderWidth: 1.5, borderColor: PURPLE_MAIN, backgroundColor: '#fff' },
  secondaryBtnText: { color: PURPLE_MAIN, fontSize: 15, fontWeight: '700' },
});

export default GenerateQRScreen;
