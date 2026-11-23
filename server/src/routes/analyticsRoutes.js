import express from 'express';
import {
  getFarmSummary,
  getTimeSeriesAnalytics,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/farm-summary', getFarmSummary);
router.get('/time-series', getTimeSeriesAnalytics);

export default router;

