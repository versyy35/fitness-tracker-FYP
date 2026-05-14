import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { generateWorkoutPlan } from '../utils/ilpAlgo';

export default function HomeScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      const data = snap.data();
      setUserData(data);
      const planSnap = await getDoc(doc(db, 'plans', uid));
      if (planSnap.exists()) {
        setPlan(planSnap.data().days);
      }
    };
    fetchUser();
  }, []);

  const handleGeneratePlan = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const generatedPlan = generateWorkoutPlan({
        goal: userData.goal,
        level: userData.level,
        equipment: userData.equipment,
        daysPerWeek: userData.daysPerWeek,
        sessionDuration: userData.sessionDuration,
      });
      const uid = auth.currentUser?.uid;
      await setDoc(doc(db, 'plans', uid!), {
        days: generatedPlan,
        createdAt: new Date().toISOString(),
      });
      setPlan(generatedPlan);
      Alert.alert('Workout Complete! 🎉', 'Great job! Keep it up!', [
        { text: 'Done', onPress: () => navigation.navigate('Main') }
        ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const today = new Date().toISOString().split('T')[0];
  const workoutDoneToday = userData?.lastWorkoutDate === today;
  const totalWorkouts = userData?.totalWorkouts ?? 0;
  const daysPerWeek = userData?.daysPerWeek ?? 3;
  const todayIndex = totalWorkouts % daysPerWeek;
  const todayPlan = plan[todayIndex];
  const cardLabel = workoutDoneToday ? 'NEXT WORKOUT' : 'TODAY\'S WORKOUT';

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
        <Text style={styles.todayLabel}>{cardLabel}</Text>
        <Text style={styles.workoutTitle}>
          {todayPlan ? todayPlan.focus : 'No plan generated yet'}
        </Text>
        <Text style={styles.workoutMeta}>
          {todayPlan
            ? `${todayPlan.exercises.length} exercises · ${userData?.sessionDuration} min · ${userData?.level}`
            : 'Tap below to generate your personalized plan'}
        </Text>
        {todayPlan ? (
          workoutDoneToday ? (
            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>✓ Workout Done Today</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={() => navigation.navigate('Workout')}>
              <Text style={styles.startButtonText}>Start Workout</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={handleGeneratePlan} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#4F46E5" />
              : <Text style={styles.startButtonText}>Generate Plan</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Regenerate */}
      {todayPlan && (
        <TouchableOpacity onPress={handleGeneratePlan} disabled={loading}>
          <Text style={styles.regenerate}>{loading ? 'Regenerating...' : '↺ Regenerate Plan'}</Text>
        </TouchableOpacity>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{userData?.streak ?? 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{userData?.totalWorkouts ?? 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {userData?.totalSeconds ? `${Math.floor(userData.totalSeconds / 3600)}h` : '0h'}
          </Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>

      {/* Today's Exercise List */}
      {todayPlan && (
        <View style={styles.exerciseList}>
          <Text style={styles.sectionTitle}>Today's Exercises</Text>
          {todayPlan.exercises.map((ex: any, i: number) => (
            <View key={i} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{ex.title}</Text>
              <Text style={styles.exerciseMeta}>{ex.bodyPart} · {ex.equipment}</Text>
            </View>
          ))}
        </View>
      )}
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
  workoutCard: { backgroundColor: '#4F46E5', borderRadius: 16, padding: 24, marginBottom: 8 },
  todayLabel: { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  workoutTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  workoutMeta: { color: '#C7D2FE', fontSize: 14, marginBottom: 20 },
  startButton: { backgroundColor: '#fff', borderRadius: 8, padding: 14, alignItems: 'center' },
  startButtonText: { color: '#4F46E5', fontWeight: '700', fontSize: 16 },
  regenerate: { color: '#4F46E5', textAlign: 'right', fontSize: 13, marginBottom: 16, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  exerciseList: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  exerciseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  exerciseName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  exerciseMeta: { fontSize: 13, color: '#666' },
});