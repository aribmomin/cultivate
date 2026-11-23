import express from 'express';
import {
  getCourses,
  getCourseById,
  getCourseQuiz,
  submitCourseQuiz,
} from '../controllers/courseController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Course Discovery Endpoints
router.get('/', getCourses);
router.get('/:id', optionalAuth, getCourseById);
router.get('/:id/quiz', optionalAuth, getCourseQuiz);

// Protected Quiz Submission Endpoint
router.post('/:id/quiz/submit', protect, submitCourseQuiz);

export default router;

