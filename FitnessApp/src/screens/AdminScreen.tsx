import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';

export default function AdminScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(data.filter((u: any) => !u.isAdmin));
      } catch (e: any) {
        Alert.alert('Permission Error', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const activeUsers = users.filter((u: any) =>
    u.lastWorkoutDate && u.lastWorkoutDate >= sevenDaysAgo
  );
  const inactiveUsers = users.filter((u: any) =>
    !u.lastWorkoutDate || u.lastWorkoutDate < sevenDaysAgo
  );

  const sendReminder = async (userId: string, userName: string) => {
    try {
      await addDoc(collection(db, 'notifications', userId, 'messages'), {
        message: `Hey ${userName}! 💪 Don't forget to keep up with your workout plan. You've got this!`,
        sentAt: new Date().toISOString(),
        read: false,
      });
      Alert.alert('Sent!', `Reminder sent to ${userName}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to send reminder');
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statCard, styles.statCardGreen]}>
          <Text style={styles.statValue}>{activeUsers.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, styles.statCardRed]}>
          <Text style={styles.statValue}>{inactiveUsers.length}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Active Users */}
      <Text style={styles.sectionTitle}>🟢 Active Users (last 7 days)</Text>
      {activeUsers.length === 0 && <Text style={styles.empty}>No active users</Text>}
      {activeUsers.map((u: any) => (
        <UserCard key={u.id} user={u} active={true} />
      ))}

      {/* Inactive Users */}
      <Text style={styles.sectionTitle}>🔴 Inactive Users</Text>
      {inactiveUsers.length === 0 && <Text style={styles.empty}>No inactive users</Text>}
      {inactiveUsers.map((u: any) => (
        <UserCard
          key={u.id}
          user={u}
          active={false}
          onRemind={() => sendReminder(u.id, u.name)}
        />
      ))}
    </ScrollView>
  );
}

const UserCard = ({ user, active, onRemind }: {
  user: any;
  active: boolean;
  onRemind?: () => void;
}) => (
  <View style={[styles.userCard, active ? styles.userCardActive : styles.userCardInactive]}>
    <View style={styles.userRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>
      <View style={[styles.badge, active ? styles.badgeGreen : styles.badgeRed]}>
        <Text style={styles.badgeText}>{active ? 'Active' : 'Inactive'}</Text>
      </View>
    </View>
    <View style={styles.userStats}>
      <Text style={styles.userStat}>🏋️ {user.totalWorkouts ?? 0} workouts</Text>
      <Text style={styles.userStat}>⚡ {user.xp ?? 0} XP</Text>
      <Text style={styles.userStat}>🎯 {user.goal ?? '-'}</Text>
    </View>
    <Text style={styles.lastSeen}>Last workout: {user.lastWorkoutDate ?? 'Never'}</Text>
    {!active && onRemind && (
      <TouchableOpacity style={styles.remindButton} onPress={onRemind}>
        <Text style={styles.remindButtonText}>Send Reminder 🔔</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f5f5f5' },
  content:          { padding: 24, paddingTop: 60 },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:            { fontSize: 26, fontWeight: 'bold' },
  logout:           { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  statsRow:         { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard:         { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  statCardGreen:    { backgroundColor: '#DCFCE7' },
  statCardRed:      { backgroundColor: '#FEE2E2' },
  statValue:        { fontSize: 28, fontWeight: 'bold' },
  statLabel:        { fontSize: 12, color: '#666', marginTop: 2 },
  sectionTitle:     { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  empty:            { color: '#999', fontStyle: 'italic', marginBottom: 12 },
  userCard:         { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 4 },
  userCardActive:   { borderLeftColor: '#22C55E' },
  userCardInactive: { borderLeftColor: '#EF4444' },
  userRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar:           { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:       { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  userInfo:         { flex: 1 },
  userName:         { fontSize: 15, fontWeight: '600' },
  userEmail:        { fontSize: 12, color: '#666' },
  badge:            { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  badgeGreen:       { backgroundColor: '#DCFCE7' },
  badgeRed:         { backgroundColor: '#FEE2E2' },
  badgeText:        { fontSize: 11, fontWeight: '600' },
  userStats:        { flexDirection: 'row', gap: 12, marginBottom: 6 },
  userStat:         { fontSize: 12, color: '#555' },
  lastSeen:         { fontSize: 11, color: '#999' },
  remindButton:     { backgroundColor: '#4F46E5', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  remindButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});