import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { logWeight, getWeightLogs, WeightEntry } from '../utils/weightLog';

export default function ProgressScreen() {
  const [userData, setUserData]       = useState<any>(null);
  const [weightLogs, setWeightLogs]   = useState<WeightEntry[]>([]);
  const [weightLoading, setWeightLoading] = useState(true);
  const [logging, setLogging]         = useState(false);

  const fetchAll = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setWeightLoading(true);
    const [userSnap, logs] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getWeightLogs(uid),
    ]);
    setUserData(userSnap.data());
    setWeightLogs(logs);
    setWeightLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleLogWeight = () => {
    Alert.prompt(
      'Log Weight',
      'Enter your current weight in kg',
      async (value) => {
        const num = parseFloat(value ?? '');
        if (isNaN(num) || num <= 0) {
          Alert.alert('Error', 'Please enter a valid weight.');
          return;
        }
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        setLogging(true);
        try {
          await logWeight(uid, num);
          await fetchAll();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        } finally {
          setLogging(false);
        }
      },
      'plain-text',
      '',
      'decimal-pad'
    );
  };

  const totalHours = userData?.totalSeconds ? Math.floor(userData.totalSeconds / 3600) : 0;
  const totalMins  = userData?.totalSeconds ? Math.floor((userData.totalSeconds % 3600) / 60) : 0;

  const weeklyWorkouts = userData?.weeklyWorkouts ?? 0;
  const daysPerWeek    = userData?.daysPerWeek ?? 3;
  const weeklyPercent  = Math.min(100, Math.round((weeklyWorkouts / daysPerWeek) * 100));

  const currentWeight  = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : userData?.weight;
  const startingWeight = weightLogs.length > 0 ? weightLogs[0].weight : null;
  const weightDelta    = (startingWeight != null && currentWeight != null) ? currentWeight - startingWeight : null;

  const chartMin = weightLogs.length > 0 ? Math.min(...weightLogs.map(e => e.weight)) : 0;
  const chartMax = weightLogs.length > 0 ? Math.max(...weightLogs.map(e => e.weight)) : 0;
  const chartRange = chartMax - chartMin || 1;

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

      {/* Weight Tracking */}
      <View style={styles.section}>
        <View style={styles.weightHeaderRow}>
          <Text style={styles.sectionTitle}>Weight Tracking</Text>
          <TouchableOpacity style={styles.logButton} onPress={handleLogWeight} disabled={logging}>
            {logging
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.logButtonText}>+ Log Weight</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.weeklyCard}>
          {weightLoading ? (
            <ActivityIndicator />
          ) : weightLogs.length === 0 ? (
            <Text style={styles.emptyWeightText}>
              No weight logged yet. Tap "+ Log Weight" to start tracking.
            </Text>
          ) : (
            <>
              <View style={styles.weeklyHeader}>
                <Text style={styles.weeklyText}>{currentWeight} kg</Text>
                {weightDelta != null && (
                  <Text style={styles.weeklyPercent}>
                    {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg since {formatShortDate(weightLogs[0].date)}
                  </Text>
                )}
              </View>

              {weightLogs.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                  <View style={styles.chartRow}>
                    {weightLogs.map((entry, i) => {
                      const heightPct = ((entry.weight - chartMin) / chartRange) * 70 + 20;
                      return (
                        <View key={entry.id} style={styles.barContainer}>
                          <Text style={styles.barValue}>{entry.weight}</Text>
                          <View style={styles.barTrack}>
                            <View style={[styles.bar, { height: `${heightPct}%` }]} />
                          </View>
                          <Text style={styles.barDate}>{formatShortDate(entry.date)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </>
          )}
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

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  weightHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logButton:        { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  logButtonText:    { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyWeightText:  { fontSize: 14, color: '#666', textAlign: 'center', paddingVertical: 12 },
  chartScroll:      { marginTop: 4 },
  chartRow:         { flexDirection: 'row', alignItems: 'flex-end', height: 140, paddingRight: 12 },
  barContainer:     { alignItems: 'center', width: 44, marginRight: 8 },
  barValue:         { fontSize: 11, color: '#4F46E5', fontWeight: '600', marginBottom: 4 },
  barTrack:         { width: 20, height: 90, backgroundColor: '#f0f0f0', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  bar:              { width: '100%', backgroundColor: '#4F46E5', borderRadius: 10 },
  barDate:          { fontSize: 10, color: '#999', marginTop: 4 },
});