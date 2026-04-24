import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';

export default function HomeScreen() {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {userData?.name?.split(' ')[0]}! 👋</Text>
          <Text style={styles.subGreeting}>Let's crush today's workout</Text>
        </View>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Workout Card */}
      <View style={styles.workoutCard}>
        <Text style={styles.todayLabel}>TODAY'S WORKOUT</Text>
        <Text style={styles.workoutTitle}>No plan generated yet</Text>
        <Text style={styles.workoutMeta}>Complete your profile to generate a plan</Text>
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Generate Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>0h</Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 26, fontWeight: 'bold' },
  subGreeting: { fontSize: 14, color: '#666', marginTop: 2 },
  logout: { color: '#4F46E5', fontSize: 14 },
  workoutCard: { backgroundColor: '#4F46E5', borderRadius: 16, padding: 24, marginBottom: 24 },
  todayLabel: { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  workoutTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  workoutMeta: { color: '#C7D2FE', fontSize: 14, marginBottom: 20 },
  startButton: { backgroundColor: '#fff', borderRadius: 8, padding: 14, alignItems: 'center' },
  startButtonText: { color: '#4F46E5', fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
});