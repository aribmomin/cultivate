import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Quiz } from '../models/Quiz.js';
import { Crop } from '../models/Crop.js';
import { Farm } from '../models/Farm.js';
import { SimulationConfig } from '../models/SimulationConfig.js';
import { AuditLog } from '../models/AuditLog.js';
import { lmsService } from '../services/lmsService.js';

// Helper to record immutable administrative audit log
const recordAuditLog = async (adminUser, action, details) => {
  try {
    await AuditLog.create({
      adminId: adminUser._id,
      adminName: adminUser.name,
      action,
      details,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

/**
 * GET /api/admin/overview
 * Platform-wide statistics and metrics for administrator dashboard.
 */
export const getAdminOverview = async (req, res) => {
  const [
    totalUsers,
    totalCourses,
    activeFarms,
    cropCatalogCount,
    recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments({}),
    Course.countDocuments({}),
    Farm.countDocuments({}),
    Crop.countDocuments({}),
    AuditLog.find({}).sort({ timestamp: -1 }).limit(10),
  ]);

  const metrics = {
    totalUsers,
    totalCourses,
    activeFarms,
    totalCrops: cropCatalogCount,
  };

  res.status(200).json({
    success: true,
    overview: {
      ...metrics,
      cropCatalogCount,
      recentAuditLogs,
    },
    metrics,
  });
};

/**
 * GET /api/admin/courses
 * List all courses including draft curriculum.
 */
export const getAdminCourses = async (req, res) => {
  const courses = await Course.find({}).sort({ order: 1, createdAt: -1 });
  res.status(200).json({
    success: true,
    count: courses.length,
    courses,
  });
};

/**
 * POST /api/admin/courses
 * Author and publish a new course.
 */
export const createAdminCourse = async (req, res) => {
  const { title, category, difficulty, duration, description, objectives } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Course title is required.',
    });
  }

  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

  const newCourse = await Course.create({
    courseId: `course-${Date.now()}`,
    title: title.trim(),
    slug,
    category: category || 'Soil Health',
    difficulty: difficulty || 'Beginner',
    estimatedHours: duration || '3 Hours',
    status: 'Active',
    description: description || 'Comprehensive organic farming curriculum module.',
    instructor: {
      name: req.user.name,
      role: req.user.roleLabel || 'Platform Administrator',
    },
    learningObjectives: objectives || [
      'Understand core biological principles',
      'Apply non-toxic methods in practice',
    ],
    lessons: [
      {
        id: `l-${Date.now()}-1`,
        title: `Foundations of ${title}`,
        duration: '15 min read',
        summary: `Overview of ${title} and foundational regenerative practices.`,
        sections: [
          {
            type: 'paragraph',
            content: `Overview of ${title} and foundational biological principles in organic agronomy.`,
          },
        ],
      },
    ],
  });

  await recordAuditLog(
    req.user,
    'COURSE_CREATED',
    `Created new course "${newCourse.title}" (${newCourse.category})`
  );

  res.status(201).json({
    success: true,
    message: `Course "${newCourse.title}" created successfully.`,
    course: newCourse,
  });
};

/**
 * PATCH /api/admin/courses/:id/status
 * Toggle course status between 'Active' and 'Draft'.
 */
