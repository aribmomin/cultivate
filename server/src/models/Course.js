import mongoose from 'mongoose';

const lessonSectionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['paragraph', 'callout', 'key_takeaways', 'list', 'subheading'],
      default: 'paragraph',
    },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    variant: { type: String, trim: true }, // e.g., 'tip', 'info', 'warning'
    content: { type: String, trim: true },
    items: [{ type: String, trim: true }],
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
    },
    duration: {
      type: String,
      default: '15 min read',
    },
    summary: {
      type: String,
      trim: true,
    },
    sections: [lessonSectionSchema],
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Course slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    tagline: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
      index: true,
    },
    difficultyColor: {
      type: String,
      default: '#059669',
    },
    estimatedHours: {
      type: String,
      default: '3.5 hrs',
    },
    lessonsCount: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 1,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['Active', 'Draft'],
      default: 'Active',
      index: true,
    },
    instructor: {
      name: {
        type: String,
        required: [true, 'Instructor name is required'],
      },
      role: {
        type: String,
        required: [true, 'Instructor role is required'],
      },
    },
    learningObjectives: [
      {
        type: String,
        trim: true,
      },
    ],
    lessons: [lessonSchema],
  },
  {
    timestamps: true,
  }
);

// Auto-sync lessonsCount before saving
courseSchema.pre('save', function (next) {
  if (this.lessons && Array.isArray(this.lessons)) {
    this.lessonsCount = this.lessons.length;
  }
  next();
});

export const Course = mongoose.model('Course', courseSchema);

