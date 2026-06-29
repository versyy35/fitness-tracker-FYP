import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { generateWorkoutPlan } from '../utils/ilpAlgo';

const goals = [
  { label: 'Build Muscle', emoji: '💪' },
  { label: 'Lose Weight',  emoji: '🔥' },
  { label: 'Maintain',     emoji: '⚖️' },
  { label: 'Stay Healthy', emoji: '❤️' },
];

const levels = [
  { label: 'Beginner',     emoji: '🌱' },
  { label: 'Intermediate', emoji: '⚡' },
  { label: 'Advanced',     emoji: '🏆' },
];

const equipmentOptions = [
  { label: 'No Equipment', emoji: '🏠' },
  { label: 'Dumbbells',    emoji: '🏋️' },
  { label: 'Full Gym',     emoji: '💪' },
];

const daysOptions     = [3, 4, 5, 6];
const durationOptions = [30, 45, 60, 90];

// Mifflin-St Jeor (tdeecalculator.net constants)
function calculateBMR(sex: string, weight: number, height: number, age: number): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'Male' ? base + 5 : base - 151;
}

// daysPerWeek → activity multiplier
function getActivityMultiplier(daysPerWeek: number): number {
  if (daysPerWeek <= 3) return 1.375;
  if (daysPerWeek <= 5) return 1.55;
  return 1.725;
}

function calculateTDEE(bmr: number, daysPerWeek: number): number {
  return Math.round(bmr * getActivityMultiplier(daysPerWeek));
}

