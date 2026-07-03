import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, Alert
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { generateWorkoutPlan } from '../utils/ilpAlgo';
import {
  replacePlan, rerollToPlan, getPlanHistory, reasonLabel, PlanHistoryEntry,
} from '../utils/planHistory';

export default function PlanScreen({ navigation }: any) {
  const [plan, setPlan]                         = useState<any[]>([]);
  const [userData, setUserData]                 = useState<any>(null);
  const [loading, setLoading]                   = useState(true);
  const [regeneratingDay, setRegeneratingDay]   = useState(false);
  const [selectedDay, setSelectedDay]           = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [activeTab, setActiveTab]               = useState<'plan' | 'history'>('plan');
  const [history, setHistory]                   = useState<PlanHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading]     = useState(false);
  const [expandedEntry, setExpandedEntry]       = useState<string | null>(null);
  const [rerolling, setRerolling]               = useState<string | null>(null);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [swapping, setSwapping]                 = useState(false);

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

  const loadHistory = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setHistoryLoading(true);
    try {
      const entries = await getPlanHistory(uid);
      setHistory(entries);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSelectTab = (tab: 'plan' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history') loadHistory();
  };

  const handleReroll = (entry: PlanHistoryEntry) => {
    Alert.alert(
      'Reroll to This Plan?',
      `This will replace your current plan with the one from ${formatDate(entry.archivedAt)}. Your current plan will be saved to history too, so you can always come back.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reroll',
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            setRerolling(entry.id);
            try {
              await rerollToPlan(uid, entry);
              const planSnap = await getDoc(doc(db, 'plans', uid));
              if (planSnap.exists()) setPlan(planSnap.data().days);
              await loadHistory();
              setActiveTab('plan');
              setSelectedDay(0);
              Alert.alert('Plan Restored ↺', 'Your workout plan has been rolled back.');
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setRerolling(null);
            }
          },
        },
      ]
    );
  };

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

              await replacePlan(uid, updatedPlan, 'day_regenerate');

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

  const handleSwapDay = (targetIndex: number) => {
    setSwapModalVisible(false);
    Alert.alert(
      'Swap These Days?',
      `${currentDay.day} (${currentDay.focus}) will swap with ${plan[targetIndex].day} (${plan[targetIndex].focus}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Swap',
          onPress: async () => {
            setSwapping(true);
            try {
              const uid = auth.currentUser?.uid;
              if (!uid) return;
              const updatedPlan = plan.map((d, i) => {
                if (i === selectedDay) return { ...d, focus: plan[targetIndex].focus, exercises: plan[targetIndex].exercises };
                if (i === targetIndex) return { ...d, focus: currentDay.focus, exercises: currentDay.exercises };
                return d;
              });
              await replacePlan(uid, updatedPlan, 'day_swap');
              setPlan(updatedPlan);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setSwapping(false);
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

      {/* Plan / History Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'plan' && styles.tabButtonActive]}
          onPress={() => handleSelectTab('plan')}>
          <Text style={[styles.tabButtonText, activeTab === 'plan' && styles.tabButtonTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => handleSelectTab('history')}>
          <Text style={[styles.tabButtonText, activeTab === 'history' && styles.tabButtonTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'plan' ? (
        <>
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
            <View style={{ flex: 1, marginRight: 12 }}>
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

          {plan.length > 1 && (
            <TouchableOpacity
              style={styles.swapDayButton}
              onPress={() => setSwapModalVisible(true)}
              disabled={swapping}>
              {swapping
                ? <ActivityIndicator color="#4F46E5" size="small" />
                : <Text style={styles.swapDayText}>⇄ Swap with Another Day</Text>}
            </TouchableOpacity>
          )}

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
        </>
      ) : (
        <HistoryList
          history={history}
          loading={historyLoading}
          expandedEntry={expandedEntry}
          onToggleExpand={(id) => setExpandedEntry(expandedEntry === id ? null : id)}
          onReroll={handleReroll}
          rerolling={rerolling}
          onPreviewExercise={setSelectedExercise}
        />
      )}

      {/* Swap Day Picker Modal */}
      <Modal visible={swapModalVisible} animationType="slide" transparent onRequestClose={() => setSwapModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSwapModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Swap {currentDay?.day} With...</Text>
            <ScrollView>
              {plan.map((d, i) => i !== selectedDay && (
                <TouchableOpacity key={i} style={styles.swapOptionRow} onPress={() => handleSwapDay(i)}>
                  <View>
                    <Text style={styles.swapOptionDay}>{d.day}</Text>
                    <Text style={styles.swapOptionFocus}>{d.focus}</Text>
                  </View>
                  <Text style={styles.exerciseChevron}>⇄</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSwapModalVisible(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function HistoryList({
  history, loading, expandedEntry, onToggleExpand, onReroll, rerolling, onPreviewExercise,
}: {
  history: PlanHistoryEntry[];
  loading: boolean;
  expandedEntry: string | null;
  onToggleExpand: (id: string) => void;
  onReroll: (entry: PlanHistoryEntry) => void;
  rerolling: string | null;
  onPreviewExercise: (ex: any) => void;
}) {
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (history.length === 0) {
    return (
      <View style={styles.historyEmpty}>
        <Text style={styles.emptyText}>No past plans yet.</Text>
        <Text style={styles.emptySubtext}>
          Every time your plan is regenerated, the old version is saved here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.exerciseList}>
      {history.map((entry) => {
        const isOpen = expandedEntry === entry.id;
        const totalExercises = entry.days.reduce((sum: number, d: any) => sum + (d.exercises?.length ?? 0), 0);
        return (
          <View key={entry.id} style={styles.historyCard}>
            <TouchableOpacity style={styles.historyCardHeader} onPress={() => onToggleExpand(entry.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyReason}>{reasonLabel(entry.reason)}</Text>
                <Text style={styles.historyDate}>{formatDate(entry.archivedAt)}</Text>
                <Text style={styles.historyMeta}>
                  {entry.days.length} day{entry.days.length === 1 ? '' : 's'} · {totalExercises} exercises
                </Text>
              </View>
              <Text style={styles.exerciseChevron}>{isOpen ? '︿' : '›'}</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.historyBody}>
                {entry.days.map((day: any, i: number) => (
                  <View key={i} style={styles.historyDayBlock}>
                    <Text style={styles.historyDayTitle}>{day.day} · {day.focus}</Text>
                    {day.exercises.map((ex: any, j: number) => (
                      <TouchableOpacity
                        key={j}
                        style={styles.historyExerciseRow}
                        onPress={() => onPreviewExercise(ex)}>
                        <Text style={styles.historyExerciseText}>{ex.title}</Text>
                        <Text style={styles.historyExerciseMeta}>
                          {ex.sets ?? 3}×{ex.reps ?? 12}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.rerollButton}
                  onPress={() => onReroll(entry)}
                  disabled={rerolling === entry.id}>
                  {rerolling === entry.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.rerollButtonText}>↺ Reroll to This Plan</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
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
  container:          { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 60 },
  title:              { fontSize: 26, fontWeight: 'bold', paddingHorizontal: 24, marginBottom: 16 },
  dayScroll:          { paddingHorizontal: 24, marginBottom: 16, flexGrow: 0, height: 56 },
  tabBar:             { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, padding: 4 },
  tabButton:          { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabButtonActive:    { backgroundColor: '#4F46E5' },
  tabButtonText:      { fontSize: 14, fontWeight: '600', color: '#666' },
  tabButtonTextActive:{ color: '#fff' },
  historyEmpty:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  historyCard:        { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  historyCardHeader:  { flexDirection: 'row', alignItems: 'center', padding: 16 },
  historyReason:      { fontSize: 15, fontWeight: '700', color: '#111' },
  historyDate:        { fontSize: 13, color: '#666', marginTop: 2 },
  historyMeta:        { fontSize: 12, color: '#4F46E5', fontWeight: '600', marginTop: 4 },
  historyBody:        { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  historyDayBlock:    { marginTop: 12 },
  historyDayTitle:    { fontSize: 13, fontWeight: '700', color: '#4F46E5', marginBottom: 6 },
  historyExerciseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  historyExerciseText:{ fontSize: 13, color: '#333', flex: 1 },
  historyExerciseMeta:{ fontSize: 12, color: '#999' },
  rerollButton:       { backgroundColor: '#4F46E5', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  rerollButtonText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
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
  swapDayButton:      { marginHorizontal: 24, marginTop: -8, marginBottom: 16, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#4F46E5' },
  swapDayText:        { color: '#4F46E5', fontSize: 14, fontWeight: '600' },
  swapOptionRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  swapOptionDay:      { fontSize: 15, fontWeight: '700', color: '#111' },
  swapOptionFocus:    { fontSize: 13, color: '#666', marginTop: 2 },
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