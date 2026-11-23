import express from 'express';
import {
  getMyFarm,
  executeFarmAction,
  advanceFarmDay,
  resetFarm,
} from '../controllers/farmController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All farm routes strictly require authentication
router.use(protect);

router.get('/me', getMyFarm);
router.post('/action', executeFarmAction);
router.post('/advance-day', advanceFarmDay);
router.post('/reset', resetFarm);

export default router;

