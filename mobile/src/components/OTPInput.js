import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';

const PURPLE_MAIN = '#6200EE';
const BOX_SIZE = 48;

/**
 * 6-box OTP input component.
 * Uses a single hidden TextInput and 6 View boxes for zero-lag typing.
 */
const OTPInput = ({ value = [], onChange, disabled = false }) => {
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    // Convert array value to string for the hidden input
    const codeString = value.join('');

    const handleChange = (text) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 6);
        const nextArray = cleaned.split('');

        // Pad the array with empty strings to maintain length of 6
        while (nextArray.length < 6) {
            nextArray.push('');
        }
        onChange(nextArray);
    };

    const handlePress = () => {
        if (!disabled && inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <View style={styles.container}>
            <Pressable
                style={styles.row}
                onPress={handlePress}
                activeOpacity={1}
            >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = value[index] || '';
                    const isFilled = digit !== '';
                    // The box is "active" if it's the first empty box, or if all are filled and it's the last box
                    const isActive = isFocused && !disabled && (
                        (index === codeString.length && index < 6) ||
                        (index === 5 && codeString.length === 6)
                    );

                    return (
                        <View
                            key={index}
                            style={[
                                styles.box,
                                isFilled && styles.boxFilled,
                                isActive && styles.boxActive,
                                disabled && styles.boxDisabled,
                            ]}
                        >
                            <Text style={styles.boxText}>{digit}</Text>
                        </View>
                    );
                })}
            </Pressable>

            {/* Hidden Input covering the entire component */}
            <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={codeString}
                onChangeText={handleChange}
                keyboardType="numeric"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                editable={!disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoFocus
                caretHidden={true}
                selection={{ start: codeString.length, end: codeString.length }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        position: 'relative', // so the absolute input stays within
    },
    row: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
        width: '100%',
    },
    box: {
        width: BOX_SIZE,
        height: BOX_SIZE + 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DDD',
        backgroundColor: '#F9F7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    boxFilled: {
        borderColor: PURPLE_MAIN,
        backgroundColor: '#EDE7F6',
    },
    boxActive: {
        borderColor: PURPLE_MAIN,
        borderWidth: 2,
    },
    boxDisabled: {
        opacity: 0.5,
    },
    boxText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A006B',
    },
    hiddenInput: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0, // Natively hidden but fully intercepts taps
        color: 'transparent',
    },
});

export default OTPInput;
