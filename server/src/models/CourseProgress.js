import mongoose from 'mongoose';

const courseProgressSchema = new mongoose.Schema(
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
    completedLessonIds: [
      {
        type: String,
      },
    ],
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring only one progress document per user per course
courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseProgress = mongoose.model(
  'CourseProgress',
  courseProgressSchema
);

