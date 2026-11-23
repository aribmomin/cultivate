import express from 'express';
import { getLeaderboard } from '../controllers/gamificationController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/leaderboard - Accessible publicly or with optional authentication
router.get('/', optionalAuth, getLeaderboard);

export default router;

