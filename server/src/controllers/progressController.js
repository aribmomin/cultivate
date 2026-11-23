import { CourseProgress } from '../models/CourseProgress.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { lmsService } from '../services/lmsService.js';
import { awardUserXp } from '../services/gamificationService.js';

/**
 * GET /api/progress
 * Retrieve global progress summary across all courses for the authenticated user.
 */
export const getAllProgress = async (req, res) => {
  const userId = req.user._id;

  const [progressDocs, quizDocs] = await Promise.all([
    CourseProgress.find({ userId }).populate('courseId', 'title slug courseId'),
    QuizAttempt.find({ userId }).populate('courseId', 'title slug courseId'),
  ]);

  const completedLessons = {};
  progressDocs.forEach((p) => {
    const key = p.courseCustomId || p.courseId?._id?.toString() || p.courseId?.slug;
    if (key) {
      completedLessons[key] = p.completedLessonIds;
    }
  });

  const quizAttempts = {};
  quizDocs.forEach((q) => {
    const key = q.courseCustomId || q.courseId?._id?.toString() || q.courseId?.slug;
    if (key) {
      quizAttempts[key] = {
        score: q.score,
        passed: q.passed,
        highestScore: q.highestScore,
        attemptsCount: q.attemptsCount,
        lastAttemptAt: q.lastAttemptAt,
      };
    }
  });

  res.status(200).json({
    success: true,
    completedLessons,
    quizAttempts,
    recordsCount: progressDocs.length,
  });
};

/**
 * GET /api/progress/courses/:id
 * Retrieve progress and quiz attempt for a specific course.
 */
export const getCourseProgress = async (req, res) => {
  const course = await lmsService.getCourseByIdOrSlug(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course not found with identifier '${req.params.id}'.`,
    });
  }

  const [progress, quizAttempt] = await Promise.all([
    CourseProgress.findOne({
      userId: req.user._id,
      courseId: course._id,
    }),
    QuizAttempt.findOne({
      userId: req.user._id,
      courseId: course._id,
    }),
  ]);

  res.status(200).json({
    success: true,
    courseId: course._id,
    courseCustomId: course.courseId,
    completedLessons: progress ? progress.completedLessonIds : [],
    progressPercentage: progress ? progress.progressPercentage : 0,
    isCompleted: progress ? progress.isCompleted : false,
    quizResult: quizAttempt
      ? {
          score: quizAttempt.score,
          passed: quizAttempt.passed,
          highestScore: quizAttempt.highestScore,
          attemptsCount: quizAttempt.attemptsCount,
          lastAttemptAt: quizAttempt.lastAttemptAt,
        }
      : null,
  });
};

/**
 * POST /api/progress/lessons/:lessonId/toggle
 * Toggle completion of a lesson and handle deterministic XP rewards.
 */
export const toggleLessonCompletion = async (req, res) => {
  const { lessonId } = req.params;
  const courseIdentifier = req.body.courseId || req.query.courseId;

  if (!courseIdentifier) {
    return res.status(400).json({
      success: false,
      message: 'Please provide courseId in the request body or query parameters.',
    });
  }

  const course = await lmsService.getCourseByIdOrSlug(courseIdentifier);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course not found with identifier '${courseIdentifier}'.`,
    });
  }

  // Verify lesson actually exists in course
  const lessonExists = course.lessons.some((l) => l.id === lessonId);
  if (!lessonExists) {
    return res.status(404).json({
      success: false,
      message: `Lesson '${lessonId}' does not belong to course '${course.title}'.`,
    });
  }

  let progress = await CourseProgress.findOne({
    userId: req.user._id,
    courseId: course._id,
  });

  if (!progress) {
    progress = new CourseProgress({
      userId: req.user._id,
      courseId: course._id,
      courseCustomId: course.courseId || course.id,
      completedLessonIds: [],
      awardedLessonXpIds: [],
      progressPercentage: 0,
      isCompleted: false,
    });
  }

  const exists = progress.completedLessonIds.includes(lessonId);
  let isNowCompleted = false;
  let xpAwarded = 0;

  if (exists) {
    // Uncomplete: remove lesson ID from completed list
    progress.completedLessonIds = progress.completedLessonIds.filter(
      (id) => id !== lessonId
    );
    isNowCompleted = false;
  } else {
    // Complete: add lesson ID to completed list
    progress.completedLessonIds.push(lessonId);
    isNowCompleted = true;

    // Award +50 XP ONLY if this lesson has never awarded XP to this user before
    if (!progress.awardedLessonXpIds.includes(lessonId)) {
      progress.awardedLessonXpIds.push(lessonId);
      xpAwarded += 50; // SRS GAME-REQ-03 (+50 XP per lesson completed)
    }
  }

  // Recalculate course percentage
  const totalLessons = course.lessons.length || 1;
  progress.progressPercentage = Math.min(
    100,
    Math.round((progress.completedLessonIds.length / totalLessons) * 100)
  );
  progress.isCompleted = progress.progressPercentage === 100;

  // Course completion bonus (+150 XP) awarded once
  if (progress.isCompleted && !progress.courseBonusAwarded) {
    progress.courseBonusAwarded = true;
    xpAwarded += 150;
  }

  progress.lastAccessedAt = new Date();
  await progress.save();

  // Atomically persist XP if earned
  if (xpAwarded > 0) {
    await awardUserXp(
      req.user._id,
      xpAwarded,
      `Completed lesson ${lessonId} in ${course.title}`
    );
  }

  res.status(200).json({
    success: true,
    isCompleted: isNowCompleted,
    completedLessons: progress.completedLessonIds,
    progressPercentage: progress.progressPercentage,
    xpAwarded,
  });
};

/**
 * POST /api/progress/courses/:courseId/reset
 * Reset progress for a specific course safely.
 */
export const resetCourseProgress = async (req, res) => {
  const course = await lmsService.getCourseByIdOrSlug(req.params.courseId);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course not found with identifier '${req.params.courseId}'.`,
    });
  }

  await Promise.all([
    CourseProgress.deleteOne({
      userId: req.user._id,
      courseId: course._id,
    }),
    QuizAttempt.deleteOne({
      userId: req.user._id,
      courseId: course._id,
    }),
  ]);

  res.status(200).json({
    success: true,
    message: `Progress and quiz attempts reset successfully for '${course.title}'.`,
  });
};

