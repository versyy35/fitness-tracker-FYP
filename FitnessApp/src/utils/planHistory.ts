import {
  collection, addDoc, getDocs, getDoc, deleteDoc, doc, setDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from '../services/firebase';

export type PlanReason =
  | 'onboarding'
  | 'full_regenerate'
  | 'day_regenerate'
  | 'settings_change'
  | 'reroll';

const REASON_LABELS: Record<PlanReason, string> = {
  onboarding:       'Initial Plan',
  full_regenerate:  'Regenerated Plan',
  day_regenerate:   'Day Regenerated',
  settings_change:  'Settings Updated',
  reroll:           'Restored Plan',
};

export function reasonLabel(reason?: string) {
  return REASON_LABELS[reason as PlanReason] ?? 'Plan Update';
}

const MAX_HISTORY_ENTRIES = 15;

export interface PlanHistoryEntry {
  id: string;
  days: any[];
  createdAt: string;
  archivedAt: string;
  reason: PlanReason;
}

export async function replacePlan(uid: string, newDays: any[], reason: PlanReason) {
  const planRef = doc(db, 'plans', uid);
  const currentSnap = await getDoc(planRef);

  if (currentSnap.exists()) {
    const current = currentSnap.data();
    await addDoc(collection(db, 'planHistory', uid, 'entries'), {
      days:       current.days ?? [],
      createdAt:  current.createdAt ?? new Date().toISOString(),
      archivedAt: new Date().toISOString(),
      reason:     current.reason ?? 'full_regenerate',
    });
    await trimHistory(uid);
  }

  await setDoc(planRef, {
    days: newDays,
    createdAt: new Date().toISOString(),
    reason,
  });
}

async function trimHistory(uid: string) {
  const snap = await getDocs(
    query(collection(db, 'planHistory', uid, 'entries'), orderBy('archivedAt', 'desc'))
  );
  if (snap.docs.length > MAX_HISTORY_ENTRIES) {
    const excess = snap.docs.slice(MAX_HISTORY_ENTRIES);
    await Promise.all(excess.map(d => deleteDoc(d.ref)));
  }
}

export async function getPlanHistory(uid: string): Promise<PlanHistoryEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'planHistory', uid, 'entries'), orderBy('archivedAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function rerollToPlan(uid: string, entry: PlanHistoryEntry) {
  await replacePlan(uid, entry.days, 'reroll');
}

export async function deletePlanHistory(uid: string) {
  const snap = await getDocs(collection(db, 'planHistory', uid, 'entries'));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}