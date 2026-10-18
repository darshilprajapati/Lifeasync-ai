import apiClient from '../../../api/apiClient';
import type {
  Exercise,
  CreateCustomExerciseInput,
  UserWorkoutPlan,
  WorkoutDay,
  WorkoutSessionLog,
  WorkoutWeekSummary,
  AiWorkoutPlanResponse,
  GenerateAiWorkoutPlanRequest,
  UpdateWorkoutDayInput
} from '../types/workout';

export interface ExerciseQueryParams {
  requiresEquipment?: boolean;
  category?: string;
  search?: string;
  equipmentList?: string[];
}

export const workoutService = {
  getExercises: async (params?: ExerciseQueryParams): Promise<Exercise[]> => {
    const query = new URLSearchParams();
    if (params?.requiresEquipment !== undefined) {
      query.append('requiresEquipment', String(params.requiresEquipment));
    }
    if (params?.category && params.category !== 'All') {
      query.append('category', params.category);
    }
    if (params?.search) {
      query.append('search', params.search);
    }
    if (params?.equipmentList && params.equipmentList.length > 0) {
      params.equipmentList.forEach((eq) => query.append('equipmentList', eq));
    }

    const res = await apiClient.get(`/api/workout/exercises?${query.toString()}`);
    return res.data?.data || [];
  },

  createCustomExercise: async (data: CreateCustomExerciseInput): Promise<Exercise> => {
    const res = await apiClient.post('/api/workout/exercises/custom', data);
    return res.data?.data;
  },

  getActivePlan: async (targetDate?: string): Promise<UserWorkoutPlan> => {
    const query = targetDate ? `?targetDate=${encodeURIComponent(targetDate)}` : '';
    const res = await apiClient.get(`/api/workout/plan${query}`);
    return res.data?.data;
  },

  createOrUpdatePlan: async (plan: {
    title: string;
    goal: string;
    fitnessLevel: string;
    daysPerWeek: number;
    days: UpdateWorkoutDayInput[];
  }): Promise<UserWorkoutPlan> => {
    const res = await apiClient.post('/api/workout/plan', plan);
    return res.data?.data;
  },

  updateDay: async (dayId: number, data: UpdateWorkoutDayInput): Promise<WorkoutDay> => {
    const res = await apiClient.put(`/api/workout/days/${dayId}`, data);
    return res.data?.data;
  },

  logSession: async (data: {
    workoutDayId: number;
    sessionDate: string;
    isCompleted: boolean;
    actualDurationMinutes: number;
    notes?: string;
  }): Promise<WorkoutSessionLog> => {
    const res = await apiClient.post('/api/workout/sessions', data);
    return res.data?.data;
  },

  deleteSessionLog: async (sessionLogId: number): Promise<boolean> => {
    const res = await apiClient.delete(`/api/workout/sessions/${sessionLogId}`);
    return res.data?.isSuccess ?? true;
  },

  getWeekSummary: async (weekStartDate?: string): Promise<WorkoutWeekSummary> => {
    const query = weekStartDate ? `?weekStartDate=${encodeURIComponent(weekStartDate)}` : '';
    const res = await apiClient.get(`/api/workout/summary${query}`);
    return res.data?.data;
  },

  generateAiPlan: async (request: GenerateAiWorkoutPlanRequest): Promise<AiWorkoutPlanResponse> => {
    const res = await apiClient.post('/api/workout/ai/generate', request);
    return res.data?.data;
  },

  syncPlanner: async (weekStartDate?: string): Promise<number> => {
    const query = weekStartDate ? `?weekStartDate=${encodeURIComponent(weekStartDate)}` : '';
    const res = await apiClient.post(`/api/workout/sync-planner${query}`);
    return res.data?.data ?? 0;
  },

  getDay: async (dayId: number, sessionDate?: string): Promise<WorkoutDay> => {
    const query = sessionDate ? `?sessionDate=${encodeURIComponent(sessionDate)}` : '';
    const res = await apiClient.get(`/api/workout/days/${dayId}${query}`);
    return res.data?.data;
  },

  completeExercise: async (
    workoutDayExerciseId: number,
    sessionDate?: string,
    actualDurationMinutes?: number
  ): Promise<WorkoutDay> => {
    const params = new URLSearchParams();
    if (sessionDate) params.append('sessionDate', sessionDate);
    if (actualDurationMinutes !== undefined) params.append('actualDurationMinutes', String(actualDurationMinutes));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.post(`/api/workout/exercises/${workoutDayExerciseId}/complete${query}`, {
      sessionDate,
      actualDurationMinutes
    });
    return res.data?.data;
  },

  undoExercise: async (workoutDayExerciseId: number, sessionDate?: string): Promise<WorkoutDay> => {
    const query = sessionDate ? `?sessionDate=${encodeURIComponent(sessionDate)}` : '';
    const res = await apiClient.post(`/api/workout/exercises/${workoutDayExerciseId}/undo${query}`);
    return res.data?.data;
  }
};
