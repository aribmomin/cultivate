import '../config/loadEnv.js';
import mongoose from 'mongoose';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Fix for Windows / ISP DNS servers that refuse SRV record queries for mongodb+srv://
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore
}

import { Course } from '../models/Course.js';
import { Quiz } from '../models/Quiz.js';
import { Crop } from '../models/Crop.js';
import { SimulationConfig } from '../models/SimulationConfig.js';
import { User } from '../models/User.js';

// Import canonical datasets from client
import { MOCK_COURSES } from '../../../client/src/data/mockCourses.js';
import { MOCK_CROPS } from '../../../client/src/data/mockCrops.js';

const DEFAULT_COEFFICIENTS = {
  singletonKey: 'default',
  initialBudget: 650,
  dailyEvaporationRate: 6,
  rainfallBonus: 18,
  waterStressThreshold: 20,
  irrigationMoistureBoost: 35,
  irrigationCost: 10,
  compostSoilHealthBoost: 16,
  compostNitrogenBoost: 22,
  compostCost: 25,
  neemPestReduction: 30,
  neemCost: 20,
  yieldPlotMultiplier: 0.28,
};

const DEMO_PERSONAS = [
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@wageningen.edu',
    password: 'password123',
    role: 'learner',
    roleLabel: 'Agroecology Student',
    institution: 'Wageningen University',
    avatar: 'ER',
    bio: 'Undergraduate student researching living mulch and organic pest resistance in Solanaceae crops.',
    xp: 450,
    level: 2,
  },
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@cornell.edu',
    password: 'password123',
    role: 'instructor',
    roleLabel: 'Agricultural Educator',
    institution: 'Cornell Agroecology Lab',
    avatar: 'MV',
    bio: 'Instructor and extension specialist running regenerative soil workshops and organic trial plots.',
    xp: 1200,
    level: 4,
  },
  {
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@terralearn.org',
    password: 'password123',
    role: 'admin',
    roleLabel: 'Curriculum Administrator',
    institution: 'TerraLearn Foundation',
    avatar: 'SJ',
    bio: 'Curriculum director overseeing biological farming courses, quiz calibrations, and simulator rule coefficients.',
    xp: 2100,
    level: 5,
  },
];

export const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('<username>')) {
    console.error('\n❌ [Seed Aborted]: MONGODB_URI is not configured in server/.env.');
    console.error('👉 Please specify your MongoDB Atlas or local MongoDB URI before running seeder.\n');
    return false;
  }

  try {
    console.log('\n======================================================');
    console.log('🌱 Starting Database Seeding (Idempotent Upsert)...');
    console.log('======================================================');

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`📡 Connected to database: ${mongoose.connection.name}`);

    // 1. Seed Simulation Coefficients
    console.log('\n[1/4] Seeding Environmental Simulation Coefficients...');
    await SimulationConfig.findOneAndUpdate(
      { singletonKey: 'default' },
      DEFAULT_COEFFICIENTS,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('  ✓ Simulation coefficients configured.');

    // 2. Seed Crops (5 Canonical Crops from SRS SIM-REQ-09)
    console.log('\n[2/4] Seeding 5 Core Agricultural Crops...');
    for (const crop of MOCK_CROPS) {
      const cropData = {
        cropId: crop.id,
        name: crop.name,
        scientificName: crop.scientificName,
        category: crop.category,
        baseGrowthDays: crop.baseGrowthDays,
        dailyWaterNeed: crop.dailyWaterNeed,
        optimalSoilHealthMin: crop.optimalSoilHealthMin,
        optimalSoilHealthMax: crop.optimalSoilHealthMax,
        pestSusceptibility: crop.pestSusceptibility || 'Medium',
        baseYieldKg: crop.baseYieldKg,
        marketPricePerKg: crop.marketPricePerKg,
        minHarvestDay: crop.minHarvestDay,
        color: crop.color,
        bgColor: crop.bgColor,
        borderColor: crop.borderColor,
        description: crop.description,
        growthStages: crop.growthStages,
      };

      await Crop.findOneAndUpdate(
        { cropId: crop.id },
        cropData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Crop seeded: ${crop.name} (${crop.id})`);
    }

    // 3. Seed Courses and Secure Quizzes
    console.log('\n[3/4] Seeding Courses & Sanitized Quizzes...');
    for (const course of MOCK_COURSES) {
      const courseData = {
        courseId: course.id,
        title: course.title,
        slug: course.slug || course.id,
        category: course.category,
        tagline: course.tagline,
        description: course.description,
        difficulty: course.difficulty,
        difficultyColor: course.difficultyColor || '#059669',
        estimatedHours: course.estimatedHours,
        lessonsCount: course.lessons?.length || 0,
        order: course.order || 1,
        featured: Boolean(course.featured),
        status: 'Active',
        instructor: course.instructor,
        learningObjectives: course.learningObjectives || [],
        lessons: (course.lessons || []).map((l) => ({
          id: l.id,
          title: l.title,
          duration: l.duration || '15 min read',
          summary: l.summary || '',
          sections: (l.sections || []).map((s) => ({
            type: s.type || 'paragraph',
            title: s.title || '',
            subtitle: s.subtitle || '',
            variant: s.variant || '',
            content: s.content || '',
            items: s.items || [],
          })),
        })),
      };

      const savedCourse = await Course.findOneAndUpdate(
        { slug: courseData.slug },
        courseData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Course seeded: "${savedCourse.title}" (${savedCourse.lessonsCount} lessons)`);

      // Seed associated Quiz if present
      if (course.quiz && course.quiz.questions?.length > 0) {
        const quizData = {
          courseId: savedCourse._id,
          courseCustomId: course.id,
          title: course.quiz.title || `${course.title} Assessment`,
          passingScore: course.quiz.passingScore || 70,
          questions: course.quiz.questions.map((q, idx) => ({
            id: q.id || `q-${idx + 1}`,
            question: q.question,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex ?? q.correctIndex ?? q.correctAnswer ?? 0,
            explanation: q.explanation || 'Verified organic agronomy biological principle.',
          })),
        };

        await Quiz.findOneAndUpdate(
          { courseId: savedCourse._id },
          quizData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log(`    ↳ Quiz seeded: "${quizData.title}" (${quizData.questions.length} questions)`);
      }
    }

    // 4. Seed Demo Personas (Learner, Instructor, Administrator)
    console.log('\n[4/4] Seeding Academic Demo Personas...');
    for (const persona of DEMO_PERSONAS) {
      let existingUser = await User.findOne({ email: persona.email });
      if (!existingUser) {
        existingUser = new User(persona);
        await existingUser.save();
        console.log(`  ✓ Created user persona: ${persona.name} [${persona.role}]`);
      } else {
        existingUser.name = persona.name;
        existingUser.role = persona.role;
        existingUser.roleLabel = persona.roleLabel;
        existingUser.institution = persona.institution;
        existingUser.avatar = persona.avatar;
        existingUser.bio = persona.bio;
        await existingUser.save();
        console.log(`  ✓ Updated user persona: ${persona.name} [${persona.role}]`);
      }
    }

    console.log('\n======================================================');
    console.log('✅ Database seeding completed successfully!');
    console.log('======================================================\n');
    return true;
  } catch (err) {
    console.error('\n❌ [Seeding Error]: Failed to seed database:', err);
    return false;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
};

// Execute if run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
