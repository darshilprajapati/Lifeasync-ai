export interface Exercise {
  id: number;
  name: string;
  category: string;
  targetMuscles: string;
  requiresEquipment: boolean;
  equipmentType: string;
  difficultyLevel: string;
  defaultSets: number;
  defaultReps: number;
  defaultRestSeconds: number;
  estimatedMetValue: number;
  thumbnailUrl?: string;
  animationUrl?: string;
  instructions?: string;
}

export interface WorkoutDayExercise {
  id: number;
  workoutDayId: number;
  exerciseId: number;
  exerciseName: string;
  category: string;
  targetMuscles: string;
  requiresEquipment: boolean;
  equipmentType: string;
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
  estimatedMetValue: number;
  instructions?: string;
  isCompleted?: boolean;
  completedAt?: string;
  actualDurationMinutes?: number;
}

export interface WorkoutDay {
  id: number;
  workoutPlanId: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  focusTitle: string;
  isRestDay: boolean;
  targetDurationMinutes: number;
  restDayNotes?: string;
  exercises: WorkoutDayExercise[];
  isCompletedForDate: boolean;
  completedAt?: string;
  actualDurationMinutes?: number;
  estimatedCaloriesBurned?: number;
  sessionLogId?: number;
  completedExercisesCount?: number;
  totalExercisesCount?: number;
  targetMuscleGroups?: string;
}

export interface UserWorkoutPlan {
  id: number;
  userId: number;
  title: string;
  goal: string;
  fitnessLevel: string;
  daysPerWeek: number;
  isActive: boolean;
  version: number;
  effectiveStartDate: string;
  days: WorkoutDay[];
}

export interface WorkoutSessionLog {
  id: number;
  userId: number;
  workoutPlanId: number;
  workoutDayId: number;
  sessionDate: string;
  isCompleted: boolean;
  completedAt: string;
  actualDurationMinutes: number;
  estimatedCaloriesBurned: number;
  healthLogId?: number;
  notes?: string;
}

export interface WorkoutWeekSummary {
  weekStartDate: string;
  weekEndDate: string;
  totalPlannedWorkouts: number;
  completedWorkouts: number;
  totalScheduledExercises?: number;
  completedExercises?: number;
  totalMinutesExercised: number;
  totalEstimatedCaloriesBurned: number;
  adherenceRatePercentage: number;
  muscleGroupFocusPercentages: Record<string, number>;
  completedMuscleGroupFocusPercentages?: Record<string, number>;
  personalizedCoachingTips?: string[];
}

export interface AiWorkoutPlanResponse {
  title: string;
  goal: string;
  fitnessLevel: string;
  daysPerWeek: number;
  splitDescription: string;
  aiReasoning: string;
  source: string;
  suggestedDays: WorkoutDay[];
}

export interface GenerateAiWorkoutPlanRequest {
  goal: string;
  fitnessLevel: string;
  daysPerWeek: number;
  preferredDurationMinutes: number;
  workoutMode?: string;
  hasEquipment: boolean;
  availableEquipment: string[];
  focusAreas: string[];
}

export interface WorkoutDayExerciseInput {
  exerciseId: number;
  sets: number;
  reps: number;
  restSeconds: number;
  orderIndex: number;
}

export interface UpdateWorkoutDayInput {
  dayOfWeek: number;
  focusTitle: string;
  isRestDay: boolean;
  targetDurationMinutes: number;
  restDayNotes?: string;
  targetDate?: string;
  exercises: WorkoutDayExerciseInput[];
}
