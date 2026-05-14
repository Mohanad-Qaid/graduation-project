import React, { useRef, useCallback } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';

const PURPLE_MAIN = '#6200EE';
const BOX_SIZE    = 48;

/**
 * 6-box OTP input component.
 *
 * Props:
 *   value        string[6]  — controlled array of digit chars ('' for empty)
 *   onChange     (newDigits: string[]) => void
 *   disabled?    boolean
 */
const OTPInput = ({ value = [], onChange, disabled = false }) => {
    const refs = useRef([]);

    const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

    const focusBox = useCallback((index) => {
        const clamped = Math.max(0, Math.min(5, index));
        refs.current[clamped]?.focus();
    }, []);

    const handleChange = useCallback((text, index) => {
        // Strip non-digits and enforce max 1 char
        const cleaned = text.replace(/\D/g, '');

        if (cleaned.length === 0) {
            // Backspace / clear
            const next = [...digits];
            next[index] = '';
            onChange(next);
            return;
        }

        // Handle paste: if user pastes 6 digits at once
        if (cleaned.length >= 6) {
            const next = cleaned.slice(0, 6).split('');
            onChange(next);
            focusBox(5);
            return;
        }

        // Single digit — fill current box and advance
        const next = [...digits];
        next[index] = cleaned[0];
        onChange(next);

        if (index < 5) {
            focusBox(index + 1);
        }
    }, [digits, onChange, focusBox]);

    const handleKeyPress = useCallback(({ nativeEvent }, index) => {
        if (nativeEvent.key === 'Backspace') {
            if (digits[index] === '' && index > 0) {
                // Box is already empty — clear previous box and move back
                const next = [...digits];
                next[index - 1] = '';
                onChange(next);
                focusBox(index - 1);
            } else {
                // Clear current box in-place (handleChange will fire too, that's fine)
                const next = [...digits];
                next[index] = '';
                onChange(next);
            }
        }
    }, [digits, onChange, focusBox]);

    return (
        <View style={styles.row}>
            {digits.map((digit, index) => {
                const isFilled  = digit !== '';
                const isActive  = false; // visual state managed by focus events

                return (
                    <Pressable key={index} onPress={() => focusBox(index)}>
                        <TextInput
                            ref={(el) => { refs.current[index] = el; }}
                            style={[
                                styles.box,
                                isFilled && styles.boxFilled,
                                disabled && styles.boxDisabled,
                            ]}
                            value={digit}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="numeric"
                            maxLength={6}  // allow paste of full code
                            selectTextOnFocus
                            editable={!disabled}
                            textContentType="oneTimeCode"   // iOS SMS autofill
                            autoComplete="sms-otp"          // Android SMS autofill
                            caretHidden
                        />
                    </Pressable>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
    },
    box: {
        width: BOX_SIZE,
        height: BOX_SIZE + 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DDD',
        backgroundColor: '#F9F7FF',
        fontSize: 22,
        fontWeight: '800',
        color: '#1A006B',
        textAlign: 'center',
    },
    boxFilled: {
        borderColor: PURPLE_MAIN,
        backgroundColor: '#EDE7F6',
    },
    boxDisabled: {
        opacity: 0.5,
    },
});

export default OTPInput;
