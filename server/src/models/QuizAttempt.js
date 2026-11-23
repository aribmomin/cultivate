import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    courseCustomId: {
      type: String,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    highestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    answers: {
      type: Map,
      of: Number, // Stores questionId -> chosenOptionIndex
    },
    passedXpAwarded: {
      type: Boolean,
      default: false,
    },
    perfectXpAwarded: {
      type: Boolean,
      default: false,
    },
    attemptsCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one record per user per course quiz tracking best and latest score
quizAttemptSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

