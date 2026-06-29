import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert
} from 'react-native';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export default function WorkoutScreen({ navigation }: any) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'plans', uid));
      if (snap.exists()) {const userSnap = await getDoc(doc(db, 'users', uid));
        const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayName = DAY_NAMES[new Date().getDay()];
        const workoutDays: string[] = userSnap.data()?.workoutDays ?? [];
        const todayIndex = workoutDays.length > 0
          ? workoutDays.indexOf(todayName)
          : (userSnap.data()?.totalWorkouts ?? 0) % (userSnap.data()?.daysPerWeek ?? 3);
        const safeIndex = todayIndex >= 0 ? todayIndex : 0;
        setExercises(snap.data().days[safeIndex].exercises);
      }
    };
    fetchPlan();
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isResting) {
        setRestSeconds(s => {
          if (s <= 1) {
            setIsResting(false);
            setSeconds(0);
            return 60;
          }
          return s - 1;
        });
      } else {
        setSeconds(s => s + 1);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isResting]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    if (exercises.length === 0) return;
    setCompletedIndices(prev => [...prev, currentIndex]);
    if (currentIndex < exercises.length - 1) {
      setIsResting(true);
      setRestSeconds(exercises[currentIndex + 1]?.rest ?? 60);
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setSeconds(0);
      }, 100);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    clearInterval(timerRef.current);
    try {
      const uid = auth.currentUser?.uid;
      const today = new Date().toISOString().split('T')[0];
      const userSnap = await getDoc(doc(db, 'users', uid!));
      const userData = userSnap.data();

      const daysPerWeek = userData?.daysPerWeek ?? 3;
      const weeklyWorkouts = (userData?.weeklyWorkouts ?? 0) + 1;
      let bonusXP = 0;
      let newStreak = userData?.streak ?? 0;
      let newWeeklyWorkouts = weeklyWorkouts;

      if (weeklyWorkouts >= daysPerWeek) {
        bonusXP = 100;
        newStreak = newStreak + 1;
        newWeeklyWorkouts = 0;
      }

      await updateDoc(doc(db, 'users', uid!), {
        totalWorkouts: increment(1),
        totalSeconds: increment(seconds),
        xp: (userData?.xp ?? 0) + 50 + bonusXP,
        lastWorkoutDate: today,
        weeklyWorkouts: newWeeklyWorkouts,
        streak: newStreak,
      });
    } catch (e) {}
    navigation.navigate('Main');
  };

  const current = exercises[currentIndex];
  if (!current) return <View style={styles.loading}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.quitButton}
          onPress={() => {
            Alert.alert('Quit Workout?', 'Your progress will be lost.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Quit', style: 'destructive', onPress: () => navigation.navigate('Main') }
            ]);
          }}>
          <Text style={styles.quitButtonText}>Quit Workout</Text>
        </TouchableOpacity>
        <Text style={styles.progress}>{currentIndex + 1}/{exercises.length}</Text>
      </View>

      {/* Rest overlay */}
      {isResting && (
        <View style={styles.restOverlay}>
          <Text style={styles.restTitle}>Rest Time</Text>
          <Text style={styles.restTimer}>{formatTime(restSeconds)}</Text>
          <TouchableOpacity style={styles.skipRest} onPress={() => setIsResting(false)}>
            <Text style={styles.skipRestText}>Skip Rest</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isResting && (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Exercise Progress List */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.progressList}>
              {exercises.map((ex, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i === currentIndex && styles.progressDotActive,
                    completedIndices.includes(i) && styles.progressDotDone,
                  ]}>
                  <Text style={styles.progressDotText}>
                    {completedIndices.includes(i) ? '✓' : i + 1}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.exerciseNumber}>Exercise {currentIndex + 1} of {exercises.length}</Text>
            <Text style={styles.exerciseName}>{current.title}</Text>
            <Text style={styles.exerciseTarget}>{current.bodyPart}</Text>

            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>💪</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{current.sets ?? 3}</Text>
                <Text style={styles.statLabel}>Sets</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{current.reps ?? 12}</Text>
                <Text style={styles.statLabel}>Reps</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{current.rest ?? 60}s</Text>
                <Text style={styles.statLabel}>Rest</Text>
              </View>
            </View>

            <Text style={styles.timer}>{formatTime(seconds)}</Text>
            <Text style={styles.timerLabel}>Time on exercise</Text>

            <View style={styles.descCard}>
              <Text style={styles.descTitle}>Instructions</Text>
              <Text style={styles.descText}>{current.desc}</Text>
            </View>

            <TouchableOpacity
              style={styles.videoButton}
              onPress={() => navigation.navigate('ExerciseVideo', { exerciseName: current.title })}>
              <Text style={styles.videoButtonText}>▶ Watch Tutorial on YouTube</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex < exercises.length - 1 ? 'Next Exercise →' : 'Finish Workout 🎉'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  quitButton: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  quitButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  progress: { fontSize: 14, color: '#666' },
  restOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46E5' },
  restTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  restTimer: { color: '#fff', fontSize: 72, fontWeight: 'bold', marginBottom: 32 },
  skipRest: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  skipRestText: { color: '#4F46E5', fontWeight: '700', fontSize: 16 },
  content: { padding: 24 },
  progressList: { marginBottom: 20 },
  progressDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  progressDotActive: { backgroundColor: '#4F46E5' },
  progressDotDone: { backgroundColor: '#22C55E' },
  progressDotText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  exerciseNumber: { fontSize: 14, color: '#666', marginBottom: 4 },
  exerciseName: { fontSize: 26, fontWeight: 'bold', marginBottom: 4 },
  exerciseTarget: { fontSize: 16, color: '#4F46E5', marginBottom: 24 },
  imagePlaceholder: { backgroundColor: '#f5f5f5', borderRadius: 16, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  imagePlaceholderText: { fontSize: 64 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  timer: { fontSize: 48, fontWeight: 'bold', textAlign: 'center', color: '#4F46E5', marginBottom: 4 },
  timerLabel: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  descCard: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16 },
  descTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  descText: { fontSize: 14, color: '#666', lineHeight: 22 },
  nextButton: { backgroundColor: '#4F46E5', padding: 20, margin: 24, borderRadius: 12, alignItems: 'center' },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  videoButton: { backgroundColor: '#EF4444', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  videoButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});