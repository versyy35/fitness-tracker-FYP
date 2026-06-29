import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, Alert
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { generateWorkoutPlan } from '../utils/ilpAlgo';

export default function PlanScreen({ navigation }: any) {
  const [plan, setPlan]                         = useState<any[]>([]);
  const [userData, setUserData]                 = useState<any>(null);
  const [loading, setLoading]                   = useState(true);
  const [regeneratingDay, setRegeneratingDay]   = useState(false);
  const [selectedDay, setSelectedDay]           = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    const fetchData = async () => {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const [planSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'plans', uid)),
        getDoc(doc(db, 'users', uid)),
      ]);
      if (planSnap.exists()) setPlan(planSnap.data().days);
      if (userSnap.exists()) setUserData(userSnap.data());
      setLoading(false);
    };
    fetchData();
  }, []));

  const handleRegenerateDay = async () => {
    if (!userData) return;
    Alert.alert(
      'Regenerate This Day?',
      `This will replace the exercises for ${currentDay.focus} with new ones. Other days stay the same.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            setRegeneratingDay(true);
            try {
              const uid = auth.currentUser?.uid;
              if (!uid) return;

              // Generate a full new plan, grab just this day's exercises
              const newFullPlan = generateWorkoutPlan({
                goal:            userData.goal,
                level:           userData.level,
                equipment:       userData.equipment,
                daysPerWeek:     userData.daysPerWeek,
                sessionDuration: userData.sessionDuration,
              });

              // Replace only the selected day, keep everything else
              const updatedPlan = plan.map((day, i) =>
                i === selectedDay
                  ? { ...day, exercises: newFullPlan[selectedDay]?.exercises ?? day.exercises }
                  : day
              );

              await setDoc(doc(db, 'plans', uid), {
                days:      updatedPlan,
                createdAt: new Date().toISOString(),
              });

              setPlan(updatedPlan);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setRegeneratingDay(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (plan.length === 0) return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>No plan generated yet.</Text>
      <Text style={styles.emptySubtext}>Go to Home and tap Generate Plan.</Text>
    </View>
  );

  const currentDay = plan[selectedDay];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Plan</Text>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={{ alignItems: 'center', paddingRight: 24 }}>
        {plan.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
            onPress={() => setSelectedDay(i)}>
            <Text style={[styles.dayTabText, selectedDay === i && styles.dayTabTextActive]}>
              {day.day}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Focus Card */}
      <View style={styles.focusCard}>
        <View>
          <Text style={styles.focusLabel}>FOCUS</Text>
          <Text style={styles.focusTitle}>{currentDay.focus}</Text>
          <Text style={styles.focusMeta}>{currentDay.exercises.length} exercises</Text>
        </View>
        <TouchableOpacity
          style={styles.regenDayButton}
          onPress={handleRegenerateDay}
          disabled={regeneratingDay}>
          {regeneratingDay
            ? <ActivityIndicator color="#4F46E5" size="small" />
            : <Text style={styles.regenDayText}>↺ Regenerate Day</Text>}
        </TouchableOpacity>
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.exerciseList}>
        {currentDay.exercises.map((ex: any, i: number) => (
          <TouchableOpacity
            key={i}
            style={styles.exerciseCard}
            onPress={() => setSelectedExercise(ex)}>
            <View style={styles.exerciseIndex}>
              <Text style={styles.exerciseIndexText}>{i + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{ex.title}</Text>
              <Text style={styles.exerciseMeta}>{ex.bodyPart} · {ex.equipment}</Text>
              <Text style={styles.exerciseSetsReps}>
                {ex.sets ?? 3} sets × {ex.reps ?? 12} reps · {ex.rest ?? 60}s rest
              </Text>
            </View>
            <Text style={styles.exerciseChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercise Preview Modal */}
      <ExerciseModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onYouTube={() => {
          setSelectedExercise(null);
          navigation.navigate('ExerciseVideo', { exerciseName: selectedExercise?.title });
        }}
      />
    </View>
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
  container:          { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 60 },
  title:              { fontSize: 26, fontWeight: 'bold', paddingHorizontal: 24, marginBottom: 16 },
  dayScroll:          { paddingHorizontal: 24, marginBottom: 16, flexGrow: 0, height: 56 },
  dayTab:             { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1.5, borderColor: '#ddd', height: 40, justifyContent: 'center', alignItems: 'center' },
  dayTabActive:       { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  dayTabText:         { fontSize: 14, fontWeight: '600', color: '#666' },
  dayTabTextActive:   { color: '#fff' },
  focusCard:          { marginHorizontal: 24, backgroundColor: '#4F46E5', borderRadius: 16, padding: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  focusLabel:         { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  focusTitle:         { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  focusMeta:          { color: '#C7D2FE', fontSize: 14 },
  regenDayButton:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  regenDayText:       { color: '#fff', fontSize: 13, fontWeight: '600' },
  exerciseList:       { paddingHorizontal: 24 },
  exerciseCard:       { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  exerciseIndex:      { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  exerciseIndexText:  { color: '#4F46E5', fontWeight: 'bold', fontSize: 14 },
  exerciseInfo:       { flex: 1 },
  exerciseName:       { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  exerciseMeta:       { fontSize: 13, color: '#666' },
  exerciseSetsReps:   { fontSize: 12, color: '#4F46E5', fontWeight: '600', marginTop: 4 },
  exerciseChevron:    { fontSize: 22, color: '#ccc', marginLeft: 8 },
  empty:              { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText:          { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext:       { fontSize: 14, color: '#666' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHandle:        { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:         { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 12 },
  tagRow:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tag:                { backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText:            { fontSize: 13, color: '#4F46E5', fontWeight: '600' },
  tagLevel:           { backgroundColor: '#F0FDF4' },
  tagLevelText:       { color: '#16A34A' },
  modalStatsRow:      { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 20 },
  modalStatBox:       { flex: 1, alignItems: 'center' },
  modalStatValue:     { fontSize: 24, fontWeight: '800', color: '#111' },
  modalStatLabel:     { fontSize: 12, color: '#666', marginTop: 2 },
  modalSectionTitle:  { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  modalDesc:          { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 24 },
  youtubeButton:      { backgroundColor: '#EF4444', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  youtubeButtonText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeButton:        { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  closeButtonText:    { color: '#666', fontWeight: '600', fontSize: 15 },
});