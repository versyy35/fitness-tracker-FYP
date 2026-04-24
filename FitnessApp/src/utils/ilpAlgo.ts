import exercises from './exercises.json';

type Exercise = {
  id: string;
  title: string;
  desc: string;
  type: string;
  bodyPart: string;
  equipment: string;
  level: string;
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

// Map user equipment choice to dataset equipment values
const equipmentMap: Record<string, string[]> = {
  'No Equipment': ['Body Only', 'None'],
  'Dumbbells': ['Body Only', 'None', 'Dumbbell'],
  'Full Gym': ['Body Only', 'None', 'Dumbbell', 'Barbell', 'Cable', 'Machine', 'Kettlebells', 'E-Z Curl Bar'],
};

// Map user level to dataset level
const levelMap: Record<string, string[]> = {
  'Beginner': ['Beginner'],
  'Intermediate': ['Beginner', 'Intermediate'],
  'Advanced': ['Beginner', 'Intermediate', 'Expert'],
};

// Weekly split based on days per week
const splitMap: Record<number, { day: string; focus: string; muscles: string[] }[]> = {
  3: [
    { day: 'Day 1', focus: 'Push - Chest & Triceps', muscles: ['Chest', 'Triceps', 'Shoulders'] },
    { day: 'Day 2', focus: 'Pull - Back & Biceps', muscles: ['Lats', 'Middle Back', 'Biceps'] },
    { day: 'Day 3', focus: 'Legs & Core', muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Abdominals'] },
  ],
  4: [
    { day: 'Day 1', focus: 'Chest & Triceps', muscles: ['Chest', 'Triceps'] },
    { day: 'Day 2', focus: 'Back & Biceps', muscles: ['Lats', 'Middle Back', 'Biceps'] },
    { day: 'Day 3', focus: 'Legs', muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'] },
    { day: 'Day 4', focus: 'Shoulders & Core', muscles: ['Shoulders', 'Traps', 'Abdominals'] },
  ],
  5: [
    { day: 'Day 1', focus: 'Chest', muscles: ['Chest'] },
    { day: 'Day 2', focus: 'Back', muscles: ['Lats', 'Middle Back', 'Lower Back'] },
    { day: 'Day 3', focus: 'Legs', muscles: ['Quadriceps', 'Hamstrings', 'Glutes', 'Calves'] },
    { day: 'Day 4', focus: 'Shoulders', muscles: ['Shoulders', 'Traps'] },
    { day: 'Day 5', focus: 'Arms & Core', muscles: ['Biceps', 'Triceps', 'Abdominals'] },
  ],
  6: [
    { day: 'Day 1', focus: 'Chest & Triceps', muscles: ['Chest', 'Triceps'] },
    { day: 'Day 2', focus: 'Back & Biceps', muscles: ['Lats', 'Middle Back', 'Biceps'] },
    { day: 'Day 3', focus: 'Legs', muscles: ['Quadriceps', 'Hamstrings', 'Glutes'] },
    { day: 'Day 4', focus: 'Shoulders', muscles: ['Shoulders', 'Traps'] },
    { day: 'Day 5', focus: 'Arms', muscles: ['Biceps', 'Triceps', 'Forearms'] },
    { day: 'Day 6', focus: 'Core & Cardio', muscles: ['Abdominals', 'Abductors', 'Calves'] },
  ],
};

// How many exercises fit in a session based on duration
// Assume ~10 min per exercise (warm up + sets + rest)
const exercisesPerSession = (duration: number) => Math.floor(duration / 10);

export function generateWorkoutPlan(profile: UserProfile): WorkoutDay[] {
  const allowedEquipment = equipmentMap[profile.equipment] ?? equipmentMap['Full Gym'];
  const allowedLevels = levelMap[profile.level] ?? levelMap['Beginner'];
  const split = splitMap[profile.daysPerWeek] ?? splitMap[3];
  const maxExercises = exercisesPerSession(profile.sessionDuration);

  // Filter exercises by equipment and level
  const filtered = (exercises as Exercise[]).filter(ex =>
    allowedEquipment.includes(ex.equipment) &&
    allowedLevels.includes(ex.level)
  );

  const plan: WorkoutDay[] = split.map(({ day, focus, muscles }) => {
    const selected: Exercise[] = [];
    const usedTitles = new Set<string>();

    // Pick exercises per muscle group
    for (const muscle of muscles) {
      const pool = filtered.filter(ex =>
        ex.bodyPart === muscle && !usedTitles.has(ex.title)
      );
      // Shuffle for variety
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const pick = Math.max(1, Math.floor(maxExercises / muscles.length));
      shuffled.slice(0, pick).forEach(ex => {
        if (selected.length < maxExercises) {
          selected.push(ex);
          usedTitles.add(ex.title);
        }
      });
    }

    return { day, focus, exercises: selected };
  });

  return plan;
}