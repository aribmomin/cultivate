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
  // Sync latest progress from MongoDB backend
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
    } catch {
      // ignore sync errors if offline
    }
    return getStoredData();
  },

  // Get completed lesson IDs for a specific course (synchronous for immediate UI rendering)
  getCompletedLessons(courseId) {
    const data = getStoredData();
    return data.completedLessons[courseId] || [];
  },

  // Check if a specific lesson is completed
  isLessonCompleted(courseId, lessonId) {
    const lessons = this.getCompletedLessons(courseId);
    return lessons.includes(lessonId);
  },

  // Toggle completion status of a lesson via API and update local cache
  async toggleLessonCompletion(courseId, lessonId) {
    // 1. Update local cache immediately for responsive UI
    const data = getStoredData();
    if (!data.completedLessons[courseId]) {
      data.completedLessons[courseId] = [];
    }
    const current = data.completedLessons[courseId];
    const exists = current.includes(lessonId);

    if (exists) {
      data.completedLessons[courseId] = current.filter((id) => id !== lessonId);
    } else {
      data.completedLessons[courseId] = [...current, lessonId];
    }
    saveStoredData(data);

    // 2. Persist to MongoDB backend and award XP
    try {
      const res = await apiClient.post(`/progress/lessons/${lessonId}/toggle`, {
        courseId,
      });
      if (res.data?.success && Array.isArray(res.data.completedLessons)) {
        data.completedLessons[courseId] = res.data.completedLessons;
        saveStoredData(data);
        return res.data.isCompleted;
      }
    } catch (err) {
      console.warn('API error toggling lesson, preserved local state.', err);
    }

    return !exists;
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
  async saveQuizResult(courseId, { score, passed, answers }) {
    const data = getStoredData();

    // 1. Submit to backend API for secure server-side grading and XP awards
    try {
      const res = await apiClient.post(`/courses/${courseId}/quiz/submit`, {
        answers,
      });
      if (res.data?.success) {
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
        return data.quizAttempts[courseId];
      }
    } catch (err) {
      console.warn('API error submitting quiz, saving locally.', err);
    }

    // 2. Fallback to local calculation if offline
    const existing = data.quizAttempts[courseId];
    const highestScore = existing ? Math.max(existing.highestScore || 0, score) : score;

    data.quizAttempts[courseId] = {
      score,
      passed,
      highestScore,
      answers,
      lastAttemptAt: new Date().toISOString(),
      attemptsCount: (existing?.attemptsCount || 0) + 1,
    };

    saveStoredData(data);
    return data.quizAttempts[courseId];
  },

  // Reset progress for a course (calls backend API and resets local cache)
  async resetCourseProgress(courseId) {
    const data = getStoredData();
    delete data.completedLessons[courseId];
    delete data.quizAttempts[courseId];
    saveStoredData(data);

    try {
      await apiClient.post(`/progress/courses/${courseId}/reset`);
    } catch (err) {
      console.warn('API error resetting progress on server.', err);
    }
  },

  // Retrieve global summary across all courses
  getAllProgress() {
    return getStoredData();
  },
};
