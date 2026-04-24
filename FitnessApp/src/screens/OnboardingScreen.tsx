import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { generateWorkoutPlan } from '../utils/ilpAlgo';

const goals = [
  { label: 'Build Muscle', emoji: '💪' },
  { label: 'Lose Weight', emoji: '🔥' },
  { label: 'Maintain', emoji: '⚖️' },
  { label: 'Stay Healthy', emoji: '❤️' },
];

const levels = [
  { label: 'Beginner', emoji: '🌱' },
  { label: 'Intermediate', emoji: '⚡' },
  { label: 'Advanced', emoji: '🏆' },
];

const equipmentOptions = [
  { label: 'No Equipment', emoji: '🏠' },
  { label: 'Dumbbells', emoji: '🏋️' },
  { label: 'Full Gym', emoji: '💪' },
];

const daysOptions = [3, 4, 5, 6];
const durationOptions = [30, 45, 60, 90];

export default function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('');
  const [equipment, setEquipment] = useState('');
  const [days, setDays] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalSteps = 4;

  const handleFinish = async () => {
    if (!days || !duration) {
      Alert.alert('Error', 'Please select your schedule');
      return;
    }
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      await updateDoc(doc(db, 'users', uid!), {
        goal, level, equipment,
        daysPerWeek: days,
        sessionDuration: duration,
        onboardingComplete: true,
      });

      const generatedPlan = generateWorkoutPlan({
        goal, level, equipment,
        daysPerWeek: days,
        sessionDuration: duration,
      });
      await setDoc(doc(db, 'plans', uid!), {
        days: generatedPlan,
        createdAt: new Date().toISOString(),
      });

      onComplete?.();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDots = () => (
    <View style={styles.dots}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
      ))}
    </View>
  );

  const renderStep = () => {
    if (step === 0) return (
      <View>
        <Text style={styles.title}>What's your goal?</Text>
        <Text style={styles.subtitle}>This helps us personalize your plan</Text>
        <View style={styles.grid}>
          {goals.map(g => (
            <TouchableOpacity
              key={g.label}
              style={[styles.card, goal === g.label && styles.cardSelected]}
              onPress={() => setGoal(g.label)}>
              <Text style={styles.cardEmoji}>{g.emoji}</Text>
              <Text style={styles.cardLabel}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );

    if (step === 1) return (
      <View>
        <Text style={styles.title}>Your fitness level?</Text>
        <Text style={styles.subtitle}>Be honest — we'll adjust accordingly</Text>
        <View style={styles.grid}>
          {levels.map(l => (
            <TouchableOpacity
              key={l.label}
              style={[styles.card, level === l.label && styles.cardSelected]}
              onPress={() => setLevel(l.label)}>
              <Text style={styles.cardEmoji}>{l.emoji}</Text>
              <Text style={styles.cardLabel}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );

    if (step === 2) return (
      <View>
        <Text style={styles.title}>Available equipment?</Text>
        <Text style={styles.subtitle}>We'll tailor exercises to what you have</Text>
        <View style={styles.grid}>
          {equipmentOptions.map(e => (
            <TouchableOpacity
              key={e.label}
              style={[styles.card, equipment === e.label && styles.cardSelected]}
              onPress={() => setEquipment(e.label)}>
              <Text style={styles.cardEmoji}>{e.emoji}</Text>
              <Text style={styles.cardLabel}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );

    if (step === 3) return (
      <View>
        <Text style={styles.title}>Your schedule</Text>
        <Text style={styles.subtitle}>How many days per week?</Text>
        <View style={styles.row}>
          {daysOptions.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.pill, days === d && styles.pillSelected]}
              onPress={() => setDays(d)}>
              <Text style={[styles.pillText, days === d && styles.pillTextSelected]}>{d} days</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.subtitle, { marginTop: 24 }]}>Session duration?</Text>
        <View style={styles.row}>
          {durationOptions.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.pill, duration === d && styles.pillSelected]}
              onPress={() => setDuration(d)}>
              <Text style={[styles.pillText, duration === d && styles.pillTextSelected]}>{d} min</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const canProceed = () => {
    if (step === 0) return !!goal;
    if (step === 1) return !!level;
    if (step === 2) return !!equipment;
    if (step === 3) return !!days && !!duration;
    return false;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderDots()}
      {renderStep()}
      <TouchableOpacity
        style={[styles.button, !canProceed() && styles.buttonDisabled]}
        onPress={step < totalSteps - 1 ? () => setStep(step + 1) : handleFinish}
        disabled={!canProceed() || loading}>
        {loading ? <ActivityIndicator color="#fff" /> :
          <Text style={styles.buttonText}>{step < totalSteps - 1 ? 'Continue' : 'Get My Plan'}</Text>}
      </TouchableOpacity>
      {step > 0 && (
        <TouchableOpacity onPress={() => setStep(step - 1)}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff', paddingTop: 60 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { width: 24, backgroundColor: '#4F46E5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  card: { width: '47%', borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, padding: 20, alignItems: 'center' },
  cardSelected: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  pill: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 24, paddingVertical: 10, paddingHorizontal: 20 },
  pillSelected: { borderColor: '#4F46E5', backgroundColor: '#4F46E5' },
  pillText: { fontSize: 14, fontWeight: '600', color: '#333' },
  pillTextSelected: { color: '#fff' },
  button: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  buttonDisabled: { backgroundColor: '#A5B4FC' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  back: { textAlign: 'center', color: '#666', marginTop: 16, fontSize: 14 },
});