import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';

const getLevelInfo = (xp: number) => {
  if (xp >= 1500) return { level: 'Legend', emoji: '👑', next: null, current: 1500 };
  if (xp >= 700) return { level: 'Champion', emoji: '🥇', next: 1500, current: 700 };
  if (xp >= 300) return { level: 'Athlete', emoji: '🥈', next: 700, current: 300 };
  return { level: 'Rookie', emoji: '🥉', next: 300, current: 0 };
};

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      setUserData(snap.data());
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const totalHours = userData?.totalSeconds ? Math.floor(userData.totalSeconds / 3600) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        {userData?.photoURL ? (
          <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{userData?.name}</Text>
        <Text style={styles.email}>{userData?.email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{userData?.totalWorkouts ?? 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{userData?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalHours}h</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>

      {/* XP Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Level & XP</Text>
        <View style={styles.xpCard}>
          {(() => {
            const xp = userData?.xp ?? 0;
            const info = getLevelInfo(xp);
            const progress = info.next
              ? ((xp - info.current) / (info.next - info.current)) * 100
              : 100;
            return (
              <>
                <View style={styles.xpHeader}>
                  <Text style={styles.xpLevel}>{info.emoji} {info.level}</Text>
                  <Text style={styles.xpValue}>{xp} XP</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.xpNext}>
                  {info.next
                    ? `${info.next - xp} XP to next level`
                    : 'Max level reached! 👑'}
                </Text>
              </>
            );
          })()}
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Profile</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Goal"             value={userData?.goal} />
          <InfoRow label="Level"            value={userData?.level} />
          <InfoRow label="Equipment"        value={userData?.equipment} />
          <InfoRow label="Days per week"    value={`${userData?.daysPerWeek} days`} />
          <InfoRow label="Session duration" value={`${userData?.sessionDuration} min`} last />
        </View>
      </View>

      {/* Settings Button */}
      <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.settingsText}>⚙️ Settings</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const InfoRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
  <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f5f5f5' },
  content:          { padding: 24, paddingTop: 60 },
  avatarSection:    { alignItems: 'center', marginBottom: 24 },
  avatarImage:      { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText:       { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name:             { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  email:            { fontSize: 14, color: '#666' },
  statsRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox:          { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  statValue:        { fontSize: 22, fontWeight: 'bold' },
  statLabel:        { fontSize: 12, color: '#666', marginTop: 2 },
  section:          { marginBottom: 24 },
  sectionTitle:     { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  xpCard:           { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  xpHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  xpLevel:          { fontSize: 18, fontWeight: 'bold' },
  xpValue:          { fontSize: 16, fontWeight: '600', color: '#4F46E5' },
  progressBarBg:    { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, marginBottom: 8 },
  progressBarFill:  { height: 8, backgroundColor: '#4F46E5', borderRadius: 4 },
  xpNext:           { fontSize: 13, color: '#666' },
  infoCard:         { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  infoRowBorder:    { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel:        { fontSize: 15, color: '#666' },
  infoValue:        { fontSize: 15, fontWeight: '600' },
  settingsButton:   { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#4F46E5', marginBottom: 12 },
  settingsText:     { color: '#4F46E5', fontSize: 16, fontWeight: '600' },
  logoutButton:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#EF4444' },
  logoutText:       { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});