export default function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal]         = useState('');
  const [level, setLevel]       = useState('');
  const [equipment, setEquipment] = useState('');
  const [sex, setSex]           = useState<'Male' | 'Female' | ''>('');
  const [age, setAge]           = useState('');
  const [weight, setWeight]     = useState('');
  const [height, setHeight]     = useState('');
  const [days, setDays]         = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading]   = useState(false);

  const totalSteps = 5;

  const handleFinish = async () => {
    if (!days || !duration) { Alert.alert('Error', 'Please select your schedule'); return; }
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not logged in');

      const ageNum    = parseInt(age, 10);
      const weightNum = parseFloat(weight);
      const heightNum = parseFloat(height);
      const bmr       = Math.round(calculateBMR(sex, weightNum, heightNum, ageNum));
      const tdee      = calculateTDEE(bmr, days);

      await updateDoc(doc(db, 'users', uid), {
        goal, level, equipment,
        sex, age: ageNum, weight: weightNum, height: heightNum,
        bmr, tdee,
        daysPerWeek: days, sessionDuration: duration,
        onboardingComplete: true,
      });

      const generatedPlan = generateWorkoutPlan({ goal, level, equipment, daysPerWeek: days, sessionDuration: duration });
      await setDoc(doc(db, 'plans', uid), { days: generatedPlan, createdAt: new Date().toISOString() });
      onComplete?.();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = (): boolean => {
    if (step === 0) return !!goal;
    if (step === 1) return !!level;
    if (step === 2) return !!equipment;
    if (step === 3) {
      const a = parseInt(age, 10), w = parseFloat(weight), h = parseFloat(height);
      return !!sex && !isNaN(a) && a > 0 && a < 120 && !isNaN(w) && w > 0 && !isNaN(h) && h > 0;
    }
    if (step === 4) return !!days && !!duration;
    return false;
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
            <TouchableOpacity key={g.label} style={[styles.card, goal === g.label && styles.cardSelected]} onPress={() => setGoal(g.label)}>
              <Text style={styles.cardEmoji}>{g.emoji}</Text>
              <Text style={[styles.cardLabel, goal === g.label && styles.cardLabelSelected]}>{g.label}</Text>
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
            <TouchableOpacity key={l.label} style={[styles.card, level === l.label && styles.cardSelected]} onPress={() => setLevel(l.label)}>
              <Text style={styles.cardEmoji}>{l.emoji}</Text>
              <Text style={[styles.cardLabel, level === l.label && styles.cardLabelSelected]}>{l.label}</Text>
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
            <TouchableOpacity key={e.label} style={[styles.card, equipment === e.label && styles.cardSelected]} onPress={() => setEquipment(e.label)}>
              <Text style={styles.cardEmoji}>{e.emoji}</Text>
              <Text style={[styles.cardLabel, equipment === e.label && styles.cardLabelSelected]}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );

    if (step === 3) return (
      <View>
        <Text style={styles.title}>Your body stats</Text>
        <Text style={styles.subtitle}>Used to calculate your daily calorie target (TDEE)</Text>

        <Text style={styles.fieldLabel}>Biological sex</Text>
        <View style={styles.row}>
          {(['Male', 'Female'] as const).map(s => (
            <TouchableOpacity key={s} style={[styles.pill, sex === s && styles.pillSelected]} onPress={() => setSex(s)}>
              <Text style={[styles.pillText, sex === s && styles.pillTextSelected]}>{s === 'Male' ? '♂ Male' : '♀ Female'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Age</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="e.g. 22" placeholderTextColor="#aaa" value={age} onChangeText={setAge} maxLength={3} />
          <Text style={styles.inputUnit}>years</Text>
        </View>

        <Text style={styles.fieldLabel}>Weight</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="e.g. 70" placeholderTextColor="#aaa" value={weight} onChangeText={setWeight} maxLength={5} />
          <Text style={styles.inputUnit}>kg</Text>
        </View>

        <Text style={styles.fieldLabel}>Height</Text>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="e.g. 170" placeholderTextColor="#aaa" value={height} onChangeText={setHeight} maxLength={5} />
          <Text style={styles.inputUnit}>cm</Text>
        </View>

        {canProceed() && (() => {
          const bmrVal  = Math.round(calculateBMR(sex, parseFloat(weight), parseFloat(height), parseInt(age, 10)));
          const tdeeVal = calculateTDEE(bmrVal, days || 3);
          return (
            <View style={styles.tdeePreview}>
              <Text style={styles.tdeeLabel}>Estimated daily calories (TDEE)</Text>
              <Text style={styles.tdeeValue}>{tdeeVal} kcal / day</Text>
              <Text style={styles.tdeeNote}>Based on Mifflin-St Jeor · will refine after schedule</Text>
            </View>
          );
        })()}
      </View>
    );

    if (step === 4) return (
      <View>
        <Text style={styles.title}>Your schedule</Text>
        <Text style={styles.subtitle}>How many days per week?</Text>
        <View style={styles.row}>
          {daysOptions.map(d => (
            <TouchableOpacity key={d} style={[styles.pill, days === d && styles.pillSelected]} onPress={() => setDays(d)}>
              <Text style={[styles.pillText, days === d && styles.pillTextSelected]}>{d} days</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subtitle, { marginTop: 28 }]}>Session duration?</Text>
        <View style={styles.row}>
          {durationOptions.map(d => (
            <TouchableOpacity key={d} style={[styles.pill, duration === d && styles.pillSelected]} onPress={() => setDuration(d)}>
              <Text style={[styles.pillText, duration === d && styles.pillTextSelected]}>{d} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        {days > 0 && sex && age && weight && height && (() => {
          const bmrVal  = Math.round(calculateBMR(sex, parseFloat(weight), parseFloat(height), parseInt(age, 10)));
          const tdeeVal = calculateTDEE(bmrVal, days);
          return (
            <View style={styles.tdeePreview}>
              <Text style={styles.tdeeLabel}>Your daily calorie target (TDEE)</Text>
              <Text style={styles.tdeeValue}>{tdeeVal} kcal / day</Text>
              <Text style={styles.tdeeNote}>
                {goal === 'Lose Weight'   ? 'Aim to eat ~300–500 kcal below this to lose weight steadily'
                : goal === 'Build Muscle' ? 'Aim to eat ~200–300 kcal above this to build muscle'
                :                          'Eat close to this to maintain your current weight'}
              </Text>
            </View>
          );
        })()}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {renderDots()}
        {renderStep()}
        <TouchableOpacity
          style={[styles.button, !canProceed() && styles.buttonDisabled]}
          onPress={step < totalSteps - 1 ? () => setStep(step + 1) : handleFinish}
          disabled={!canProceed() || loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{step < totalSteps - 1 ? 'Continue' : 'Generate My Plan'}</Text>}
        </TouchableOpacity>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)} disabled={loading}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:          { flexGrow: 1, padding: 24, paddingBottom: 48, backgroundColor: '#fff' },
  dots:               { flexDirection: 'row', justifyContent: 'center', marginBottom: 32, gap: 8 },
  dot:                { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive:          { width: 24, backgroundColor: '#4F46E5' },
  title:              { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 6 },
  subtitle:           { fontSize: 15, color: '#666', marginBottom: 24 },
  grid:               { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:               { width: '47%', padding: 20, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#FAFAFA' },
  cardSelected:       { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  cardEmoji:          { fontSize: 28, marginBottom: 8 },
  cardLabel:          { fontSize: 14, fontWeight: '600', color: '#444', textAlign: 'center' },
  cardLabelSelected:  { color: '#4F46E5' },
  row:                { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  pill:               { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  pillSelected:       { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  pillText:           { fontSize: 14, fontWeight: '600', color: '#444' },
  pillTextSelected:   { color: '#4F46E5' },
  fieldLabel:         { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 20, marginBottom: 8 },
  inputRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input:              { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111', backgroundColor: '#FAFAFA' },
  inputUnit:          { fontSize: 14, color: '#666', width: 36 },
  tdeePreview:        { marginTop: 24, padding: 16, borderRadius: 12, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  tdeeLabel:          { fontSize: 12, fontWeight: '600', color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tdeeValue:          { fontSize: 28, fontWeight: '800', color: '#4F46E5', marginBottom: 6 },
  tdeeNote:           { fontSize: 12, color: '#6366F1', lineHeight: 18 },
  button:             { backgroundColor: '#4F46E5', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 36 },
  buttonDisabled:     { backgroundColor: '#A5B4FC' },
  buttonText:         { color: '#fff', fontSize: 16, fontWeight: '700' },
  backButton:         { alignItems: 'center', marginTop: 16, padding: 8 },
  backText:           { color: '#6B7280', fontSize: 14, fontWeight: '500' },
});