import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export default function ProgressScreen() {
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

  const totalHours = userData?.totalSeconds
    ? Math.floor(userData.totalSeconds / 3600)
    : 0;
  const totalMins = userData?.totalSeconds
    ? Math.floor((userData.totalSeconds % 3600) / 60)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardPurple]}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValueLarge}>{userData?.totalWorkouts ?? 0}</Text>
          <Text style={styles.statLabelWhite}>Total Workouts</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWhite]}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statValueDark}>{userData?.streak ?? 0}</Text>
          <Text style={styles.statLabelGray}>Day Streak</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWhite]}>
          <Text style={styles.statEmoji}>⏱️</Text>
          <Text style={styles.statValueDark}>{totalHours}h {totalMins}m</Text>
          <Text style={styles.statLabelGray}>Total Time</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWhite]}>
          <Text style={styles.statEmoji}>🎯</Text>
          <Text style={styles.statValueDark}>{userData?.goal ?? '-'}</Text>
          <Text style={styles.statLabelGray}>Goal</Text>
        </View>
      </View>

      {/* Weekly Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Goal</Text>
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyText}>
              {userData?.totalWorkouts ?? 0} / {userData?.daysPerWeek ?? 3} workouts
            </Text>
            <Text style={styles.weeklyPercent}>
              {Math.min(100, Math.round(((userData?.totalWorkouts ?? 0) / (userData?.daysPerWeek ?? 3)) * 100))}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: `${Math.min(100, Math.round(((userData?.totalWorkouts ?? 0) / (userData?.daysPerWeek ?? 3)) * 100))}%`
            }]} />
          </View>
        </View>
      </View>

      {/* Profile Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Stats</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Fitness Level" value={userData?.level ?? '-'} />
          <InfoRow label="Equipment" value={userData?.equipment ?? '-'} />
          <InfoRow label="Days per week" value={`${userData?.daysPerWeek ?? '-'} days`} />
          <InfoRow label="Session duration" value={`${userData?.sessionDuration ?? '-'} min`} last />
        </View>
      </View>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', borderRadius: 16, padding: 16 },
  statCardPurple: { backgroundColor: '#4F46E5' },
  statCardWhite: { backgroundColor: '#fff' },
  statEmoji: { fontSize: 24, marginBottom: 8 },
  statValueLarge: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  statValueDark: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  statLabelWhite: { fontSize: 13, color: '#C7D2FE', marginTop: 2 },
  statLabelGray: { fontSize: 13, color: '#666', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  weeklyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weeklyText: { fontSize: 15, fontWeight: '600' },
  weeklyPercent: { fontSize: 15, fontWeight: '600', color: '#4F46E5' },
  progressBarBg: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: '#4F46E5', borderRadius: 4 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { fontSize: 15, color: '#666' },
  infoValue: { fontSize: 15, fontWeight: '600' },
});