import {
  getUserGamificationStats,
  getLeaderboardData,
  BADGE_DEFINITIONS,
} from '../services/gamificationService.js';

/**
 * GET /api/gamification/stats
 * Retrieve authenticated user's XP, level, badges, and learning stats.
 */
export const getMyStats = async (req, res) => {
  const stats = await getUserGamificationStats(req.user._id);
  res.status(200).json({
    success: true,
    stats,
  });
};

/**
 * GET /api/gamification/badges
 * List all platform badges and the unlock state for the current user.
 */
export const getMyBadges = async (req, res) => {
  const stats = await getUserGamificationStats(req.user._id);
  res.status(200).json({
    success: true,
    count: BADGE_DEFINITIONS.length,
    badges: stats?.badges || BADGE_DEFINITIONS,
  });
};

/**
 * GET /api/leaderboard
 * Global leaderboard using real registered learners sorted by XP.
 * Supports pagination and never leaks sensitive user data.
 */
export const getLeaderboard = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const currentUserId = req.user?._id || null;

  const leaderboard = await getLeaderboardData({
    page,
    limit,
    currentUserId,
  });

  res.status(200).json({
    success: true,
    ...leaderboard,
  });
};

