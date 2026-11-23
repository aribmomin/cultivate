import { User } from '../models/User.js';

export const LEVEL_TIERS = [
  { level: 1, title: 'Soil Apprentice', minXp: 0, maxXp: 249, badge: '🌱' },
  { level: 2, title: 'Junior Agronomist', minXp: 250, maxXp: 599, badge: '🌿' },
  { level: 3, title: 'Ecological Cultivator', minXp: 600, maxXp: 1099, badge: '🌾' },
  { level: 4, title: 'Regenerative Farmer', minXp: 1100, maxXp: 1799, badge: '🚜' },
  { level: 5, title: 'Master Soil Steward', minXp: 1800, maxXp: 99999, badge: '👑' },
];

/**
 * Deterministically compute level tier from total XP.
 */
export const calculateLevelFromXp = (totalXp) => {
  const currentTier =
    LEVEL_TIERS.slice()
      .reverse()
      .find((t) => totalXp >= t.minXp) || LEVEL_TIERS[0];
  const nextTier =
    LEVEL_TIERS.find((t) => t.level === currentTier.level + 1) || null;

  let progressPct = 100;
  if (nextTier) {
    const range = nextTier.minXp - currentTier.minXp;
    const progressIntoLevel = totalXp - currentTier.minXp;
    progressPct = Math.min(
      100,
      Math.max(0, Math.round((progressIntoLevel / range) * 100))
    );
  }

  return {
    level: currentTier.level,
    title: currentTier.title,
    badgeSymbol: currentTier.badge,
    nextTier,
    progressPct,
  };
};

/**
 * Award XP to a user atomically, recalculate their level, and persist changes.
 */
export const awardUserXp = async (userId, xpAmount, reason = '') => {
  if (!xpAmount || xpAmount <= 0) return null;

  const user = await User.findById(userId);
  if (!user) return null;

  user.xp = (user.xp || 0) + xpAmount;
  const { level } = calculateLevelFromXp(user.xp);
  user.level = level;
  await user.save();

  return {
    xpGained: xpAmount,
    totalXp: user.xp,
    level: user.level,
    reason,
  };
};

