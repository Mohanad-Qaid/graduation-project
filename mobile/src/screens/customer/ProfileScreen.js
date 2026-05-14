import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TouchableOpacity,
  StatusBar,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { logout } from '../../store/slices/authSlice';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PURPLE_DARK = '#1A006B';
const PURPLE_MID = '#4A0099';
const PURPLE_MAIN = '#6200EE';

const getInitials = (firstName, lastName) => {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
};

/* ─── Accordion Item ───────────────────────────────────────────────────────── */
const AccordionItem = ({ icon, label, children }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View>
      <TouchableOpacity style={styles.menuRow} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.menuIcon}>
          <Icon name={icon} size={18} color={PURPLE_MAIN} />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#CCCCCC" />
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
};

/* ─── Main Screen ──────────────────────────────────────────────────────────── */
const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  const handleLogout = () => dispatch(logout());

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {getInitials(user?.first_name, user?.last_name)}
            </Text>
          </View>
          <Text style={styles.heroName} numberOfLines={1}>{fullName || 'Your Name'}</Text>
        </View>

        {/* ── Single unified card ── */}
        <View style={styles.card}>

          <AccordionItem icon="account-circle-outline" label="My Details">
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Full Name</Text>
              <Text style={styles.formValue}>{fullName || '—'}</Text>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Email Address</Text>
              <Text style={styles.formValue}>{user?.email || '—'}</Text>
            </View>
            <View style={[styles.formField, { borderBottomWidth: 0 }]}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <Text style={styles.formValue}>{user?.phone || 'Not set'}</Text>
            </View>
          </AccordionItem>

          <Divider style={styles.divider} />

          <AccordionItem icon="file-document-outline" label="Terms of Service">
            <Text style={styles.accordionText}>
              <Text style={styles.accordionHeading}>Account Security{'\n'}</Text>
              You are responsible for keeping your credentials safe. Any actions taken under your account are considered authorized by you. Please use strong passwords and secure your device.{'\n\n'}
              <Text style={styles.accordionHeading}>Dynamic Transactions{'\n'}</Text>
              Payments are facilitated seamlessly by scanning a merchant's designated QR code. The user maintains full control by manually entering the desired payment amount. Once a transfer is confirmed by the user, it is instantly settled and final.{'\n\n'}
              <Text style={styles.accordionHeading}>Acceptable Use{'\n'}</Text>
              This platform is strictly for lawful transactions. If unusual or suspicious activity is detected within the system, the event is immediately flagged for our administrative team. Administrators will review the activity and take appropriate actions to secure the account if necessary.
            </Text>
          </AccordionItem>

          <Divider style={styles.divider} />

          <AccordionItem icon="shield-lock-outline" label="Privacy Policy">
            <Text style={styles.accordionText}>
              <Text style={styles.accordionHeading}>Data Protection{'\n'}</Text>
              Your data belongs to you. We strictly collect only the information necessary to process your payments securely and verify your identity. We do not sell your personal information to third parties.{'\n\n'}
              <Text style={styles.accordionHeading}>Intelligent Transaction Monitoring{'\n'}</Text>
              To protect your funds, transaction patterns are evaluated Powered by AI. This system helps identify anomalous behavior and flags unusual activity, ensuring our administrative team can review and secure the ecosystem.{'\n\n'}
              <Text style={styles.accordionHeading}>Data Security{'\n'}</Text>
              Your data is protected using industry-standard security measures and encrypted communication channels. We prioritize the safety of your personal and financial information, ensuring secure routing between the application and our servers.
            </Text>
          </AccordionItem>

          <Divider style={styles.divider} />

          <AccordionItem icon="help-circle-outline" label="Help & Support">
            <Text style={styles.accordionText}>
              <Text style={styles.accordionHeading}>Need Assistance?{'\n'}</Text>
              Our support team is ready to help you resolve transaction issues, account lockouts, or technical glitches.{'\n\n'}
              📧 Email: support@ewallet.app{'\n'}
              📞 Phone: +90 212 000 0000
            </Text>
          </AccordionItem>

          <Divider style={styles.divider} />

          <AccordionItem icon="information-outline" label="About The Wallet">
            <Text style={styles.accordionText}>
              This wallet is a secure digital solution designed to help you manage your money with ease. Store funds, track your transaction history, and perform dynamic merchant payments quickly and reliably.{'\n\n'}
              We focus on simplicity, security, and performance to ensure a flawless user experience. Your data is protected using encryption, AI-fraud detection and security practices.{'\n\n'}
              <Text style={styles.accordionHeading}>Version Info{'\n'}</Text>
              App Version: 1.0.0{'\n'}
              Platform: iOS & Android{'\n'}
              Last Updated: April 2026{'\n\n'}
              <Text style={styles.accordionHeading}>Developed by{'\n'}</Text>
              Mohanad
            </Text>
          </AccordionItem>

        </View>

        {/* ── Logout button ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.85}
        >
          <Icon name="logout-variant" size={18} color="#EF5350" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Logout Confirmation Modal ── */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLogoutModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Icon name="logout-variant" size={28} color={PURPLE_MAIN} />
            </View>
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalSubtitle}>
              You will be signed out. You can sign back in with your PIN or email anytime.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalLogoutBtn}
                onPress={() => { setLogoutModalVisible(false); handleLogout(); }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalLogoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5FB' },

  hero: {
    backgroundColor: PURPLE_DARK,
    paddingTop: 84, paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: PURPLE_MID, opacity: 0.4, top: -60, right: -50,
  },
  blob2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: PURPLE_MAIN, opacity: 0.25, bottom: -30, left: 40,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  heroName: { color: '#fff', fontSize: 20, fontWeight: '700', maxWidth: '80%' },

  card: {
    backgroundColor: '#fff', borderRadius: 22,
    marginHorizontal: 20, marginTop: 16, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },

  /* accordion */
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#EDE7F6', justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  accordionBody: {
    backgroundColor: '#F9F7FF', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: PURPLE_MAIN,
  },
  accordionText: { fontSize: 13, color: '#555', lineHeight: 21 },
  accordionHeading: { fontWeight: '700', color: '#1A1A2E', fontSize: 13 },

  /* read-only form fields inside accordion */
  formField: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  formLabel: {
    fontSize: 11, color: '#ABABAB', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  formValue: { fontSize: 15, color: '#1A1A2E', fontWeight: '500', marginTop: 3 },

  divider: { backgroundColor: '#F0F0F0' },

  /* logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, backgroundColor: '#fff',
    paddingVertical: 15, borderRadius: 22,
    marginHorizontal: 20, borderWidth: 1.5, borderColor: '#EF5350', elevation: 1,
  },
  logoutText: { color: '#EF5350', fontSize: 15, fontWeight: '700' },

  /* Logout confirmation modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    width: '100%', alignItems: 'center',
    elevation: 16, shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EDE7F6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: PURPLE_DARK, marginBottom: 8 },
  modalSubtitle: {
    fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24,
  },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#555' },
  modalLogoutBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: PURPLE_DARK, alignItems: 'center',
  },
  modalLogoutText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ProfileScreen;
