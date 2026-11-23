import { apiClient } from './apiClient';

const STORAGE_PREFIX = 'cultivate_progress_';

// Get storage key namespaced by userId to prevent cross-account leaks
const getStorageKey = (userId) => {
  if (!userId) return null;
  return `${STORAGE_PREFIX}${userId}`;
};

// Get current userId from localStorage (read-only, no import cycle)
const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('cultivate_auth_user_v1');
    if (raw) {
      const user = JSON.parse(raw);
      return user?._id || user?.id || null;
    }
  } catch {
    // ignore
  }
  return null;
};

const getStoredData = (userId) => {
  const uid = userId || getCurrentUserId();
  if (!uid) return { completedLessons: {}, quizAttempts: {} };
  try {
    const key = getStorageKey(uid);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { completedLessons: {}, quizAttempts: {} };
  } catch (err) {
    console.warn('LocalStorage unavailable, using ephemeral memory state.', err);
    return { completedLessons: {}, quizAttempts: {} };
  }
};

const saveStoredData = (data, userId) => {
  const uid = userId || getCurrentUserId();
  if (!uid) return;
  try {
    const key = getStorageKey(uid);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save progress to LocalStorage.', err);
  }
};

export const progressService = {
  // Clear cached progress for a specific user (call on logout)
  clearProgressCache(userId) {
    if (!userId) return;
    try {
      localStorage.removeItem(getStorageKey(userId));
    } catch {
      // ignore
    }
  },

  // Clear ALL progress caches for every user (belt-and-suspenders logout cleanup)
  clearAllProgressCache() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      // Also clear legacy key if present
      localStorage.removeItem('cultivate_learning_progress_v1');
    } catch {
      // ignore
    }
  },

  // Sync latest progress from MongoDB backend (authoritative source of truth)
  async syncProgress(userId) {
    const uid = userId || getCurrentUserId();
    try {
      const res = await apiClient.get('/progress');
      if (res.data?.success) {
        const freshData = {
          completedLessons: res.data.completedLessons || {},
          quizAttempts: res.data.quizAttempts || {},
        };
        saveStoredData(freshData, uid);
        return freshData;
      }
    } catch (err) {
      console.warn('Could not sync progress from backend:', err);
    }
    return getStoredData(uid);
  },

  // Get completed lesson IDs for a specific course (synchronous read from cache)
  getCompletedLessons(courseId, userId) {
    const data = getStoredData(userId);
    return data.completedLessons[courseId] || [];
  },

  // Check if a specific lesson is completed
  isLessonCompleted(courseId, lessonId, userId) {
    const lessons = this.getCompletedLessons(courseId, userId);
    return lessons.includes(lessonId);
  },

  // Toggle completion status of a lesson via API. MongoDB is source of truth.
  async toggleLessonCompletion(courseId, lessonId, userId) {
    const uid = userId || getCurrentUserId();
    try {
      const res = await apiClient.post(`/progress/lessons/${lessonId}/toggle`, {
        courseId,
      });

      if (res.data?.success && Array.isArray(res.data.completedLessons)) {
        const data = getStoredData(uid);
        data.completedLessons[courseId] = res.data.completedLessons;
        saveStoredData(data, uid);
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
  getCourseProgressPercentage(courseId, totalLessons, userId) {
    if (!totalLessons || totalLessons <= 0) return 0;
    const completed = this.getCompletedLessons(courseId, userId);
    return Math.min(100, Math.round((completed.length / totalLessons) * 100));
  },

  // Get quiz result record for a course
  getQuizResult(courseId, userId) {
    const data = getStoredData(userId);
    return data.quizAttempts[courseId] || null;
  },

  // Save a quiz attempt to backend for server grading and update local cache
  async saveQuizResult(courseId, { answers }, userId) {
    const uid = userId || getCurrentUserId();
    try {
      const res = await apiClient.post(`/courses/${courseId}/quiz/submit`, {
        answers,
      });

      if (res.data?.success) {
        const data = getStoredData(uid);
        data.quizAttempts[courseId] = {
          score: res.data.score,
          passed: res.data.passed,
          highestScore: res.data.highestScore,
          attemptsCount: res.data.attemptsCount,
          answers,
          gradedQuestions: res.data.gradedQuestions,
          lastAttemptAt: new Date().toISOString(),
        };
        saveStoredData(data, uid);
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
  async resetCourseProgress(courseId, userId) {
    const uid = userId || getCurrentUserId();
    try {
      const res = await apiClient.post(`/progress/courses/${courseId}/reset`);
      if (res.data?.success) {
        const data = getStoredData(uid);
        delete data.completedLessons[courseId];
        delete data.quizAttempts[courseId];
        saveStoredData(data, uid);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Failed to reset progress.' };
    } catch (err) {
      return { success: false, message: err.extractedMessage || 'Network error resetting progress.' };
    }
  },

  // Retrieve global summary across all courses for current user
  getAllProgress(userId) {
    return getStoredData(userId);
  },
};
