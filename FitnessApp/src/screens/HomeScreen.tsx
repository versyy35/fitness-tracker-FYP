import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, Pressable
} from 'react-native';
import { collection, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { generateWorkoutPlan } from '../utils/ilpAlgo';
import { useFocusEffect } from '@react-navigation/native';

const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ORDER  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function HomeScreen({ navigation }: any) {
  const [userData, setUserData]             = useState<any>(null);
  const [plan, setPlan]                     = useState<any[]>([]);
  const [loading, setLoading]               = useState(false);
  const [notification, setNotification]     = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);

  const fetchData = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const snap = await getDoc(doc(db, 'users', uid));
    setUserData(snap.data());
    const planSnap = await getDoc(doc(db, 'plans', uid));
    if (planSnap.exists()) setPlan(planSnap.data().days);

    const notifSnap = await getDocs(collection(db, 'notifications', uid, 'messages'));
    const unread = notifSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((n: any) => !n.read)
      .sort((a: any, b: any) => b.sentAt.localeCompare(a.sentAt));
    if (unread.length > 0) setNotification(unread[0]);
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const handleGeneratePlan = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const generatedPlan = generateWorkoutPlan({
        goal: userData.goal, level: userData.level,
        equipment: userData.equipment, daysPerWeek: userData.daysPerWeek,
        sessionDuration: userData.sessionDuration,
      });
      const uid = auth.currentUser?.uid;
      await setDoc(doc(db, 'plans', uid!), {
        days: generatedPlan, createdAt: new Date().toISOString(),
      });
      setPlan(generatedPlan);
      Alert.alert('Plan Regenerated! 🔄', 'Your new workout plan is ready.', [{ text: 'Got it' }]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !notification) return;
    await updateDoc(doc(db, 'notifications', uid, 'messages', notification.id), { read: true });
    setNotification(null);
  };

  // ── Day logic ──────────────────────────────────────────────────────────────
  const today        = new Date().toISOString().split('T')[0];
  const todayName    = DAY_NAMES[new Date().getDay()]; // e.g. "Mon"
  const workoutDays: string[] = userData?.workoutDays ?? [];

  // Is today a workout day?
  const isWorkoutDay = workoutDays.length === 0 || workoutDays.includes(todayName);

  // Which plan day to show
  const todayIndex = workoutDays.length > 0
    ? workoutDays.indexOf(todayName)
    : (userData?.totalWorkouts ?? 0) % (userData?.daysPerWeek ?? 3); // fallback for old accounts

  const todayPlan        = plan[todayIndex] ?? plan[0];
  const workoutDoneToday = userData?.lastWorkoutDate === today;
  const cardLabel        = workoutDoneToday ? 'NEXT WORKOUT' : 'TODAY\'S WORKOUT';

  // Next workout day label for rest day screen
  const nextWorkoutDay = (() => {
    if (workoutDays.length === 0) return null;
    const todayOrderIndex = DAY_ORDER.indexOf(todayName);
    const next = workoutDays
      .slice()
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
      .find(d => DAY_ORDER.indexOf(d) > todayOrderIndex);
    return next ?? workoutDays[0]; // wrap around to first day of next week
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Notification Banner */}
      {notification && (
        <View style={styles.notificationBanner}>
          <Text style={styles.notificationText}>🔔 {notification.message}</Text>
          <TouchableOpacity onPress={dismissNotification}>
            <Text style={styles.notificationDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Rest Day Card */}
      {!isWorkoutDay ? (
        <View style={styles.restCard}>
          <Text style={styles.restEmoji}>😴</Text>
          <Text style={styles.restTitle}>Rest Day</Text>
          <Text style={styles.restSubtitle}>Today is {todayName} — enjoy your recovery!</Text>
          {nextWorkoutDay && (
            <Text style={styles.restNext}>Next workout: {nextWorkoutDay}</Text>
          )}
        </View>
      ) : (
        <>
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

          {/* Today's Exercise List */}
          {todayPlan && (
            <View style={styles.exerciseList}>
              <Text style={styles.sectionTitle}>Today's Exercises</Text>
              {todayPlan.exercises.map((ex: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={styles.exerciseCard}
                  onPress={() => setSelectedExercise(ex)}>
                  <View style={styles.exerciseCardLeft}>
                    <Text style={styles.exerciseName}>{ex.title}</Text>
                    <Text style={styles.exerciseMeta}>{ex.bodyPart} · {ex.equipment}</Text>
                    <Text style={styles.exerciseSetsReps}>
                      {ex.sets ?? 3} sets × {ex.reps ?? 12} reps · {ex.rest ?? 60}s rest
                    </Text>
                  </View>
                  <Text style={styles.exerciseChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* Stats Row — always visible */}
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

      {/* Exercise Preview Modal */}
      <ExerciseModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onYouTube={() => {
          setSelectedExercise(null);
          navigation.navigate('ExerciseVideo', { exerciseName: selectedExercise?.title });
        }}
      />

    </ScrollView>
  );
}

function ExerciseModal({ exercise, onClose, onYouTube }: {
  exercise: any;
  onClose: () => void;
  onYouTube: () => void;
}) {
  if (!exercise) return null;
  return (
    <Modal visible={!!exercise} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{exercise.title}</Text>
            <View style={styles.tagRow}>
              <View style={styles.tag}><Text style={styles.tagText}>{exercise.bodyPart}</Text></View>
              <View style={styles.tag}><Text style={styles.tagText}>{exercise.equipment}</Text></View>
              <View style={[styles.tag, styles.tagLevel]}>
                <Text style={[styles.tagText, styles.tagLevelText]}>{exercise.level}</Text>
              </View>
            </View>
            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{exercise.sets ?? 3}</Text>
                <Text style={styles.modalStatLabel}>Sets</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{exercise.reps ?? 12}</Text>
                <Text style={styles.modalStatLabel}>Reps</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{exercise.rest ?? 60}s</Text>
                <Text style={styles.modalStatLabel}>Rest</Text>
              </View>
            </View>
            {exercise.desc ? (
              <>
                <Text style={styles.modalSectionTitle}>Instructions</Text>
                <Text style={styles.modalDesc}>{exercise.desc}</Text>
              </>
            ) : null}
            <TouchableOpacity style={styles.youtubeButton} onPress={onYouTube}>
              <Text style={styles.youtubeButtonText}>▶ Watch Tutorial on YouTube</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f5f5f5' },
  content:              { padding: 24, paddingTop: 60 },
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting:             { fontSize: 26, fontWeight: 'bold' },
  subGreeting:          { fontSize: 14, color: '#666', marginTop: 2 },
  logout:               { color: '#4F46E5', fontSize: 14 },
  // Rest day
  restCard:             { backgroundColor: '#fff', borderRadius: 16, padding: 32, marginBottom: 16, alignItems: 'center' },
  restEmoji:            { fontSize: 52, marginBottom: 12 },
  restTitle:            { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 4 },
  restSubtitle:         { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 8 },
  restNext:             { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  // Workout card
  workoutCard:          { backgroundColor: '#4F46E5', borderRadius: 16, padding: 24, marginBottom: 8 },
  todayLabel:           { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  workoutTitle:         { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  workoutMeta:          { color: '#C7D2FE', fontSize: 14, marginBottom: 20 },
  startButton:          { backgroundColor: '#fff', borderRadius: 8, padding: 14, alignItems: 'center' },
  startButtonText:      { color: '#4F46E5', fontWeight: '700', fontSize: 16 },
  regenerate:           { color: '#4F46E5', textAlign: 'right', fontSize: 13, marginBottom: 16, marginTop: 4 },
  // Stats
  statsRow:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, marginTop: 16 },
  statBox:              { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 4 },
  statEmoji:            { fontSize: 20 },
  statValue:            { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  statLabel:            { fontSize: 12, color: '#666', marginTop: 2 },
  // Exercise list
  exerciseList:         { marginTop: 8 },
  sectionTitle:         { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  exerciseCard:         { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  exerciseCardLeft:     { flex: 1 },
  exerciseName:         { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  exerciseMeta:         { fontSize: 13, color: '#666' },
  exerciseSetsReps:     { fontSize: 12, color: '#4F46E5', fontWeight: '600', marginTop: 4 },
  exerciseChevron:      { fontSize: 22, color: '#ccc', marginLeft: 8 },
  // Notification
  notificationBanner:   { backgroundColor: '#4F46E5', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  notificationText:     { flex: 1, color: '#fff', fontSize: 13, lineHeight: 18 },
  notificationDismiss:  { color: '#fff', fontSize: 18, marginLeft: 12 },
  // Modal
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:           { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHandle:          { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:           { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 12 },
  tagRow:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag:                  { backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText:              { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  tagLevel:             { backgroundColor: '#F0FDF4' },
  tagLevelText:         { color: '#16A34A' },
  modalStatsRow:        { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 20 },
  modalStatBox:         { flex: 1, alignItems: 'center' },
  modalStatValue:       { fontSize: 24, fontWeight: '800', color: '#111' },
  modalStatLabel:       { fontSize: 12, color: '#666', marginTop: 2 },
  modalSectionTitle:    { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  modalDesc:            { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 24 },
  youtubeButton:        { backgroundColor: '#EF4444', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  youtubeButtonText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeButton:          { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  closeButtonText:      { color: '#666', fontWeight: '600', fontSize: 15 },
});