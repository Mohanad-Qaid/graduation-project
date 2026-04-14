import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';

const QRScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerActive, setScannerActive] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    return () => {
      setScannerActive(false);
    };
  }, []);

  const handleQRScanned = (data) => {
    if (!data || !scannerActive || processing) return;

    setScannerActive(false);
    setProcessing(true);

    try {
      const parsed = JSON.parse(data);

      // Validate the expected fields exist
      if (!parsed.merchantId || !parsed.businessName) {
        Alert.alert('Invalid QR Code', 'This QR code is not a valid E-Wallet merchant code.', [
          { text: 'Try Again', onPress: () => { setScannerActive(true); setProcessing(false); } },
        ]);
        return;
      }

      // Navigate to payment screen — customer enters amount there
      navigation.navigate('PaymentConfirm', {
        merchantId: parsed.merchantId,
        businessName: parsed.businessName,
      });
    } catch {
      Alert.alert('Invalid QR Code', 'Could not read this QR code.', [
        { text: 'Try Again', onPress: () => { setScannerActive(true); setProcessing(false); } },
      ]);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.statusText}>Requesting camera access…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionBody}>
          This screen needs camera access to scan merchant QR codes.
        </Text>
        <Button mode="contained" onPress={requestPermission} style={styles.permissionButton}>
          Grant Camera Access
        </Button>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button icon="arrow-left" textColor="#fff" onPress={() => navigation.goBack()}>Back</Button>
        <Text variant="titleLarge" style={styles.title}>Scan QR Code</Text>
        <View style={{ width: 80 }} />
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scannerActive && !processing ? ({ data }) => handleQRScanned(data) : undefined}
      >
        <View style={styles.overlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.hintText}>Point at a merchant QR code</Text>

          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#6200EE" />
              <Text style={styles.statusText}>Reading QR code…</Text>
            </View>
          )}

          {!scannerActive && !processing && (
            <Button
              mode="contained"
              onPress={() => { setScannerActive(true); setProcessing(false); }}
              style={styles.rescanButton}
            >
              Tap to Scan Again
            </Button>
          )}
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 10,
    backgroundColor: '#000',
    zIndex: 10,
  },
  title: { fontWeight: 'bold', color: '#FFFFFF' },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scannerFrame: { width: 250, height: 250, position: 'relative', marginBottom: 20 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#6200EE' },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  hintText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  processingOverlay: { marginTop: 20, alignItems: 'center' },
  rescanButton: { marginTop: 24, backgroundColor: '#6200EE' },
  centeredContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#000', padding: 24,
  },
  statusText: { color: '#FFFFFF', marginTop: 16, textAlign: 'center' },
  permissionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  permissionBody: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  permissionButton: { width: '100%', marginBottom: 12 },
  backButton: { width: '100%', borderColor: '#6200EE' },
});

export default QRScannerScreen;
