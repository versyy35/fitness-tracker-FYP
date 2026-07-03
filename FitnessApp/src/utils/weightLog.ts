import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '../services/firebase';

export interface WeightEntry {
  id: string;
  weight: number;
  date: string; // ISO timestamp
}

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

/**
 * Logs a new weight entry and keeps users/{uid}.weight, bmr, tdee in sync,
 * so Settings and Onboarding calculations stay correct automatically.
 */
export async function logWeight(uid: string, weight: number) {
  await addDoc(collection(db, 'weightLogs', uid, 'entries'), {
    weight,
    date: new Date().toISOString(),
  });

  const userSnap = await getDoc(doc(db, 'users', uid));
  const data = userSnap.data();
  if (!data) return;

  const bmr  = Math.round(calculateBMR(data.sex, weight, data.height, data.age));
  const tdee = calculateTDEE(bmr, data.daysPerWeek ?? 3);

  await updateDoc(doc(db, 'users', uid), { weight, bmr, tdee });
}

/** Returns weight entries, oldest first (good for trend display). */
export async function getWeightLogs(uid: string): Promise<WeightEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'weightLogs', uid, 'entries'), orderBy('date', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}