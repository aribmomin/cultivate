import { apiClient } from './apiClient';
import { MOCK_COURSES } from '../data/mockCourses';

/**
 * Course Service: Connects to Backend REST APIs for courses and quizzes.
 */
export const courseService = {
  // Fetch courses with optional filters (search, category, difficulty)
  async getCourses(filters = {}) {
    try {
      const res = await apiClient.get('/courses', { params: filters });
      if (res.data?.success && Array.isArray(res.data.courses)) {
        return res.data.courses;
      }
    } catch (err) {
      console.warn('API error fetching courses, falling back to local cache.', err);
    }
    return MOCK_COURSES;
  },

  // Fetch single course by ID or slug
  async getCourseById(idOrSlug) {
    try {
      const res = await apiClient.get(`/courses/${idOrSlug}`);
      if (res.data?.success && res.data.course) {
        return res.data.course;
      }
    } catch (err) {
      console.warn(`API error fetching course ${idOrSlug}, falling back to local cache.`, err);
    }
    return MOCK_COURSES.find((c) => c.id === idOrSlug || c.slug === idOrSlug) || null;
  },

  // Fetch sanitized quiz (WITHOUT answers)
  async getCourseQuiz(courseIdOrSlug) {
    try {
      const res = await apiClient.get(`/courses/${courseIdOrSlug}/quiz`);
      if (res.data?.success && res.data.quiz) {
        return res.data.quiz;
      }
    } catch (err) {
      console.warn('API error fetching sanitized quiz, falling back to local cache.', err);
      const course = MOCK_COURSES.find((c) => c.id === courseIdOrSlug || c.slug === courseIdOrSlug);
      return course?.quiz || null;
    }
    return null;
  },

  // Submit quiz answers to backend for server-side grading and XP award
  async submitQuiz(courseIdOrSlug, answers) {
    try {
      const res = await apiClient.post(`/courses/${courseIdOrSlug}/quiz/submit`, { answers });
      return res.data;
    } catch (err) {
      console.error('Quiz submission error:', err);
      return {
        success: false,
        message: err.extractedMessage || 'Failed to submit quiz to server.',
      };
    }
  },
};

