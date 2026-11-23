import { User } from '../models/User.js';
import { Farm } from '../models/Farm.js';
import { CourseProgress } from '../models/CourseProgress.js';
import { QuizAttempt } from '../models/QuizAttempt.js';

export const LEVEL_TIERS = [
  { level: 1, title: 'Soil Apprentice', minXp: 0, maxXp: 249, badge: '🌱' },
  { level: 2, title: 'Junior Agronomist', minXp: 250, maxXp: 599, badge: '🌿' },
  { level: 3, title: 'Ecological Cultivator', minXp: 600, maxXp: 1099, badge: '🌾' },
  { level: 4, title: 'Regenerative Farmer', minXp: 1100, maxXp: 1799, badge: '🚜' },
  { level: 5, title: 'Master Soil Steward', minXp: 1800, maxXp: 99999, badge: '👑' },
];

export const BADGE_DEFINITIONS = [
  {
    id: 'water-master',
    title: 'Water Efficiency Master',
    category: 'Water Stewardship',
    icon: 'Droplets',
    description:
      'Maintained optimal root hydration using drip irrigation without moisture stress or saturation.',
    hint: 'Keep soil moisture between 25% and 85% on all cultivated plots in the simulator.',
    tier: 'Gold',
  },
  {
    id: 'soil-steward',
    title: 'Soil Steward',
    category: 'Soil Health',
    icon: 'HeartPulse',
    description:
      'Elevated soil microbial vitality to 90%+ utilizing rich organic vermicompost.',
    hint: 'Apply aerated vermicompost to any plot until soil vitality reaches at least 90%.',
    tier: 'Platinum',
  },
  {
    id: 'ipm-specialist',
    title: 'Organic IPM Specialist',
    category: 'Pest Management',
    icon: 'ShieldCheck',
    description:
      'Suppressed insect pressure organically using neem seed oil or companion plant shields.',
    hint: 'Intercrop French Marigolds or apply cold-pressed neem spray to maintain pest hazard under 20%.',
    tier: 'Gold',
  },
  {
    id: 'heritage-harvester',
    title: 'Heritage Harvester',
    category: 'Farm Production',
    icon: 'Sparkles',
    description:
      'Harvested mature organic food crops at peak physiological maturity.',
    hint: 'Grow any of the 5 approved crops past its minimum harvest day and reap the yield in the 2D studio.',
    tier: 'Diamond',
  },
  {
    id: 'eco-scholar',
    title: 'Ecological Scholar',
    category: 'Curriculum Mastery',
    icon: 'BookOpen',
    description:
      'Completed at least 3 structured organic farming educational lesson modules.',
    hint: 'Study and mark at least 3 lessons complete in the Course Catalog.',
    tier: 'Silver',
  },
  {
    id: 'quiz-champion',
    title: 'Quiz Champion',
    category: 'Assessment Excellence',
    icon: 'Trophy',
    description:
      'Achieved a perfect 100% mastery score on an organic agriculture assessment.',
    hint: 'Answer all questions correctly on any course assessment quiz.',
    tier: 'Gold',
  },
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

/**
 * Evaluate badge unlocks based on real user activity in database.
 */
export const evaluateBadges = ({
  completedLessonCount,
  perfectQuizzes,
  cropsHarvested,
  farm,
  user = null,
}) => {
  const activePlots = farm ? farm.tiles.filter((t) => t.plantedCrop !== null) : [];
  const hasOptimalHydration =
    activePlots.length > 0 &&
    activePlots.every((t) => t.moisture >= 25 && t.moisture <= 85);

  const hasRichSoil = farm ? farm.tiles.some((t) => t.soilHealth >= 90) : false;

  const hasLowPestWithCompanion = farm
    ? farm.tiles.some(
        (t) =>
          t.plantedCrop &&
          (t.plantedCrop.companion !== null || t.pestRisk <= 15)
      )
    : false;

  return BADGE_DEFINITIONS.map((badge) => {
    let unlocked = false;
    let progressText = 'Locked';

    switch (badge.id) {
      case 'water-master':
        unlocked = hasOptimalHydration;
        progressText = unlocked
          ? 'Unlocked • Moisture In Optimal Range'
          : 'Needs all active plots in 25-85% zone';
        break;
      case 'soil-steward':
        unlocked = hasRichSoil;
        progressText = unlocked
          ? 'Unlocked • Soil Microbes Flourishing'
          : 'Enrich any plot to 90%+ health';
        break;
      case 'ipm-specialist':
        unlocked = hasLowPestWithCompanion;
        progressText = unlocked
          ? 'Unlocked • Pest Shield Active'
          : 'Add companion plant or reduce pests < 20%';
        break;
      case 'heritage-harvester':
        unlocked = cropsHarvested >= 1;
        progressText = unlocked
          ? `Unlocked • ${cropsHarvested} Harvest(s)`
          : 'Harvest at least 1 mature crop';
        break;
      case 'eco-scholar':
        unlocked = completedLessonCount >= 3;
        progressText = unlocked
          ? `Unlocked • ${completedLessonCount} Lessons`
          : `${completedLessonCount}/3 Lessons Completed`;
        break;
      case 'quiz-champion':
        unlocked = perfectQuizzes >= 1;
        progressText = unlocked
          ? 'Unlocked • 100% Assessment Score'
          : 'Score 100% on any course quiz';
        break;
      default:
        unlocked = false;
    }

    if (user && user.unlockedBadges && user.unlockedBadges.includes(badge.id)) {
      unlocked = true;
      progressText = 'Unlocked';
    }

    return {
      ...badge,
      unlocked,
      progressText,
    };
  });
};

/**
 * Retrieve comprehensive gamification statistics for a user.
 */
export const getUserGamificationStats = async (userId) => {
  const [user, farm, progressDocs, quizDocs] = await Promise.all([
    User.findById(userId),
    Farm.findOne({ userId }),
    CourseProgress.find({ userId }),
    QuizAttempt.find({ userId }),
  ]);

  if (!user) return null;

  let completedLessonCount = 0;
  progressDocs.forEach((p) => {
    completedLessonCount += p.completedLessonIds?.length || 0;
  });

  const quizzesPassed = quizDocs.filter((q) => q.passed).length;
  const perfectQuizzes = quizDocs.filter(
    (q) => q.score === 100 || q.highestScore === 100
  ).length;
  const cropsHarvested = farm?.totalCropsHarvested || 0;
  const totalHarvestRevenue = farm?.totalHarvestRevenue || 0;

  const levelInfo = calculateLevelFromXp(user.xp || 0);
  const badges = evaluateBadges({
    completedLessonCount,
    perfectQuizzes,
    cropsHarvested,
    farm,
    user,
  });

  const unlockedBadges = badges.filter((b) => b.unlocked);

  // Sync unlocked badges on user model if changed
  const badgeIds = unlockedBadges.map((b) => b.id);
  if (JSON.stringify(user.unlockedBadges || []) !== JSON.stringify(badgeIds)) {
    user.unlockedBadges = badgeIds;
    await user.save();
  }

  return {
    userId: user._id.toString(),
    displayName: user.name,
    roleLabel: user.roleLabel,
    institution: user.institution,
    avatar: user.avatar,
    totalXp: user.xp || 0,
    level: levelInfo.level,
    title: levelInfo.title,
    badgeSymbol: levelInfo.badgeSymbol,
    nextTier: levelInfo.nextTier,
    levelProgressPct: levelInfo.progressPct,
    completedLessonCount,
    quizzesPassed,
    perfectQuizzes,
    cropsHarvested,
    totalHarvestRevenue,
    badges,
    unlockedBadgesCount: unlockedBadges.length,
    breakdown: {
      lessonXp: completedLessonCount * 50,
      quizXp: quizzesPassed * 100 + perfectQuizzes * 50,
      simulationXp: cropsHarvested * 75,
    },
  };
};

/**
 * Generate privacy-conscious global leaderboard sorted by verified XP in MongoDB.
 */
export const getLeaderboardData = async ({
  page = 1,
  limit = 20,
  currentUserId = null,
}) => {
  const safePage = Math.max(1, parseInt(page, 10));
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (safePage - 1) * safeLimit;

  // Retrieve real registered learners sorted by XP DESC, level DESC
  const [users, totalLearners] = await Promise.all([
    User.find({}, 'name roleLabel institution avatar xp level unlockedBadges createdAt')
      .sort({ xp: -1, level: -1, createdAt: 1 })
      .skip(skip)
      .limit(safeLimit),
    User.countDocuments({}),
  ]);

  const ranked = users.map((u, idx) => {
    const tier = calculateLevelFromXp(u.xp || 0);
    return {
      id: u._id.toString(),
      displayName: u.name,
      roleLabel: u.roleLabel,
      institution: u.institution,
      avatar: u.avatar || 'OL',
      baseXp: u.xp || 0,
      level: u.level || tier.level,
      topBadge: tier.title,
      badgeSymbol: tier.badgeSymbol,
      unlockedBadgesCount: u.unlockedBadges?.length || 0,
      rank: skip + idx + 1,
      isCurrentUser: currentUserId ? u._id.toString() === currentUserId.toString() : false,
    };
  });

  // Calculate current user rank if authenticated
  let currentUserRank = null;
  if (currentUserId) {
    const currentUser = await User.findById(currentUserId, 'xp level createdAt');
    if (currentUser) {
      const higherCount = await User.countDocuments({
        $or: [
          { xp: { $gt: currentUser.xp } },
          { xp: currentUser.xp, level: { $gt: currentUser.level } },
          { xp: currentUser.xp, level: currentUser.level, createdAt: { $lt: currentUser.createdAt } },
        ],
      });
      currentUserRank = higherCount + 1;
    }
  }

  const leaderboard = ranked.map((r) => ({
    ...r,
    userId: r.id,
    name: r.displayName,
    xp: r.baseXp,
    badgesCount: r.unlockedBadgesCount,
  }));

  return {
    ranked,
    leaderboard,
    currentUserRank,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalLearners,
      totalUsers: totalLearners,
      totalPages: Math.ceil(totalLearners / safeLimit),
    },
  };
};
