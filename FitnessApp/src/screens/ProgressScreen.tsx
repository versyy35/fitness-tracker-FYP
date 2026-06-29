import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useFocusEffect } from '@react-navigation/native';

export default function ProgressScreen() {
  const [userData, setUserData] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    const fetchUser = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      setUserData(snap.data());
    };
    fetchUser();
  }, []));

  const totalHours = userData?.totalSeconds ? Math.floor(userData.totalSeconds / 3600) : 0;
  const totalMins  = userData?.totalSeconds ? Math.floor((userData.totalSeconds % 3600) / 60) : 0;

  const weeklyWorkouts = userData?.weeklyWorkouts ?? 0;
  const daysPerWeek    = userData?.daysPerWeek ?? 3;
  const weeklyPercent  = Math.min(100, Math.round((weeklyWorkouts / daysPerWeek) * 100));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardPurple]}>
          <Text style={styles.statEmoji}>🏋️</Text>
          <Text style={styles.statValueLarge}>{userData?.totalWorkouts ?? 0}</Text>
          <Text style={styles.statLabelWhite}>Total Workouts</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWhite]}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statValueDark}>{userData?.streak ?? 0}</Text>
          <Text style={styles.statLabelGray}>Week Streak</Text>
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
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyText}>
              {weeklyWorkouts} / {daysPerWeek} workouts
            </Text>
            <Text style={styles.weeklyPercent}>{weeklyPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${weeklyPercent}%` }]} />
          </View>
          <Text style={styles.weeklyHint}>
            {weeklyWorkouts >= daysPerWeek
              ? '✅ Weekly target complete! Streak +1'
              : `${daysPerWeek - weeklyWorkouts} workout${daysPerWeek - weeklyWorkouts === 1 ? '' : 's'} left to hit your weekly target`}
          </Text>
        </View>
      </View>

      {/* XP & Level */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>XP & Level</Text>
        <View style={styles.weeklyCard}>
          {(() => {
            const xp = userData?.xp ?? 0;
            const levels = [
              { label: '🥉 Rookie',   min: 0,    next: 300  },
              { label: '🥈 Athlete',  min: 300,  next: 700  },
              { label: '🥇 Champion', min: 700,  next: 1500 },
              { label: '👑 Legend',   min: 1500, next: null },
            ];
            const current = [...levels].reverse().find(l => xp >= l.min) ?? levels[0];
            const progress = current.next
              ? Math.min(100, Math.round(((xp - current.min) / (current.next - current.min)) * 100))
              : 100;
            return (
              <>
                <View style={styles.weeklyHeader}>
                  <Text style={styles.weeklyText}>{current.label}</Text>
                  <Text style={styles.weeklyPercent}>{xp} XP</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.weeklyHint}>
                  {current.next ? `${current.next - xp} XP to next level` : '👑 Max level reached!'}
                </Text>
              </>
            );
          })()}
        </View>
      </View>

      {/* Workout Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Profile</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Level"     value={userData?.level ?? '-'} />
          <InfoRow label="Equipment" value={userData?.equipment ?? '-'} />
          <InfoRow label="Days / week" value={`${userData?.daysPerWeek ?? '-'} days`} />
          <InfoRow label="Session"   value={`${userData?.sessionDuration ?? '-'} min`} />
          {userData?.tdee ? (
            <InfoRow label="Daily TDEE" value={`${userData.tdee} kcal`} last />
          ) : (
            <InfoRow label="Daily TDEE" value="-" last />
          )}
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
  container:        { flex: 1, backgroundColor: '#f5f5f5' },
  content:          { padding: 24, paddingTop: 60 },
  title:            { fontSize: 26, fontWeight: 'bold', marginBottom: 24 },
  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard:         { width: '47%', borderRadius: 16, padding: 16 },
  statCardPurple:   { backgroundColor: '#4F46E5' },
  statCardWhite:    { backgroundColor: '#fff' },
  statEmoji:        { fontSize: 24, marginBottom: 8 },
  statValueLarge:   { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  statValueDark:    { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  statLabelWhite:   { fontSize: 13, color: '#C7D2FE', marginTop: 2 },
  statLabelGray:    { fontSize: 13, color: '#666', marginTop: 2 },
  section:          { marginBottom: 24 },
  sectionTitle:     { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  weeklyCard:       { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  weeklyHeader:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weeklyText:       { fontSize: 15, fontWeight: '600' },
  weeklyPercent:    { fontSize: 15, fontWeight: '600', color: '#4F46E5' },
  weeklyHint:       { fontSize: 13, color: '#666', marginTop: 10 },
  progressBarBg:    { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4 },
  progressBarFill:  { height: 8, backgroundColor: '#4F46E5', borderRadius: 4 },
  infoCard:         { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  infoRowBorder:    { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel:        { fontSize: 15, color: '#666' },
  infoValue:        { fontSize: 15, fontWeight: '600' },
});