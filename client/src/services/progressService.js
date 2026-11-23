import { apiClient } from './apiClient';

const STORAGE_KEY = 'terralearn_learning_progress';

const getStoredData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { completedLessons: {}, quizAttempts: {} };
  } catch (err) {
    console.warn('LocalStorage unavailable, using ephemeral memory state.', err);
    return { completedLessons: {}, quizAttempts: {} };
  }
};

const saveStoredData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save progress to LocalStorage.', err);
  }
};

export const progressService = {
  // Sync latest progress from MongoDB backend (authoritative source of truth)
  async syncProgress() {
    try {
      const res = await apiClient.get('/progress');
      if (res.data?.success) {
        const data = getStoredData();
        data.completedLessons = {
          ...data.completedLessons,
          ...res.data.completedLessons,
        };
        data.quizAttempts = {
          ...data.quizAttempts,
          ...res.data.quizAttempts,
        };
        saveStoredData(data);
        return data;
      }
    } catch (err) {
      console.warn('Could not sync progress from backend:', err);
    }
    return getStoredData();
  },

  // Get completed lesson IDs for a specific course (synchronous read from cache)
  getCompletedLessons(courseId) {
    const data = getStoredData();
    return data.completedLessons[courseId] || [];
  },

  // Check if a specific lesson is completed
  isLessonCompleted(courseId, lessonId) {
    const lessons = this.getCompletedLessons(courseId);
    return lessons.includes(lessonId);
  },

  // Toggle completion status of a lesson via API. MongoDB is source of truth.
  async toggleLessonCompletion(courseId, lessonId) {
    try {
      const res = await apiClient.post(`/progress/lessons/${lessonId}/toggle`, {
        courseId,
      });

      if (res.data?.success && Array.isArray(res.data.completedLessons)) {
        const data = getStoredData();
        data.completedLessons[courseId] = res.data.completedLessons;
        saveStoredData(data);
        return { success: true, isCompleted: res.data.isCompleted };
      }
      return { success: false, reason: res.data?.message || 'Server rejected lesson update.' };
    } catch (err) {
      return {
        success: false,
        reason: err.extractedMessage || 'Network error updating progress.',
      };
    }
  },

  // Calculate course completion percentage based on completed lessons
  getCourseProgressPercentage(courseId, totalLessons) {
    if (!totalLessons || totalLessons <= 0) return 0;
    const completed = this.getCompletedLessons(courseId);
    return Math.min(100, Math.round((completed.length / totalLessons) * 100));
  },

  // Get quiz result record for a course
  getQuizResult(courseId) {
    const data = getStoredData();
    return data.quizAttempts[courseId] || null;
  },

  // Save a quiz attempt to backend for server grading and update local cache
  async saveQuizResult(courseId, { answers }) {
    try {
      const res = await apiClient.post(`/courses/${courseId}/quiz/submit`, {
        answers,
      });

      if (res.data?.success) {
        const data = getStoredData();
        data.quizAttempts[courseId] = {
          score: res.data.score,
          passed: res.data.passed,
          highestScore: res.data.highestScore,
          attemptsCount: res.data.attemptsCount,
          answers,
          gradedQuestions: res.data.gradedQuestions,
          lastAttemptAt: new Date().toISOString(),
        };
        saveStoredData(data);
        return { success: true, data: data.quizAttempts[courseId] };
      }
      return { success: false, message: res.data?.message || 'Server rejected quiz submission.' };
    } catch (err) {
      return {
        success: false,
        message: err.extractedMessage || 'Network error submitting quiz.',
      };
    }
  },

  // Reset progress for a course (calls backend API and resets local cache)
  async resetCourseProgress(courseId) {
    try {
      const res = await apiClient.post(`/progress/courses/${courseId}/reset`);
      if (res.data?.success) {
        const data = getStoredData();
        delete data.completedLessons[courseId];
        delete data.quizAttempts[courseId];
        saveStoredData(data);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Failed to reset progress.' };
    } catch (err) {
      return { success: false, message: err.extractedMessage || 'Network error resetting progress.' };
    }
  },

  // Retrieve global summary across all courses
  getAllProgress() {
    return getStoredData();
  },
};
