import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export default function PlanScreen() {
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    const fetchPlan = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'plans', uid));
      if (snap.exists()) {
        setPlan(snap.data().days);
      }
      setLoading(false);
    };
    fetchPlan();
  }, []);

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
      < ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.dayScroll}
        contentContainerStyle={{ alignItems: 'center', paddingRight: 24 }} >
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

      {/* Focus */}
      <View style={styles.focusCard}>
        <Text style={styles.focusLabel}>FOCUS</Text>
        <Text style={styles.focusTitle}>{currentDay.focus}</Text>
        <Text style={styles.focusMeta}>{currentDay.exercises.length} exercises</Text>
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.exerciseList}>
        {currentDay.exercises.map((ex: any, i: number) => (
          <View key={i} style={styles.exerciseCard}>
            <View style={styles.exerciseIndex}>
              <Text style={styles.exerciseIndexText}>{i + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{ex.title}</Text>
              <Text style={styles.exerciseMeta}>{ex.bodyPart} · {ex.equipment}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 60 },
  title: { fontSize: 26, fontWeight: 'bold', paddingHorizontal: 24, marginBottom: 16 },
  dayScroll: { paddingHorizontal: 24, marginBottom: 16, flexGrow: 0, height: 56 },
  dayTab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1.5, borderColor: '#ddd', height: 40, justifyContent: 'center', alignItems: 'center' },
  dayTabActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  dayTabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  dayTabTextActive: { color: '#fff' },
  focusCard: { marginHorizontal: 24, backgroundColor: '#4F46E5', borderRadius: 16, padding: 20, marginBottom: 16 },
  focusLabel: { color: '#A5B4FC', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  focusTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  focusMeta: { color: '#C7D2FE', fontSize: 14 },
  exerciseList: { paddingHorizontal: 24 },
  exerciseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  exerciseIndex: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  exerciseIndexText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 14 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  exerciseMeta: { fontSize: 13, color: '#666' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#666' },
});