import express from 'express';
import {
  getMyStats,
  getMyBadges,
} from '../controllers/gamificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getMyStats);
router.get('/profile', getMyStats);
router.get('/badges', getMyBadges);

export default router;

