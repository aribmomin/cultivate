import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}

dotenv.config({ path: path.resolve('server/.env') });

async function resetBaseline() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in server/.env');
  await mongoose.connect(uri);
  console.log('Connected to Atlas:', mongoose.connection.name);

  // 1. Delete all CourseProgress and QuizAttempt records so all courses start at 0%
  const cpRes = await mongoose.connection.collection('courseprogresses').deleteMany({});
  console.log('Deleted CourseProgress records:', cpRes.deletedCount);
  const qaRes = await mongoose.connection.collection('quizattempts').deleteMany({});
  console.log('Deleted QuizAttempt records:', qaRes.deletedCount);

  // 1b. Ensure the 4 primary courses are set to Active status and remove ad-hoc test courses
  await mongoose.connection.collection('courses').updateMany(
    { courseId: { $in: ['course-soil-biology', 'course-ipm-defense', 'course-water-conservation', 'course-crop-rotation'] } },
    { $set: { status: 'Active' } }
  );
  await mongoose.connection.collection('courses').deleteMany({
    courseId: { $nin: ['course-soil-biology', 'course-ipm-defense', 'course-water-conservation', 'course-crop-rotation'] }
  });
  console.log('Active courses verified in database.');

  // 2. Set Admin Dr. Sarah Jenkins password to CultivateAdmin@2026
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('CultivateAdmin@2026', salt);

  const adminUpdate = await mongoose.connection.collection('users').updateOne(
    { email: { $in: ['sarah.jenkins@cultivate.org', 'sarah.jenkins@terralearn.org'] } },
    {
      $set: {
        email: 'sarah.jenkins@cultivate.org',
        password: hashedPassword,
        institution: 'Cultivate Foundation',
        role: 'admin',
        roleLabel: 'Curriculum Administrator'
      }
    },
    { upsert: false }
  );
  console.log('Admin user update matched:', adminUpdate.matchedCount, 'modified:', adminUpdate.modifiedCount);

  // 3. Reset all user farms to Day 1 with empty fallow plots
  const emptyTiles = [
    { id: 'tile-A1', row: 0, col: 0, label: 'A1', soilHealth: 84, moisture: 60, nitrogenLevel: 80, pestRisk: 18, plantedCrop: null, previousCrop: null },
    { id: 'tile-A2', row: 0, col: 1, label: 'A2', soilHealth: 76, moisture: 45, nitrogenLevel: 70, pestRisk: 22, plantedCrop: null, previousCrop: null },
    { id: 'tile-A3', row: 0, col: 2, label: 'A3', soilHealth: 88, moisture: 65, nitrogenLevel: 85, pestRisk: 10, plantedCrop: null, previousCrop: null },
    { id: 'tile-A4', row: 0, col: 3, label: 'A4', soilHealth: 82, moisture: 58, nitrogenLevel: 78, pestRisk: 12, plantedCrop: null, previousCrop: null },
    { id: 'tile-B1', row: 1, col: 0, label: 'B1', soilHealth: 79, moisture: 52, nitrogenLevel: 74, pestRisk: 15, plantedCrop: null, previousCrop: null },
    { id: 'tile-B2', row: 1, col: 1, label: 'B2', soilHealth: 85, moisture: 70, nitrogenLevel: 82, pestRisk: 14, plantedCrop: null, previousCrop: null },
    { id: 'tile-B3', row: 1, col: 2, label: 'B3', soilHealth: 75, moisture: 40, nitrogenLevel: 68, pestRisk: 20, plantedCrop: null, previousCrop: null },
    { id: 'tile-B4', row: 1, col: 3, label: 'B4', soilHealth: 90, moisture: 62, nitrogenLevel: 88, pestRisk: 8, plantedCrop: null, previousCrop: null },
    { id: 'tile-C1', row: 2, col: 0, label: 'C1', soilHealth: 81, moisture: 55, nitrogenLevel: 75, pestRisk: 16, plantedCrop: null, previousCrop: null },
    { id: 'tile-C2', row: 2, col: 1, label: 'C2', soilHealth: 83, moisture: 58, nitrogenLevel: 79, pestRisk: 12, plantedCrop: null, previousCrop: null },
    { id: 'tile-C3', row: 2, col: 2, label: 'C3', soilHealth: 86, moisture: 60, nitrogenLevel: 84, pestRisk: 11, plantedCrop: null, previousCrop: null },
    { id: 'tile-C4', row: 2, col: 3, label: 'C4', soilHealth: 80, moisture: 50, nitrogenLevel: 72, pestRisk: 18, plantedCrop: null, previousCrop: null },
  ];

  const farmRes = await mongoose.connection.collection('farms').updateMany(
    {},
    {
      $set: {
        day: 1,
        tiles: emptyTiles,
        budget: 650.0,
        logs: [
          {
            id: 'log-init-1',
            day: 1,
            type: 'info',
            message: 'Farm initialized on Day 1. All 12 fertile plots are fallow and ready for organic planting.'
          }
        ]
      }
    }
  );
  console.log('Reset farms matched:', farmRes.matchedCount, 'modified:', farmRes.modifiedCount);

  await mongoose.disconnect();
  console.log('Database baseline reset complete.');
}

resetBaseline().catch(err => { console.error(err); process.exit(1); });
