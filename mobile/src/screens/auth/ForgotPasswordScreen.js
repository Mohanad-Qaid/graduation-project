import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, StatusBar,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { sendOTP, resetPin, clearOtpState } from '../../store/slices/authSlice';
import OTPInput from '../../components/OTPInput';

const PURPLE_DARK = '#1A006B';
const PURPLE_MID  = '#4A0099';
const PURPLE_MAIN = '#6200EE';
const OTP_SECONDS = 180; // must match backend TTL

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(startSeconds, active) {
    const [remaining, setRemaining] = useState(startSeconds);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!active) { setRemaining(startSeconds); return; }
        setRemaining(startSeconds);
        intervalRef.current = setInterval(() => {
            setRemaining((s) => {
                if (s <= 1) { clearInterval(intervalRef.current); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [active, startSeconds]);

    return remaining;
}

// ── Main Screen ────────────────────────────────────────────────────────────────
const ForgotPasswordScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { otpLoading, otpError, otpSuccess } = useSelector((s) => s.auth);

    // Step: 1 = email entry, 2 = OTP verify, 3 = new PIN
    const [step, setStep]           = useState(1);
    const [email, setEmail]         = useState('');
    const [emailError, setEmailError] = useState('');
    const [digits, setDigits]       = useState(Array(6).fill(''));
    const [otpActive, setOtpActive] = useState(false);
    const [newPin, setNewPin]       = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError]   = useState('');
    const [localSuccess, setLocalSuccess] = useState(false);

    const countdown = useCountdown(OTP_SECONDS, otpActive);
    const code = digits.join('');
    const codeComplete = code.length === 6;

    // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
    const handleSendOTP = async () => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        setEmailError('');
        dispatch(clearOtpState());
        const result = await dispatch(sendOTP({ email: trimmed, purpose: 'reset' }));
        if (result.meta.requestStatus === 'fulfilled') {
            setStep(2);
            setOtpActive(true);
        }
    };

    // ── Resend ────────────────────────────────────────────────────────────────
    const handleResend = () => {
        setDigits(Array(6).fill(''));
        dispatch(clearOtpState());
        const trimmed = email.trim().toLowerCase();
        dispatch(sendOTP({ email: trimmed, purpose: 'reset', isResend: true }));
        setOtpActive(false);
        setTimeout(() => setOtpActive(true), 50);
    };

    // ── Step 2 → Step 3 ───────────────────────────────────────────────────────
    const handleVerifyOTP = async () => {
        if (!codeComplete) return;
        // We don't call verify-email here; OTP is verified atomically in reset-password.
        // Just advance to step 3 with the code held in state.
        dispatch(clearOtpState());
        setStep(3);
        setOtpActive(false);
    };

    // ── Step 3 → Done ─────────────────────────────────────────────────────────
    const handleReset = async () => {
        if (newPin.length !== 6) {
            setPinError('PIN must be exactly 6 digits.');
            return;
        }
        if (newPin !== confirmPin) {
            setPinError('PINs do not match. Please re-enter.');
            return;
        }
        setPinError('');
        dispatch(clearOtpState());
        const result = await dispatch(resetPin({
            email: email.trim().toLowerCase(),
            code,
            newPin,
        }));
        if (result.meta.requestStatus === 'fulfilled') {
            setLocalSuccess(true);
        }
    };

    // Auto-navigate back to Login after success
    useEffect(() => {
        if (localSuccess) {
            const t = setTimeout(() => {
                dispatch(clearOtpState());
                navigation.replace('Login');
            }, 2000);
            return () => clearTimeout(t);
        }
    }, [localSuccess]);

    // Cleanup on unmount
    useEffect(() => () => { dispatch(clearOtpState()); }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const timerRunning = countdown > 0 && otpActive;
    const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
    const ss = String(countdown % 60).padStart(2, '0');

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.blob1} />
                <View style={styles.blob2} />
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => {
                        if (step > 1 && !localSuccess) { setStep(s => s - 1); }
                        else { navigation.goBack(); }
                    }}
                >
                    <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>Forgot PIN</Text>
                    <Text style={styles.headerSub}>
                        {step === 1 && 'Enter your registered email'}
                        {step === 2 && 'Enter the 6-digit code'}
                        {step === 3 && 'Set your new PIN'}
                    </Text>
                </View>
                {/* Step indicator */}
                <View style={styles.stepRow}>
                    {[1, 2, 3].map((s) => (
                        <View
                            key={s}
                            style={[styles.stepDot, step >= s && styles.stepDotActive]}
                        />
                    ))}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── STEP 1: Email ─────────────────────────────────────── */}
                {step === 1 && (
                    <View style={styles.card}>
                        <Icon name="email-outline" size={36} color={PURPLE_MAIN} style={styles.cardIcon} />
                        <Text style={styles.cardTitle}>Email Address</Text>
                        <Text style={styles.cardDesc}>
                            Enter the email you registered with. We'll send a 6-digit code to verify it's you.
                        </Text>

                        <TextInput
                            label="Email"
                            value={email}
                            onChangeText={(v) => { setEmail(v); setEmailError(''); dispatch(clearOtpState()); }}
                            mode="outlined"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            style={styles.input}
                            outlineColor="#E0E0E0"
                            activeOutlineColor={PURPLE_MAIN}
                            left={<TextInput.Icon icon="email-outline" color={PURPLE_MAIN} />}
                            error={!!emailError || !!otpError}
                        />
                        {(emailError || otpError) && (
                            <View style={styles.errorBanner}>
                                <Icon name="alert-circle-outline" size={15} color="#B71C1C" />
                                <Text style={styles.errorText}>{emailError || otpError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.btn, otpLoading && styles.btnDisabled]}
                            onPress={handleSendOTP}
                            disabled={otpLoading}
                            activeOpacity={0.85}
                        >
                            {otpLoading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.btnText}>Send Code</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── STEP 2: OTP ───────────────────────────────────────── */}
                {step === 2 && (
                    <View style={styles.card}>
                        <Icon name="shield-key-outline" size={36} color={PURPLE_MAIN} style={styles.cardIcon} />
                        <Text style={styles.cardTitle}>Verify Code</Text>
                        <Text style={styles.cardDesc}>
                            A code was sent to <Text style={styles.emailHighlight}>{email}</Text>.
                            Enter it below.
                        </Text>

                        <OTPInput
                            value={digits}
                            onChange={setDigits}
                            disabled={otpLoading}
                        />

                        {/* Timer + Resend */}
                        <View style={styles.timerRow}>
                            <Text style={styles.timerText}>
                                {timerRunning ? `Expires in ${mm}:${ss}` : 'Code expired'}
                            </Text>
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={otpLoading}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.resendText,
                                    timerRunning && styles.resendTextDimmed,
                                ]}>
                                    Resend Code
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {otpError && (
                            <View style={styles.errorBanner}>
                                <Icon name="alert-circle-outline" size={15} color="#B71C1C" />
                                <Text style={styles.errorText}>{otpError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.btn, (!codeComplete || otpLoading) && styles.btnDisabled]}
                            onPress={handleVerifyOTP}
                            disabled={!codeComplete || otpLoading}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.btnText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── STEP 3: New PIN ───────────────────────────────────── */}
                {step === 3 && !localSuccess && (
                    <View style={styles.card}>
                        <Icon name="lock-reset" size={36} color={PURPLE_MAIN} style={styles.cardIcon} />
                        <Text style={styles.cardTitle}>New PIN</Text>
                        <Text style={styles.cardDesc}>
                            Choose a new 6-digit PIN for your account.
                        </Text>

                        <TextInput
                            label="New PIN"
                            value={newPin}
                            onChangeText={(v) => { setNewPin(v.replace(/\D/g, '').slice(0, 6)); setPinError(''); dispatch(clearOtpState()); }}
                            mode="outlined"
                            keyboardType="numeric"
                            maxLength={6}
                            secureTextEntry
                            style={styles.input}
                            outlineColor="#E0E0E0"
                            activeOutlineColor={PURPLE_MAIN}
                            left={<TextInput.Icon icon="lock-outline" color={PURPLE_MAIN} />}
                        />
                        <TextInput
                            label="Confirm PIN"
                            value={confirmPin}
                            onChangeText={(v) => { setConfirmPin(v.replace(/\D/g, '').slice(0, 6)); setPinError(''); dispatch(clearOtpState()); }}
                            mode="outlined"
                            keyboardType="numeric"
                            maxLength={6}
                            secureTextEntry
                            style={[styles.input, { marginTop: 12 }]}
                            outlineColor="#E0E0E0"
                            activeOutlineColor={PURPLE_MAIN}
                            left={<TextInput.Icon icon="lock-check-outline" color={PURPLE_MAIN} />}
                            error={!!pinError || !!otpError}
                        />

                        {(pinError || otpError) && (
                            <View style={styles.errorBanner}>
                                <Icon name="alert-circle-outline" size={15} color="#B71C1C" />
                                <Text style={styles.errorText}>{pinError || otpError}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.btn, (otpLoading || newPin.length < 6 || confirmPin.length < 6) && styles.btnDisabled]}
                            onPress={handleReset}
                            disabled={otpLoading || newPin.length < 6 || confirmPin.length < 6}
                            activeOpacity={0.85}
                        >
                            {otpLoading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.btnText}>Reset PIN</Text>
                            }
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Success ───────────────────────────────────────────── */}
                {localSuccess && (
                    <View style={styles.successCard}>
                        <Icon name="check-circle-outline" size={56} color="#2E7D32" />
                        <Text style={styles.successTitle}>PIN Reset!</Text>
                        <Text style={styles.successDesc}>
                            Your PIN has been updated. Redirecting to login…
                        </Text>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F4F5FB' },

    /* Header */
    header: {
        backgroundColor: PURPLE_DARK,
        paddingTop: 52, paddingBottom: 28, paddingHorizontal: 22,
        borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
        overflow: 'hidden',
    },
    blob1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: PURPLE_MID, opacity: 0.4, top: -60, right: -50,
    },
    blob2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: PURPLE_MAIN, opacity: 0.25, bottom: -30, left: 30,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    headerTextWrap: { marginBottom: 16 },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
    stepRow: { flexDirection: 'row', gap: 8 },
    stepDot: {
        width: 28, height: 5, borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    stepDotActive: { backgroundColor: '#fff' },

    /* Body */
    body: { padding: 20, paddingTop: 24 },

    /* Card */
    card: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 24,
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05,
        shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    },
    cardIcon: { alignSelf: 'center', marginBottom: 12 },
    cardTitle: {
        textAlign: 'center', fontSize: 18, fontWeight: '800',
        color: PURPLE_DARK, marginBottom: 8,
    },
    cardDesc: {
        textAlign: 'center', fontSize: 13, color: '#777',
        lineHeight: 20, marginBottom: 24,
    },
    emailHighlight: { fontWeight: '700', color: PURPLE_DARK },

    /* Input */
    input: { backgroundColor: '#fff', marginBottom: 4 },

    /* Error banner */
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFEBEE', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8,
        marginTop: 8, marginBottom: 4,
    },
    errorText: { flex: 1, color: '#B71C1C', fontSize: 13 },

    /* Timer / Resend */
    timerRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginTop: 16, marginBottom: 4,
    },
    timerText: { fontSize: 12, color: '#999' },
    resendText: { fontSize: 13, fontWeight: '700', color: PURPLE_MAIN },
    resendTextDimmed: { color: '#BBBBBB', fontWeight: '400' },

    /* Button */
    btn: {
        backgroundColor: PURPLE_MAIN, borderRadius: 16,
        paddingVertical: 15, alignItems: 'center', marginTop: 20,
        elevation: 4, shadowColor: PURPLE_MAIN,
        shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    btnDisabled: { backgroundColor: '#C5B4E3', elevation: 0, shadowOpacity: 0 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    /* Success */
    successCard: {
        backgroundColor: '#fff', borderRadius: 22, padding: 36,
        alignItems: 'center',
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
        shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: '#2E7D32', marginTop: 16 },
    successDesc: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});

export default ForgotPasswordScreen;
