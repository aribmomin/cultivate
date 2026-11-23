import express from 'express';
import {
  getAllProgress,
  getCourseProgress,
  toggleLessonCompletion,
  resetCourseProgress,
} from '../controllers/progressController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All progress endpoints are strictly protected to the authenticated user
router.use(protect);

router.get('/', getAllProgress);
router.get('/courses/:id', getCourseProgress);
router.post('/lessons/:lessonId/toggle', toggleLessonCompletion);
router.post('/courses/:courseId/reset', resetCourseProgress);

export default router;

