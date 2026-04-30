import React, { useEffect, useState } from 'react';
import {
    View, StyleSheet, FlatList,
    TouchableOpacity, StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getAllNotifications, markNotificationsRead } from '../../services/offlineDb';

const PURPLE_DARK = '#1A006B';
const PURPLE_MAIN = '#4A148C';

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

const NotificationsScreen = ({ navigation }) => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        (async () => {
            const all = await getAllNotifications();
            setNotifications(all);
            // Mark all as read as soon as the screen opens
            await markNotificationsRead();
        })();
    }, []);

    const renderItem = ({ item }) => {
        const isApproved = item.title?.includes('Approved');
        return (
            <View style={styles.card}>
                <View style={[styles.iconCircle, { backgroundColor: isApproved ? '#E8F5E9' : '#FFEBEE' }]}>
                    <Icon
                        name={isApproved ? 'check-circle' : 'close-circle'}
                        size={22}
                        color={isApproved ? '#2E7D32' : '#C62828'}
                    />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardBody}>{item.body}</Text>
                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />

            {/* Hero Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <Text style={styles.headerSub}>Withdrawal status updates</Text>
                </View>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id?.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="bell-off-outline" size={64} color="#D1C4E9" />
                        <Text style={styles.emptyTitle}>No Notifications</Text>
                        <Text style={styles.emptyText}>
                            You'll be notified here when your withdrawal requests are approved or rejected.
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F4F5FB' },

    header: {
        backgroundColor: PURPLE_DARK,
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 28,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backBtn:     { marginRight: 14 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    listContent: { padding: 16, paddingBottom: 32 },

    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        flexShrink: 0,
    },
    cardContent: { flex: 1 },
    cardTitle:   { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
    cardBody:    { fontSize: 13, color: '#424242', lineHeight: 19 },
    cardDate:    { fontSize: 11, color: '#9E9E9E', marginTop: 6 },

    emptyContainer: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
    emptyTitle:     { fontSize: 16, fontWeight: '700', color: PURPLE_MAIN, marginTop: 16 },
    emptyText:      { fontSize: 13, color: '#9E9E9E', marginTop: 8, textAlign: 'center', lineHeight: 20 },
});

export default NotificationsScreen;
