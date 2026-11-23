import { apiClient } from './apiClient';

/**
 * Course Service: Connects to Backend REST APIs for courses and quizzes.
 * MongoDB is the strict authoritative source of truth.
 */
export const courseService = {
  // Fetch courses with optional filters (search, category, difficulty)
  async getCourses(filters = {}) {
    const res = await apiClient.get('/courses', { params: filters });
    if (res.data?.success && Array.isArray(res.data.courses)) {
      return res.data.courses;
    }
    throw new Error(res.data?.message || 'Failed to retrieve courses from database.');
  },

  // Fetch single course by ID or slug
  async getCourseById(idOrSlug) {
    const res = await apiClient.get(`/courses/${idOrSlug}`);
    if (res.data?.success && res.data.course) {
      return res.data.course;
    }
    throw new Error(res.data?.message || `Course '${idOrSlug}' not found.`);
  },

  // Fetch sanitized quiz (WITHOUT answers)
  async getCourseQuiz(courseIdOrSlug) {
    const res = await apiClient.get(`/courses/${courseIdOrSlug}/quiz`);
    if (res.data?.success && res.data.quiz) {
      return res.data.quiz;
    }
    throw new Error(res.data?.message || 'Assessment quiz not found.');
  },

  // Submit quiz answers to backend for server-side grading and XP award
  async submitQuiz(courseIdOrSlug, answers) {
    try {
      const res = await apiClient.post(`/courses/${courseIdOrSlug}/quiz/submit`, { answers });
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.extractedMessage || 'Failed to submit quiz to server.',
      };
    }
  },
};
