import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: (opts) => opts && opts.length >= 2,
        message: 'A question must provide at least 2 answer options',
      },
      required: true,
    },
    correctAnswerIndex: {
      type: Number,
      required: [true, 'Correct answer index is required'],
      min: 0,
    },
    explanation: {
      type: String,
      required: [true, 'Educational explanation is required'],
    },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      unique: true,
      index: true,
    },
    courseCustomId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
    },
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100,
    },
    questions: [quizQuestionSchema],
  },
  {
    timestamps: true,
  }
);

export const Quiz = mongoose.model('Quiz', quizSchema);

