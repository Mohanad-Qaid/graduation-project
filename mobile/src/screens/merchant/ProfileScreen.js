import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, TextInput, Button, Avatar, Divider, List } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { logout, updateProfile } from '../../store/slices/authSlice';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const handleSaveProfile = () => {
    dispatch(updateProfile({ fullName, phone, businessName }))
      .unwrap()
      .then(() => {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      })
      .catch((error) => {
        Alert.alert('Error', error);
      });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Profile
        </Text>
      </View>

      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text
            size={80}
            label={getInitials(user?.businessName || user?.fullName)}
            style={styles.avatar}
          />
          <Text variant="titleLarge" style={styles.userName}>
            {user?.businessName || user?.fullName}
          </Text>
          <Text variant="bodyMedium" style={styles.userEmail}>
            {user?.email}
          </Text>
          <View style={styles.statusBadge}>
            <Icon name="store" size={16} color="#FFFFFF" />
            <Text style={styles.statusText}>Merchant Account</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium">Business Information</Text>
            <Button
              mode="text"
              onPress={() => setIsEditing(!isEditing)}
              compact
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </View>

          {isEditing ? (
            <>
              <TextInput
                label="Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Owner Name"
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleSaveProfile}
                loading={isLoading}
                style={styles.saveButton}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <List.Item
                title="Business Name"
                description={user?.businessName || 'Not set'}
                left={(props) => <List.Icon {...props} icon="store" />}
              />
              <Divider />
              <List.Item
                title="Owner Name"
                description={user?.fullName}
                left={(props) => <List.Icon {...props} icon="account" />}
              />
              <Divider />
              <List.Item
                title="Email"
                description={user?.email}
                left={(props) => <List.Icon {...props} icon="email" />}
              />
              <Divider />
              <List.Item
                title="Phone"
                description={user?.phone || 'Not set'}
                left={(props) => <List.Icon {...props} icon="phone" />}
              />
              <Divider />
              <List.Item
                title="Member Since"
                description={new Date(user?.createdAt).toLocaleDateString()}
                left={(props) => <List.Icon {...props} icon="calendar" />}
              />
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.menuCard}>
        <Card.Content>
          <List.Item
            title="Bank Account Settings"
            left={(props) => <List.Icon {...props} icon="bank" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <Divider />
          <List.Item
            title="Notification Settings"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon')}
          />
          <Divider />
          <List.Item
            title="Help & Support"
            left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Support', 'Contact support@ewallet.com')}
          />
          <Divider />
          <List.Item
            title="About"
            left={(props) => <List.Icon {...props} icon="information-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('E-Wallet', 'Version 1.0.0')}
          />
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#F44336"
      >
        Logout
      </Button>
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
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#6200EE',
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  userEmail: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  statusText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 12,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    marginTop: 8,
  },
  menuCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderColor: '#F44336',
  },
});

export default ProfileScreen;