export const toggleCourseStatus = async (req, res) => {
  const course = await lmsService.getCourseByIdOrSlug(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course not found with identifier '${req.params.id}'.`,
    });
  }

  const newStatus = course.status === 'Active' ? 'Draft' : 'Active';
  course.status = newStatus;
  await course.save();

  await recordAuditLog(
    req.user,
    'COURSE_STATUS_CHANGE',
    `Updated status of "${course.title}" to ${newStatus}.`
  );

  res.status(200).json({
    success: true,
    message: `Course "${course.title}" status changed to ${newStatus}.`,
    course,
  });
};

/**
 * POST /api/admin/courses/:id/quiz/questions
 * Add question to course assessment quiz.
 */
export const addQuizQuestion = async (req, res) => {
  const { question, options, correctAnswer, explanation } = req.body;

  if (!question || !options || options.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Question text and at least 2 options are required.',
    });
  }

  const course = await lmsService.getCourseByIdOrSlug(req.params.id);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found.',
    });
  }

  let quiz = await Quiz.findOne({
    $or: [{ courseId: course._id }, { courseCustomId: course.courseId }],
  });

  if (!quiz) {
    quiz = new Quiz({
      courseId: course._id,
      courseCustomId: course.courseId || course.id,
      title: `${course.title} Assessment`,
      passingScore: 70,
      questions: [],
    });
  }

  const questionId = `q-${Date.now()}`;
  quiz.questions.push({
    id: questionId,
    question: question.trim(),
    options,
    correctAnswerIndex: parseInt(correctAnswer, 10) || 0,
    explanation: explanation || 'Ground truth grounded in approved organic farming curriculum.',
  });

  await quiz.save();

  await recordAuditLog(
    req.user,
    'QUIZ_QUESTION_ADDED',
    `Added new question to ${course.title} assessment.`
  );

  res.status(201).json({
    success: true,
    message: `Added question to ${course.title} quiz assessment.`,
    questionId,
  });
};

/**
 * PUT /api/admin/crops/:id
 * Calibrate crop agronomic parameters.
 */
export const updateCropParams = async (req, res) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
  const crop = await Crop.findOne(
    isObjectId ? { $or: [{ cropId: req.params.id }, { _id: req.params.id }] } : { cropId: req.params.id }
  );

  if (!crop) {
    return res.status(404).json({
      success: false,
      message: `Crop not found with identifier '${req.params.id}'.`,
    });
  }

  const allowedUpdates = [
    'baseGrowthDays',
    'dailyWaterNeed',
    'optimalSoilHealthMin',
    'optimalSoilHealthMax',
    'pestSusceptibility',
    'baseYieldKg',
    'marketPricePerKg',
    'minHarvestDay',
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      crop[field] = req.body[field];
    }
  });

  await crop.save();

  await recordAuditLog(
    req.user,
    'CROP_CALIBRATION',
    `Calibrated agronomy coefficients for ${crop.name} (${crop.cropId}).`
  );

  res.status(200).json({
    success: true,
    message: `Updated agronomy parameters for ${crop.name}.`,
    crop,
  });
};

/**
 * GET /api/admin/simulation-coefficients
 * Fetch active simulation coefficients.
 */
export const getSimulationCoefficients = async (req, res) => {
  let config = await SimulationConfig.findOne({ singletonKey: 'default' });
  if (!config) {
    config = await SimulationConfig.create({ singletonKey: 'default' });
  }
  res.status(200).json({
    success: true,
    coefficients: config,
  });
};

/**
 * PUT /api/admin/simulation-coefficients
 * Update global environmental simulation coefficients without touching source code.
 */
export const updateSimulationCoefficients = async (req, res) => {
  let config = await SimulationConfig.findOne({ singletonKey: 'default' });
  if (!config) {
    config = new SimulationConfig({ singletonKey: 'default' });
  }

  const allowedFields = [
    'initialBudget',
    'dailyEvaporationRate',
    'rainfallBonus',
    'waterStressThreshold',
    'irrigationMoistureBoost',
    'irrigationCost',
    'compostSoilHealthBoost',
    'compostNitrogenBoost',
    'compostCost',
    'neemPestReduction',
    'neemCost',
    'yieldPlotMultiplier',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      config[field] = Number(req.body[field]);
    }
  });

  await config.save();

  await recordAuditLog(
    req.user,
    'RULE_CONFIG',
    'Updated global environmental simulation coefficients.'
  );

  res.status(200).json({
    success: true,
    message: 'Global simulation coefficients updated successfully.',
    coefficients: config,
  });
};

/**
 * GET /api/admin/audit-logs
 * Retrieve administrative audit logs.
 */
export const getAuditLogs = async (req, res) => {
  const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);
  res.status(200).json({
    success: true,
    count: logs.length,
    auditLogs: logs,
  });
};

