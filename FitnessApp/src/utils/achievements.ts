export interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  check: (userData: any) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: 'first_workout',
    emoji: '🎯',
    label: 'First Step',
    description: 'Complete your first workout',
    check: (u) => (u?.totalWorkouts ?? 0) >= 1,
  },
  {
    id: 'five_workouts',
    emoji: '🔥',
    label: 'Getting Started',
    description: 'Complete 5 workouts',
    check: (u) => (u?.totalWorkouts ?? 0) >= 5,
  },
  {
    id: 'ten_workouts',
    emoji: '💪',
    label: 'Committed',
    description: 'Complete 10 workouts',
    check: (u) => (u?.totalWorkouts ?? 0) >= 10,
  },
  {
    id: 'twentyfive_workouts',
    emoji: '🏆',
    label: 'Dedicated',
    description: 'Complete 25 workouts',
    check: (u) => (u?.totalWorkouts ?? 0) >= 25,
  },
  {
    id: 'first_week_streak',
    emoji: '⚡',
    label: 'Week Warrior',
    description: 'Hit your weekly workout target for the first time',
    check: (u) => (u?.streak ?? 0) >= 1,
  },
  {
    id: 'four_week_streak',
    emoji: '👑',
    label: 'Consistency Champion',
    description: 'Hit your weekly target 4 weeks in a row',
    check: (u) => (u?.streak ?? 0) >= 4,
  },
];

export function getBadgeProgress(userData: any) {
  return BADGES.map(b => ({ ...b, unlocked: b.check(userData) }));
}