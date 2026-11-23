import { Course } from '../models/Course.js';
import { Quiz } from '../models/Quiz.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { awardUserXp } from './gamificationService.js';
import mongoose from 'mongoose';

/**
 * LMS Service: Handles Course and Quiz business logic.
 */
export const lmsService = {
  // Query courses with dynamic filtering and search
  async getCourses({ search, category, difficulty, featured }) {
    const query = { status: 'Active' };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (difficulty && difficulty !== 'All') {
      query.difficulty = difficulty;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true' || featured === true;
    }

    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { learningObjectives: { $in: [regex] } },
      ];
    }

    const courses = await Course.find(query).sort({ order: 1, createdAt: -1 });
    return courses;
  },

  // Find course by _id, courseId, or slug
  async getCourseByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;

    let course = null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      course = await Course.findById(idOrSlug);
    }

    if (!course) {
      course = await Course.findOne({
        $or: [{ courseId: idOrSlug }, { slug: idOrSlug }],
      });
    }

    return course;
  },

  // Retrieve sanitized quiz questions (WITHOUT correct answers or explanations)
  async getSanitizedQuiz(courseIdOrSlug) {
    const course = await this.getCourseByIdOrSlug(courseIdOrSlug);
    if (!course) {
      return { error: 'COURSE_NOT_FOUND', message: 'Course not found.' };
    }

    const quiz = await Quiz.findOne({
      $or: [{ courseId: course._id }, { courseCustomId: course.courseId }],
    }).select('-questions.correctAnswerIndex -questions.explanation');

    if (!quiz) {
      return {
        error: 'QUIZ_NOT_FOUND',
        message: 'No quiz assessment found for this course.',
      };
    }

    return {
      course,
      quiz: {
        id: quiz._id.toString(),
        title: quiz.title,
        passingScore: quiz.passingScore,
        questionsCount: quiz.questions.length,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
        })),
      },
    };
  },

  // Grade submitted answers on the server and award XP securely
  async gradeQuizSubmission(courseIdOrSlug, userId, submittedAnswers = {}) {
    const course = await this.getCourseByIdOrSlug(courseIdOrSlug);
    if (!course) {
      return { error: 'COURSE_NOT_FOUND', message: 'Course not found.' };
    }

    // Retrieve quiz WITH correct answers for grading
    const quiz = await Quiz.findOne({
      $or: [{ courseId: course._id }, { courseCustomId: course.courseId }],
    });

    if (!quiz) {
      return { error: 'QUIZ_NOT_FOUND', message: 'Assessment quiz not found.' };
    }

    const totalQuestions = quiz.questions.length;
    let correctCount = 0;
    const gradedQuestions = [];

    // Evaluate each question strictly on the server
    for (const q of quiz.questions) {
      const selectedIndex = submittedAnswers[q.id];
      const isCorrect =
        selectedIndex !== undefined &&
        parseInt(selectedIndex, 10) === q.correctAnswerIndex;

      if (isCorrect) {
        correctCount += 1;
      }

      gradedQuestions.push({
        id: q.id,
        question: q.question,
        options: q.options,
        submittedIndex: selectedIndex !== undefined ? parseInt(selectedIndex, 10) : null,
        correctAnswerIndex: q.correctAnswerIndex,
        isCorrect,
        explanation: q.explanation,
      });
    }

    const calculatedScore = Math.round((correctCount / totalQuestions) * 100);
    const passed = calculatedScore >= (quiz.passingScore || 70);

    // Retrieve previous attempts to prevent duplicate XP rewards
    let attempt = await QuizAttempt.findOne({
      userId,
      courseId: course._id,
    });

    let xpAwardedTotal = 0;
    const isFirstPass = !attempt || !attempt.passedXpAwarded;
    const isFirstPerfect = !attempt || !attempt.perfectXpAwarded;

    let shouldAwardPassXp = false;
    let shouldAwardPerfectXp = false;

    if (passed && isFirstPass) {
      shouldAwardPassXp = true;
      xpAwardedTotal += 100; // SRS GAME-REQ-03 (+100 XP for passing)
    }

    if (calculatedScore === 100 && isFirstPerfect) {
      shouldAwardPerfectXp = true;
      xpAwardedTotal += 50; // SRS GAME-REQ-03 (+50 XP bonus for perfect score)
    }

    // Award XP atomically if eligible
    if (xpAwardedTotal > 0) {
      await awardUserXp(
        userId,
        xpAwardedTotal,
        `Passed ${course.title} assessment with score ${calculatedScore}%`
      );
    }

    // Save or update QuizAttempt in MongoDB
    if (!attempt) {
      attempt = new QuizAttempt({
        userId,
        courseId: course._id,
        courseCustomId: course.courseId || course.id,
        score: calculatedScore,
        passed,
        highestScore: calculatedScore,
        answers: submittedAnswers,
        attemptsCount: 1,
        passedXpAwarded: passed,
        perfectXpAwarded: calculatedScore === 100,
        lastAttemptAt: new Date(),
      });
    } else {
      attempt.attemptsCount += 1;
      attempt.score = calculatedScore;
      attempt.passed = attempt.passed || passed;
      attempt.highestScore = Math.max(attempt.highestScore || 0, calculatedScore);
      attempt.answers = submittedAnswers;
      if (shouldAwardPassXp) attempt.passedXpAwarded = true;
      if (shouldAwardPerfectXp) attempt.perfectXpAwarded = true;
      attempt.lastAttemptAt = new Date();
    }

    await attempt.save();

    return {
      success: true,
      score: calculatedScore,
      passed,
      passingScore: quiz.passingScore || 70,
      correctCount,
      totalQuestions,
      highestScore: attempt.highestScore,
      attemptsCount: attempt.attemptsCount,
      xpAwarded: xpAwardedTotal,
      gradedQuestions,
    };
  },
};

