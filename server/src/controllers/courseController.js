import { lmsService } from '../services/lmsService.js';

/**
 * GET /api/courses
 * Retrieve courses with optional query filters (search, category, difficulty, featured).
 */
export const getCourses = async (req, res) => {
  const courses = await lmsService.getCourses(req.query);
  res.status(200).json({
    success: true,
    count: courses.length,
    courses,
  });
};

/**
 * GET /api/courses/:id
 * Retrieve a single course and its lessons by _id, courseId, or slug.
 */
export const getCourseById = async (req, res) => {
  const course = await lmsService.getCourseByIdOrSlug(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course not found with identifier '${req.params.id}'.`,
    });
  }

  res.status(200).json({
    success: true,
    course,
  });
};

/**
 * GET /api/courses/:id/quiz
 * Retrieve course quiz questions. CRITICAL: Never exposes correct answer keys.
 */
export const getCourseQuiz = async (req, res) => {
  const result = await lmsService.getSanitizedQuiz(req.params.id);

  if (result.error === 'COURSE_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      message: result.message,
    });
  }

  if (result.error === 'QUIZ_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    courseTitle: result.course.title,
    quiz: result.quiz,
  });
};

/**
 * POST /api/courses/:id/quiz/submit
 * Submit quiz answers for server-side grading and secure XP awarding.
 */
export const submitCourseQuiz = async (req, res) => {
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Please provide submitted answers as a key-value map.',
    });
  }

  const result = await lmsService.gradeQuizSubmission(
    req.params.id,
    req.user._id,
    answers
  );

  if (result.error === 'COURSE_NOT_FOUND') {
    return res.status(404).json({ success: false, message: result.message });
  }

  if (result.error === 'QUIZ_NOT_FOUND') {
    return res.status(404).json({ success: false, message: result.message });
  }

  res.status(200).json(result);
};

