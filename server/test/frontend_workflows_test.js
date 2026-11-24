import '../src/config/loadEnv.js';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, Course, Crop, Farm, SimulationConfig, AuditLog, CourseProgress } from '../src/models/index.js';
import mongoose from 'mongoose';

export async function runFrontendWorkflowTests() {
  console.log('========================================================================');
  console.log('🚀 FRONTEND WORKFLOWS & CRITICAL BUG FIX INTEGRATION TEST SUITE');
  console.log('Testing Priority 1 (Course Progress), Priority 2 (Admin), Priority 3 (Harvest)');
  console.log('========================================================================\n');

  await connectDB();
  const PORT = 5008; // Isolated test port
  const BASE_URL = `http://localhost:${PORT}/api`;
  const server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- Helper API fetcher ---
  async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  try {
    // --------------------------------------------------------------------------
    // PRIORITY 1: COURSE PROGRESS SAVING, PERSISTENCE & USER ISOLATION
    // --------------------------------------------------------------------------
    console.log('\n--- [PRIORITY 1] COURSE PROGRESS & USER ISOLATION ---');

    const userAEmail = `learner_a_${Date.now()}@test.cultivate.org`;
    const userBEmail = `learner_b_${Date.now()}@test.cultivate.org`;
    const password = 'TestPassword@123';

    // 1. Register User A
    const regARes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Learner A', email: userAEmail, password, role: 'learner' }),
    });
    assert(regARes.ok && regARes.data.token, 'User A registered successfully with JWT');
    const tokenA = regARes.data.token;
    const userAId = regARes.data.user?._id || regARes.data.user?.id;
    assert(userAId && (regARes.data.user?._id || regARes.data.user?.id), 'User A response contains valid user ID in _id and id');

    // 2. Fetch courses
    const coursesRes = await api('/courses', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(coursesRes.ok && coursesRes.data.courses?.length > 0, 'Fetched active course catalog');
    const targetCourse = coursesRes.data.courses[0];
    const targetCourseId = targetCourse.courseId || targetCourse.id || targetCourse._id;
    const targetLesson = targetCourse.lessons?.[0];
    const targetLessonId = targetLesson?.lessonId || targetLesson?.id || 'lesson-sb-1';

    // 3. Mark lesson complete as User A
    const toggleRes = await api(`/progress/lessons/${targetLessonId}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ courseId: targetCourseId }),
    });
    assert(toggleRes.ok && toggleRes.data.isCompleted === true, 'Marked lesson as complete on backend');
    assert(toggleRes.data.xpAwarded === 50, 'Awarded +50 XP on first lesson completion');

    // Verify in MongoDB directly
    const progressDocA = await CourseProgress.findOne({ userId: userAId });
    assert(progressDocA && progressDocA.completedLessonIds.includes(targetLessonId), 'MongoDB CourseProgress document verified for User A');

    // 4. Verify User A progress query returns lesson
    const progARes = await api('/progress', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(progARes.ok && progARes.data.completedLessons, 'User A progress retrieved via /api/progress');
    const lessonsForCourseA = progARes.data.completedLessons[targetCourseId] || [];
    assert(lessonsForCourseA.includes(targetLessonId), 'User A completedLessons contains target lesson');

    // 5. Register User B and verify Account Isolation
    const regBRes = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Learner B', email: userBEmail, password, role: 'learner' }),
    });
    const tokenB = regBRes.data.token;

    const progBRes = await api('/progress', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const lessonsForCourseB = progBRes.data?.completedLessons?.[targetCourseId] || [];
    assert(!lessonsForCourseB.includes(targetLessonId), 'Account Isolation: User B sees 0% progress and does NOT see User A lessons');

    // 6. Simulate Logout and Login for User A
    const loginARes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userAEmail, password }),
    });
    assert(loginARes.ok && loginARes.data.token, 'User A re-authenticated successfully after logout');
    const reTokenA = loginARes.data.token;

    const reProgARes = await api('/progress', {
      headers: { Authorization: `Bearer ${reTokenA}` },
    });
    const reLessonsA = reProgARes.data?.completedLessons?.[targetCourseId] || [];
    assert(reLessonsA.includes(targetLessonId), 'Progress persistence: User A progress fully restored on re-login');

    // 7. Reset course progress for User A
    const resetProgRes = await api(`/progress/courses/${targetCourseId}/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${reTokenA}` },
    });
    assert(resetProgRes.ok && resetProgRes.data.success, 'Course progress reset successfully via backend API');

    const afterResetProgRes = await api('/progress', {
      headers: { Authorization: `Bearer ${reTokenA}` },
    });
    const afterResetLessons = afterResetProgRes.data?.completedLessons?.[targetCourseId] || [];
    assert(afterResetLessons.length === 0, 'Course progress empty after user resets course');

    // --------------------------------------------------------------------------
    // PRIORITY 2: ADMIN PORTAL CONTROLS, CALIBRATION & INITIAL BUDGET
    // --------------------------------------------------------------------------
    console.log('\n--- [PRIORITY 2] ADMIN PORTAL CONTROLS & GLOBAL CONFIG ---');

    // 1. Admin login
    const adminLoginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'sarah.jenkins@cultivate.org', password: 'CultivateAdmin@2026' }),
    });
    assert(adminLoginRes.ok && adminLoginRes.data.token, 'Admin authenticated with CultivateAdmin@2026');
    const adminToken = adminLoginRes.data.token;

    // 2. Overview returns live MongoDB collections
    const overviewRes = await api('/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      overviewRes.ok &&
      Array.isArray(overviewRes.data.courses) &&
      Array.isArray(overviewRes.data.crops) &&
      overviewRes.data.coefficients &&
      Array.isArray(overviewRes.data.auditLogs),
      'Admin overview returns live courses, crops, coefficients, and audit logs from MongoDB'
    );

    // 3. Course creation
    const createCourseRes = await api('/admin/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Regenerative Micro-Mycology',
        category: 'Soil Health',
        difficulty: 'Intermediate',
        duration: '4 Hours',
        description: 'Advanced mycorrhizal inoculants and fungal networks.',
      }),
    });
    assert(createCourseRes.ok && createCourseRes.data.course, 'Admin created new course in MongoDB');
    const createdCourseId = createCourseRes.data.course.courseId;

    // 4. Course status toggle
    const toggleCourseRes = await api(`/admin/courses/${createdCourseId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(toggleCourseRes.ok && toggleCourseRes.data.course.status === 'Draft', 'Toggled course status to Draft');

    // 5. Quiz question authoring
    const addQRes = await api(`/admin/courses/${createdCourseId}/quiz/questions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        question: 'What is the symbiotic role of arbuscular mycorrhizal fungi?',
        options: [
          'Transporting phosphorus in exchange for plant carbon',
          'Consuming plant chlorophyll',
          'Synthesizing synthetic ammonia',
          'Sterilizing rhizosphere bacteria',
        ],
        correctAnswer: 0,
        explanation: 'AMF hyphae solubilize and transfer bio-available phosphorus.',
      }),
    });
    assert(addQRes.ok && addQRes.data.success, 'Authored and appended quiz question in MongoDB');

    // 6. Crop parameter calibration
    const calibrateCropRes = await api('/admin/crops/crop-tomato', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        baseGrowthDays: 32,
        dailyWaterNeed: 20,
        marketPricePerKg: 3.85,
        minHarvestDay: 30,
      }),
    });
    assert(calibrateCropRes.ok && calibrateCropRes.data.crop.baseGrowthDays === 32, 'Calibrated Tomato agronomic parameters in MongoDB');

    // 7. Global Initial Budget update ($650 -> $1000) propagation
    const getFarmResBefore = await api('/farms/me', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(getFarmResBefore.ok && getFarmResBefore.data.farm, 'Fetched User B untouched farm');

    const updateCoeffRes = await api('/admin/simulation-coefficients', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        initialBudget: 1000,
        dailyEvaporationRate: 6,
        rainfallBonus: 18,
        waterStressThreshold: 20,
        irrigationMoistureBoost: 35,
        neemPestReduction: 30,
      }),
    });
    assert(updateCoeffRes.ok && updateCoeffRes.data.coefficients.initialBudget === 1000, 'Updated global initial budget to $1000');

    // Verify User B's untouched farm receives the $1000 initial budget
    const getFarmResAfter = await api('/farms/me', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(getFarmResAfter.data.farm.budget === 1000, 'Untouched farm automatically reflects updated initial budget of $1000');

    // Restore initialBudget back to $650 for baseline
    await api('/admin/simulation-coefficients', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ initialBudget: 650 }),
    });

    // 8. Audit logs recorded
    const auditLogsRes = await api('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditLogsRes.ok && auditLogsRes.data.auditLogs.length >= 4, 'Audit trail recorded all administrative actions');

    // --------------------------------------------------------------------------
    // PRIORITY 3: FARM HARVESTING, MATURITY RULES, BUDGET & REWARDS
    // --------------------------------------------------------------------------
    console.log('\n--- [PRIORITY 3] FARM HARVESTING & MATURITY RULES ---');

    // Reset User B farm
    const resetFarmRes = await api('/farms/reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(resetFarmRes.ok && resetFarmRes.data.farm, 'Reset User B farm to pristine baseline');

    // 1. Plant tomato on tile-A1
    const plantRes = await api('/farms/action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ actionType: 'plant', tileId: 'tile-A1', cropId: 'crop-tomato' }),
    });
    assert(plantRes.ok && plantRes.data.farm.tiles[0].plantedCrop !== null, 'Planted Tomato in tile-A1');

    // 2. Immediate harvest MUST be rejected (premature harvest prevention)
    const prematureHarvestRes = await api('/farms/action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ actionType: 'harvest', tileId: 'tile-A1' }),
    });
    assert(!prematureHarvestRes.ok && prematureHarvestRes.status === 400, 'Premature harvest rejected by server validation (SRS SIM-REQ-11)');

    // 3. Advance days until crop reaches maturity (tomato minHarvestDay is 30, calibrated above)
    let farmState = plantRes.data.farm;
    console.log('  ⏳ Advancing simulation days to mature crop...');
    for (let day = 1; day <= 31; day++) {
      const advRes = await api('/farms/advance-day', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      farmState = advRes.data.farm;
      // Keep tile watered so plant doesn't die of dehydration
      if (farmState.tiles[0].moisture < 25) {
        await api('/farms/action', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenB}` },
          body: JSON.stringify({ actionType: 'irrigate', tileId: 'tile-A1' }),
        });
      }
    }

    const matureTile = farmState.tiles[0];
    assert(
      matureTile.plantedCrop && matureTile.plantedCrop.daysPlanted >= 30,
      `Crop successfully advanced to maturity (Day ${matureTile.plantedCrop?.daysPlanted})`
    );
    assert(
      matureTile.plantedCrop?.readyToHarvest === true,
      'Crop tile has readyToHarvest = true'
    );

    // 4. Execute valid harvest
    const budgetBeforeHarvest = farmState.budget;
    const harvestRes = await api('/farms/action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ actionType: 'harvest', tileId: 'tile-A1' }),
    });

    assert(harvestRes.ok && harvestRes.data.success, 'Server processed harvest action successfully');
    assert(harvestRes.data.harvestData && harvestRes.data.harvestData.yieldKg > 0, 'Harvest data returned with positive yieldKg');
    assert(harvestRes.data.harvestData.grossRevenue > 0, 'Harvest gross revenue calculated correctly');
    assert(harvestRes.data.farm.budget > budgetBeforeHarvest, 'Farm budget credited with harvest revenue');
    assert(harvestRes.data.farm.totalCropsHarvested === 1, 'totalCropsHarvested incremented to 1');
    assert(harvestRes.data.farm.tiles[0].plantedCrop === null, 'Harvested plot cleared back to fallow state');
    assert(harvestRes.data.farm.tiles[0].previousCrop === 'Heritage Tomato', 'previousCrop recorded on tile');

    // 5. Attempt duplicate harvest on cleared plot
    const duplicateHarvestRes = await api('/farms/action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ actionType: 'harvest', tileId: 'tile-A1' }),
    });
    assert(!duplicateHarvestRes.ok && duplicateHarvestRes.status === 400, 'Duplicate harvest on cleared plot rejected');

    // Clean up created test course so baseline remains 4 core active courses
    await Course.deleteOne({ courseId: createdCourseId });
    await Course.updateMany(
      { courseId: { $in: ['course-soil-biology', 'course-ipm', 'course-water-stewardship', 'course-crop-rotation'] } },
      { $set: { status: 'Active' } }
    );

    // Summary
    console.log('\n========================================================================');
    console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    server.close();
    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution fatal error:', err);
    server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('frontend_workflows_test.js')) {
  runFrontendWorkflowTests();
}
