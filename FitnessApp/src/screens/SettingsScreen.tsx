import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import {
  updatePassword, updateEmail, deleteUser, reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import { generateWorkoutPlan } from '../utils/ilpAlgo';
import { replacePlan, deletePlanHistory } from '../utils/planHistory';

const goals         = ['Build Muscle', 'Lose Weight', 'Maintain', 'Stay Healthy'];
const levels        = ['Beginner', 'Intermediate', 'Advanced'];
const equipmentOpts = ['No Equipment', 'Dumbbells', 'Full Gym'];
const durationOpts  = [30, 45, 60, 90];
const ALL_DAYS      = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_ORDER     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function calculateBMR(sex: string, weight: number, height: number, age: number): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'Male' ? base + 5 : base - 151;
}
function getActivityMultiplier(daysPerWeek: number): number {
  if (daysPerWeek <= 3) return 1.375;
  if (daysPerWeek <= 5) return 1.55;
  return 1.725;
}
function calculateTDEE(bmr: number, daysPerWeek: number): number {
  return Math.round(bmr * getActivityMultiplier(daysPerWeek));
}

// ── Helper components (must be above SettingsScreen) ─────────────────────────

function SectionHeader({ title, open, onPress }: { title: string; open: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onPress}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <Text style={styles.sectionHeaderChevron}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function SaveButton({ onPress, saving }: { onPress: () => void; saving: boolean }) {
  return (
    <TouchableOpacity style={styles.saveButton} onPress={onPress} disabled={saving}>
      {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
    </TouchableOpacity>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsScreen({ navigation }: any) {
  const [userData, setUserData]           = useState<any>(null);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Profile
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');

  // Fitness preferences
  const [goal, setGoal]           = useState('');
  const [level, setLevel]         = useState('');
  const [equipment, setEquipment] = useState('');

  // Schedule
  const [days, setDays]               = useState(0);
  const [duration, setDuration]       = useState(0);
  const [workoutDays, setWorkoutDays] = useState<string[]>([]);
  const [scheduleSubStep, setScheduleSubStep] = useState<'count' | 'days'>('count');

  // Body stats
  const [sex, setSex]       = useState('');
  const [age, setAge]       = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useFocusEffect(useCallback(() => {
    const fetchUser = async () => {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const snap = await getDoc(doc(db, 'users', uid));
      const data = snap.data();
      setUserData(data);
      setName(data?.name ?? '');
      setEmail(auth.currentUser?.email ?? '');
      setGoal(data?.goal ?? '');
      setLevel(data?.level ?? '');
      setEquipment(data?.equipment ?? '');
      setDays(data?.daysPerWeek ?? 3);
      setDuration(data?.sessionDuration ?? 45);
      setWorkoutDays(data?.workoutDays ?? []);
      setSex(data?.sex ?? '');
      setAge(String(data?.age ?? ''));
      setWeight(String(data?.weight ?? ''));
      setHeight(String(data?.height ?? ''));
      setLoading(false);
    };
    fetchUser();
  }, []));

  // ── Save helpers ────────────────────────────────────────────────────────────

  const needsPlanRegen = (section: string) =>
    ['fitness', 'schedule', 'body'].includes(section);

  const confirmAndSave = (section: string, saveFn: () => Promise<void>) => {
    if (needsPlanRegen(section)) {
      Alert.alert(
        'Regenerate Plan?',
        'Your plan will be regenerated based on your new settings. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save & Regenerate', onPress: () => save(section, saveFn) },
        ]
      );
    } else {
      save(section, saveFn);
    }
  };

  const save = async (section: string, saveFn: () => Promise<void>) => {
    setSaving(true);
    try {
      await saveFn();
      if (needsPlanRegen(section)) await regenPlan();
      Alert.alert('Saved!', 'Your settings have been updated.', [{ text: 'OK' }]);
      setActiveSection(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const regenPlan = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const snap    = await getDoc(doc(db, 'users', uid));
    const data    = snap.data();
    const newPlan = generateWorkoutPlan({
      goal:            data?.goal,
      level:           data?.level,
      equipment:       data?.equipment,
      daysPerWeek:     data?.daysPerWeek,
      sessionDuration: data?.sessionDuration,
    });
      await replacePlan(uid, newPlan, 'settings_change');
  };

  // ── Section saves ───────────────────────────────────────────────────────────

  const saveProfile = () => confirmAndSave('profile', async () => {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'users', uid!), { name });
    if (email !== auth.currentUser?.email) {
      await updateEmail(auth.currentUser!, email);
    }
  });

  const saveFitness = () => confirmAndSave('fitness', async () => {
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, 'users', uid!), { goal, level, equipment });
  });

  const saveSchedule = () => {
    if (workoutDays.length !== days) {
      Alert.alert('Error', `Please select exactly ${days} workout days.`);
      return;
    }
    const sorted = [...workoutDays].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
    confirmAndSave('schedule', async () => {
      const uid = auth.currentUser?.uid;
      await updateDoc(doc(db, 'users', uid!), {
        daysPerWeek: days, sessionDuration: duration, workoutDays: sorted,
      });
    });
  };

  const saveBodyStats = () => {
    const ageNum    = parseInt(age, 10);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    if (!sex || isNaN(ageNum) || isNaN(weightNum) || isNaN(heightNum)) {
      Alert.alert('Error', 'Please fill in all body stats.');
      return;
    }
    confirmAndSave('body', async () => {
      const uid  = auth.currentUser?.uid;
      const bmr  = Math.round(calculateBMR(sex, weightNum, heightNum, ageNum));
      const tdee = calculateTDEE(bmr, days);
      await updateDoc(doc(db, 'users', uid!), {
        sex, age: ageNum, weight: weightNum, height: heightNum, bmr, tdee,
      });
    });
  };

  const savePassword = () => confirmAndSave('password', async () => {
    if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
    const credential = EmailAuthProvider.credential(auth.currentUser!.email!, currentPassword);
    await reauthenticateWithCredential(auth.currentUser!, credential);
    await updatePassword(auth.currentUser!, newPassword);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  });

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Confirm Password',
              'Enter your password to confirm.',
              async (password) => {
                try {
                  const credential = EmailAuthProvider.credential(auth.currentUser!.email!, password);
                  await reauthenticateWithCredential(auth.currentUser!, credential);
                  const uid = auth.currentUser!.uid;
                  await deleteDoc(doc(db, 'users', uid));
                  await deleteDoc(doc(db, 'plans', uid));
                  await deletePlanHistory(uid);
                  await deleteUser(auth.currentUser!);
                } catch (e: any) {
                  Alert.alert('Error', e.message);
                }
              }
            );
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  const toggle = (section: string) =>
    setActiveSection(prev => prev === section ? null : section);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {userData?.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.avatarName}>{userData?.name}</Text>
        <Text style={styles.avatarEmail}>{auth.currentUser?.email}</Text>
      </View>

      {/* Profile */}
      <SectionHeader title="Profile" open={activeSection === 'profile'} onPress={() => toggle('profile')} />
      {activeSection === 'profile' && (
        <View style={styles.sectionBody}>
          <FieldLabel label="Name" />
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />
          <FieldLabel label="Email" />
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <SaveButton onPress={saveProfile} saving={saving} />
        </View>
      )}

      {/* Fitness Preferences */}
      <SectionHeader title="Fitness Preferences" open={activeSection === 'fitness'} onPress={() => toggle('fitness')} />
      {activeSection === 'fitness' && (
        <View style={styles.sectionBody}>
          <FieldLabel label="Goal" />
          <View style={styles.optionRow}>
            {goals.map(g => (
              <TouchableOpacity key={g} style={[styles.optionPill, goal === g && styles.optionPillSelected]} onPress={() => setGoal(g)}>
                <Text style={[styles.optionText, goal === g && styles.optionTextSelected]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FieldLabel label="Level" />
          <View style={styles.optionRow}>
            {levels.map(l => (
              <TouchableOpacity key={l} style={[styles.optionPill, level === l && styles.optionPillSelected]} onPress={() => setLevel(l)}>
                <Text style={[styles.optionText, level === l && styles.optionTextSelected]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FieldLabel label="Equipment" />
          <View style={styles.optionRow}>
            {equipmentOpts.map(e => (
              <TouchableOpacity key={e} style={[styles.optionPill, equipment === e && styles.optionPillSelected]} onPress={() => setEquipment(e)}>
                <Text style={[styles.optionText, equipment === e && styles.optionTextSelected]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <SaveButton onPress={saveFitness} saving={saving} />
        </View>
      )}

      {/* Schedule */}
      <SectionHeader title="Schedule" open={activeSection === 'schedule'} onPress={() => toggle('schedule')} />
      {activeSection === 'schedule' && (
        <View style={styles.sectionBody}>
          {scheduleSubStep === 'count' ? (
            <>
              <FieldLabel label="Days per week" />
              <View style={styles.optionRow}>
                {[1,2,3,4,5,6,7].map(d => (
                  <TouchableOpacity key={d} style={[styles.optionPill, days === d && styles.optionPillSelected]} onPress={() => { setDays(d); setWorkoutDays([]); }}>
                    <Text style={[styles.optionText, days === d && styles.optionTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <FieldLabel label="Session duration" />
              <View style={styles.optionRow}>
                {durationOpts.map(d => (
                  <TouchableOpacity key={d} style={[styles.optionPill, duration === d && styles.optionPillSelected]} onPress={() => setDuration(d)}>
                    <Text style={[styles.optionText, duration === d && styles.optionTextSelected]}>{d} min</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {days > 0 && duration > 0 && (
                <TouchableOpacity style={styles.subStepButton} onPress={() => setScheduleSubStep('days')}>
                  <Text style={styles.subStepButtonText}>Pick Your Days →</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Pick {days} workout day{days > 1 ? 's' : ''} ({workoutDays.length}/{days})</Text>
              <View style={styles.optionRow}>
                {ALL_DAYS.map(day => {
                  const selected   = workoutDays.includes(day);
                  const maxReached = workoutDays.length >= days && !selected;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.optionPill, selected && styles.optionPillSelected, maxReached && { opacity: 0.4 }]}
                      onPress={() => {
                        if (maxReached) return;
                        setWorkoutDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
                      }}
                      disabled={maxReached}>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity onPress={() => setScheduleSubStep('count')} style={{ marginTop: 8 }}>
                <Text style={styles.backLink}>← Change count</Text>
              </TouchableOpacity>
              {workoutDays.length === days && <SaveButton onPress={saveSchedule} saving={saving} />}
            </>
          )}
        </View>
      )}

      {/* Body Stats */}
      <SectionHeader title="Body Stats" open={activeSection === 'body'} onPress={() => toggle('body')} />
      {activeSection === 'body' && (
        <View style={styles.sectionBody}>
          <FieldLabel label="Biological sex" />
          <View style={styles.optionRow}>
            {['Male', 'Female'].map(s => (
              <TouchableOpacity key={s} style={[styles.optionPill, sex === s && styles.optionPillSelected]} onPress={() => setSex(s)}>
                <Text style={[styles.optionText, sex === s && styles.optionTextSelected]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FieldLabel label="Age" />
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="e.g. 22" />
          <FieldLabel label="Weight (kg)" />
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 70" />
          <FieldLabel label="Height (cm)" />
          <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="e.g. 170" />
          <SaveButton onPress={saveBodyStats} saving={saving} />
        </View>
      )}

      {/* Change Password */}
      <SectionHeader title="Change Password" open={activeSection === 'password'} onPress={() => toggle('password')} />
      {activeSection === 'password' && (
        <View style={styles.sectionBody}>
          <FieldLabel label="Current password" />
          <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="••••••••" />
          <FieldLabel label="New password" />
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="••••••••" />
          <FieldLabel label="Confirm new password" />
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="••••••••" />
          <SaveButton onPress={savePassword} saving={saving} />
        </View>
      )}

      {/* Danger Zone */}
      <View style={styles.dangerSection}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>🗑 Delete Account</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#f5f5f5' },
  content:              { padding: 24, paddingTop: 60, paddingBottom: 48 },
  title:                { fontSize: 26, fontWeight: 'bold', marginBottom: 24 },
  avatarSection:        { alignItems: 'center', marginBottom: 32 },
  avatarPlaceholder:    { width: 90, height: 90, borderRadius: 45, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:        { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  avatarName:           { fontSize: 18, fontWeight: '700', marginTop: 10 },
  avatarEmail:          { fontSize: 14, color: '#666', marginTop: 2 },
  sectionHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 2 },
  sectionHeaderText:    { fontSize: 15, fontWeight: '600' },
  sectionHeaderChevron: { fontSize: 12, color: '#999' },
  sectionBody:          { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  fieldLabel:           { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 6 },
  input:                { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#FAFAFA', marginBottom: 4 },
  optionRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionPill:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA' },
  optionPillSelected:   { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  optionText:           { fontSize: 13, fontWeight: '600', color: '#444' },
  optionTextSelected:   { color: '#4F46E5' },
  subStepButton:        { backgroundColor: '#4F46E5', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 16 },
  subStepButtonText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  backLink:             { color: '#6B7280', fontSize: 13 },
  saveButton:           { backgroundColor: '#4F46E5', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  saveButtonText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  dangerSection:        { marginTop: 24 },
  deleteButton:         { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  deleteButtonText:     { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});