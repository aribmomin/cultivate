import express from 'express';
import {
  getAdminOverview,
  getAdminCourses,
  createAdminCourse,
  toggleCourseStatus,
  addQuizQuestion,
  updateCropParams,
  getSimulationCoefficients,
  updateSimulationCoefficients,
  getAuditLogs,
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Strict administration access control: must be authenticated and have role === 'admin'
router.use(protect);
router.use(requireRole('admin'));

router.get('/overview', getAdminOverview);
router.get('/courses', getAdminCourses);
router.post('/courses', createAdminCourse);
router.patch('/courses/:id/status', toggleCourseStatus);
router.post('/courses/:id/quiz/questions', addQuizQuestion);
router.put('/crops/:id', updateCropParams);
router.get('/simulation-coefficients', getSimulationCoefficients);
router.put('/simulation-coefficients', updateSimulationCoefficients);
router.get('/audit-logs', getAuditLogs);

export default router;

