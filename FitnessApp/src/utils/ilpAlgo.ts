import exercises from './exercises.json';

type Exercise = {
  id: string;
  title: string;
  desc: string;
  type: string;
  bodyPart: string;
  equipment: string;
  level: string;
  sets: number;
  reps: number;
  rest: number; // seconds
};

type UserProfile = {
  goal: string;
  level: string;
  equipment: string;
  daysPerWeek: number;
  sessionDuration: number;
};

type WorkoutDay = {
  day: string;
  focus: string;
  exercises: Exercise[];
};

const equipmentMap: Record<string, string[]> = {
  'No Equipment': ['Body Only', 'None'],
  'Dumbbells': ['Body Only', 'None', 'Dumbbell'],
  'Full Gym': ['Body Only', 'None', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Kettlebells', 'E-Z Curl Bar'],
};

const levelMap: Record<string, string[]> = {
  'Beginner':     ['Beginner'],
  'Intermediate': ['Beginner', 'Intermediate'],
  'Advanced':     ['Beginner', 'Intermediate', 'Expert'],
};

const splitMap: Record<number, { day: string; focus: string; muscles: string[] }[]> = {
  3: [
    { day: 'Day 1', focus: 'Push - Chest & Triceps', muscles: ['Chest', 'Triceps', 'Shoulders'] },
    { day: 'Day 2', focus: 'Pull - Back & Biceps',   muscles: ['Lats', 'Middle Back', 'Biceps'] },
    { day: 'Day 3', focus: 'Legs & Core',             muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Abdominals'] },
  ],
  4: [
    { day: 'Day 1', focus: 'Chest & Triceps',   muscles: ['Chest', 'Triceps'] },
    { day: 'Day 2', focus: 'Back & Biceps',     muscles: ['Lats', 'Middle Back', 'Biceps'] },
    { day: 'Day 3', focus: 'Legs',              muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'] },
    { day: 'Day 4', focus: 'Shoulders & Core', muscles: ['Shoulders', 'Traps', 'Abdominals'] },
  ],
  5: [
    { day: 'Day 1', focus: 'Chest',      muscles: ['Chest'] },
    { day: 'Day 2', focus: 'Back',       muscles: ['Lats', 'Middle Back', 'Lower Back'] },
    { day: 'Day 3', focus: 'Legs',       muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'] },
    { day: 'Day 4', focus: 'Shoulders', muscles: ['Shoulders', 'Traps'] },
    { day: 'Day 5', focus: 'Arms & Core', muscles: ['Biceps', 'Triceps', 'Abdominals'] },
  ],
  6: [
    { day: 'Day 1', focus: 'Chest & Triceps', muscles: ['Chest', 'Triceps'] },
    { day: 'Day 2', focus: 'Back & Biceps',   muscles: ['Lats', 'Middle Back', 'Biceps'] },
    { day: 'Day 3', focus: 'Legs',            muscles: ['Quadriceps', 'Hamstrings', 'Glutes'] },
    { day: 'Day 4', focus: 'Shoulders',       muscles: ['Shoulders', 'Traps'] },
    { day: 'Day 5', focus: 'Arms',            muscles: ['Biceps', 'Triceps', 'Forearms'] },
    { day: 'Day 6', focus: 'Core & Cardio',   muscles: ['Abdominals', 'Abductors', 'Calves'] },
  ],
};

const exercisesPerSession = (duration: number) => Math.floor(duration / 10);

// ─── Sets / Reps / Rest logic ──────────────────────────────────────────────────
//
// Goal base:
//   Build Muscle  → 4 sets, 6 reps, 90s rest
//   Lose Weight   → 3 sets, 12 reps, 45s rest  (capped at 12)
//   Maintain      → 3 sets, 10 reps, 60s rest
//   Stay Healthy  → 2 sets, 10 reps, 60s rest
//
// Level modifier (applied to base sets & reps):
//   Beginner      → sets −1, reps +2
//   Intermediate  → sets  0, reps  0
//   Advanced      → sets +1, reps −1
//
// Exercise type modifier (applied to reps only):
//   Cardio / Plyometrics → reps +3  (they naturally need more volume)
//   Strength             → no change
//
// All reps clamped to [4, 12].
// Progressive overload hint: if user hits 12 reps easily → increase weight.
//                            if user can't reach 4 reps → decrease weight.

function getSetsReps(goal: string, level: string, exerciseType: string): {
  sets: number;
  reps: number;
  rest: number;
} {
  // Base from goal
  let sets: number, reps: number, rest: number;
  switch (goal) {
    case 'Build Muscle':
      sets = 4; reps = 6; rest = 90; break;
    case 'Lose Weight':
      sets = 3; reps = 12; rest = 45; break;
    case 'Maintain':
      sets = 3; reps = 10; rest = 60; break;
    case 'Stay Healthy':
    default:
      sets = 2; reps = 10; rest = 60; break;
  }

  // Level modifier
  switch (level) {
    case 'Beginner':
      sets -= 1; reps += 2; break;
    case 'Advanced':
      sets += 1; reps -= 1; break;
    // Intermediate: no change
  }

  // Exercise type modifier
  if (exerciseType === 'Cardio' || exerciseType === 'Plyometrics') {
    reps += 3;
  }

  // Clamp reps to [4, 12]
  reps = Math.min(12, Math.max(4, reps));

  // Ensure sets never goes below 1
  sets = Math.max(1, sets);

  return { sets, reps, rest };
}

export function generateWorkoutPlan(profile: UserProfile): WorkoutDay[] {
  const allowedEquipment = equipmentMap[profile.equipment] ?? equipmentMap['Full Gym'];
  const allowedLevels    = levelMap[profile.level] ?? levelMap['Beginner'];
  const split            = splitMap[profile.daysPerWeek] ?? splitMap[3];
  const maxExercises     = exercisesPerSession(profile.sessionDuration);

  const filtered = (exercises as any[]).filter(ex =>
    allowedEquipment.includes(ex.equipment) &&
    allowedLevels.includes(ex.level)
  );

  const plan: WorkoutDay[] = split.map(({ day, focus, muscles }) => {
    const selected: Exercise[] = [];
    const usedTitles = new Set<string>();

    for (const muscle of muscles) {
      const pool = filtered.filter(ex =>
        ex.bodyPart === muscle && !usedTitles.has(ex.title)
      );
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const pick = Math.max(1, Math.floor(maxExercises / muscles.length));
      shuffled.slice(0, pick).forEach(ex => {
        if (selected.length < maxExercises) {
          const { sets, reps, rest } = getSetsReps(profile.goal, profile.level, ex.type);
          selected.push({ ...ex, sets, reps, rest });
          usedTitles.add(ex.title);
        }
      });
    }

    return { day, focus, exercises: selected };
  });

  return plan;
}