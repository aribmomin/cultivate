import '../src/config/loadEnv.js';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, Course, CourseProgress, Farm, SimulationConfig } from '../src/models/index.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export const runAuthIsolationTests = async () => {
  console.log('\n======================================================');
  console.log('🧪 RUNNING CRITICAL AUTH & USER ISOLATION TEST SUITE');
  console.log('======================================================\n');

  await connectDB();
  const PORT = 5007; // Isolated test port
  const BASE_URL = `http://localhost:${PORT}/api`;

  const server = app.listen(PORT);
  const results = [];

  const recordTest = (testNumber, description, passed, details = '') => {
    results.push({ testNumber, description, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[Test ${testNumber.toString().padStart(2, '0')}] ${mark}: ${description}`);
    if (details) {
      console.log(`         ↳ ${details}`);
    }
  };

  const ts = Date.now();
  const emailA = `isolation.user.a.${ts}@cultivate.test`;
  const emailB = `isolation.user.b.${ts}@cultivate.test`;
  const emailC = `isolation.user.c.${ts}@cultivate.test`;
  const password = 'SecurePassword123!';

  let tokenA = null;
  let userAId = null;
  let tokenB = null;
  let userBId = null;
  let tokenAdmin = null;

  try {
    // 1. Register Account A
    const regResA = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Account A Learner',
        email: emailA,
        password,
        institution: 'Agro Ecology Institute A',
      }),
    });
    const regDataA = await regResA.json();
    tokenA = regDataA.token;
    userAId = regDataA.user?.id || regDataA.user?._id;
    recordTest(
      1,
      'Register fresh Account A (POST /api/auth/register)',
      regResA.status === 201 && regDataA.success && Boolean(tokenA),
      `User A ID: ${userAId}`
    );

    // 2. Register Account B
    const regResB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Account B Learner',
        email: emailB,
        password,
        institution: 'Agro Ecology Institute B',
      }),
    });
    const regDataB = await regResB.json();
    tokenB = regDataB.token;
    userBId = regDataB.user?.id || regDataB.user?._id;
    recordTest(
      2,
      'Register fresh Account B (POST /api/auth/register)',
      regResB.status === 201 && regDataB.success && Boolean(tokenB),
      `User B ID: ${userBId}`
    );

    // 3. User profiles return isolated data
    const meResA = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const meDataA = await meResA.json();

    const meResB = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const meDataB = await meResB.json();

    const isDifferent =
      meDataA.user?.email === emailA &&
      meDataB.user?.email === emailB &&
      meDataA.user?.id !== meDataB.user?.id;

    recordTest(
      3,
      'GET /api/auth/me returns strictly isolated user profiles',
      meResA.status === 200 && meResB.status === 200 && isDifferent,
      `User A: ${meDataA.user?.name} | User B: ${meDataB.user?.name}`
    );

    // 4. Reject unauthenticated access on protected endpoints (401)
    const noTokenMe = await fetch(`${BASE_URL}/auth/me`);
    const noTokenProgress = await fetch(`${BASE_URL}/progress`);
    const noTokenFarm = await fetch(`${BASE_URL}/farms/me`);
    const allRejected =
      noTokenMe.status === 401 &&
      noTokenProgress.status === 401 &&
      noTokenFarm.status === 401;

    recordTest(
      4,
      'Protected endpoints reject requests without JWT (401 Unauthorized)',
      allRejected,
      `Me: ${noTokenMe.status}, Progress: ${noTokenProgress.status}, Farm: ${noTokenFarm.status}`
    );

    // 5. Account A completes a lesson in course
    const targetCourse = await Course.findOne({});
    const courseId = targetCourse?.courseId || targetCourse?.id || 'course-soil-systems';
    const lessonId = targetCourse?.lessons?.[0]?.id || 'l-101';

    const toggleResA = await fetch(`${BASE_URL}/progress/lessons/${lessonId}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ courseId }),
    });
    const toggleDataA = await toggleResA.json();

    recordTest(
      5,
      `Account A completes lesson '${lessonId}' (POST /api/progress/lessons/:id/toggle)`,
      toggleResA.status === 200 && toggleDataA.success && toggleDataA.isCompleted === true,
      `Completed lessons for A: ${JSON.stringify(toggleDataA.completedLessons)}`
    );

    // 6. Verify Account A's progress includes the completed lesson
    const progResA = await fetch(`${BASE_URL}/progress`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const progDataA = await progResA.json();
    const userALessons = progDataA.completedLessons?.[courseId] || [];

    recordTest(
      6,
      'Account A progress includes completed lesson in MongoDB',
      progResA.status === 200 && userALessons.includes(lessonId),
      `User A completed count: ${userALessons.length}`
    );

    // 7. Verify Account B's progress remains strictly 0 (no data leakage)
    const progResB = await fetch(`${BASE_URL}/progress`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const progDataB = await progResB.json();
    const userBLessons = progDataB.completedLessons?.[courseId] || [];

    recordTest(
      7,
      'Account B has 0 completed lessons (strict account-wise isolation)',
      progResB.status === 200 && userBLessons.length === 0,
      `User B completed count: ${userBLessons.length} (expected 0)`
    );

    // 8. Account B completes a different lesson
    const lessonId2 = targetCourse?.lessons?.[1]?.id || 'l-102';
    const toggleResB = await fetch(`${BASE_URL}/progress/lessons/${lessonId2}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ courseId }),
    });
    const toggleDataB = await toggleResB.json();

    recordTest(
      8,
      `Account B completes lesson '${lessonId2}'`,
      toggleResB.status === 200 && toggleDataB.success,
      `Completed lessons for B: ${JSON.stringify(toggleDataB.completedLessons)}`
    );

    // 9. Re-verify Account A and Account B data separation
    const reProgA = await (await fetch(`${BASE_URL}/progress`, { headers: { Authorization: `Bearer ${tokenA}` } })).json();
    const reProgB = await (await fetch(`${BASE_URL}/progress`, { headers: { Authorization: `Bearer ${tokenB}` } })).json();

    const aHasOnly1 =
      (reProgA.completedLessons?.[courseId] || []).includes(lessonId) &&
      !(reProgA.completedLessons?.[courseId] || []).includes(lessonId2);

    const bHasOnly2 =
      !(reProgB.completedLessons?.[courseId] || []).includes(lessonId) &&
      (reProgB.completedLessons?.[courseId] || []).includes(lessonId2);

    recordTest(
      9,
      'Bidirectional isolation: Account A only sees lesson 1, Account B only sees lesson 2',
      aHasOnly1 && bHasOnly2,
      `A: ${JSON.stringify(reProgA.completedLessons?.[courseId])} | B: ${JSON.stringify(reProgB.completedLessons?.[courseId])}`
    );

    // 10. Logout token invalidation via tokenVersion
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const logoutData = await logoutRes.json();

    const postLogoutMe = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    recordTest(
      10,
      'Server-side logout invalidates JWT via tokenVersion (POST /api/auth/logout)',
      logoutRes.status === 200 && logoutData.success && postLogoutMe.status === 401,
      `Logout status: ${logoutRes.status}, Post-logout query status: ${postLogoutMe.status}`
    );

    // 11. Admin login with password authentication
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sarah.jenkins@cultivate.org',
        password: 'CultivateAdmin@2026',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    tokenAdmin = adminLoginData.token;

    recordTest(
      11,
      'Admin authenticates with designated password (POST /api/auth/login)',
      adminLoginRes.status === 200 && adminLoginData.user?.role === 'admin' && Boolean(tokenAdmin),
      `Admin name: ${adminLoginData.user?.name}, role: ${adminLoginData.user?.role}`
    );

    // 12. Admin updates global simulation initialBudget to $800
    const updateCoeffsRes = await fetch(`${BASE_URL}/admin/simulation-coefficients`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        initialBudget: 800,
      }),
    });
    const updateCoeffsData = await updateCoeffsRes.json();

    recordTest(
      12,
      'Admin updates global SimulationConfig initialBudget to $800.00 (PUT /api/admin/simulation-coefficients)',
      updateCoeffsRes.status === 200 && updateCoeffsData.coefficients?.initialBudget === 800,
      `New initial budget: $${updateCoeffsData.coefficients?.initialBudget}`
    );

    // 13. Fresh learner Account C initializes farm with dynamic $800 budget
    const regResC = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Account C Learner',
        email: emailC,
        password,
        institution: 'Agro Ecology Institute C',
      }),
    });
    const regDataC = await regResC.json();
    const tokenC = regDataC.token;

    const farmResC = await fetch(`${BASE_URL}/farms/me`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const farmDataC = await farmResC.json();

    recordTest(
      13,
      'Fresh user farm reflects dynamic admin initialBudget ($800.00) from MongoDB',
      farmResC.status === 200 && farmDataC.farm?.budget === 800,
      `User C initial farm budget: $${farmDataC.farm?.budget} (expected 800)`
    );

    // 14. Reset farm uses dynamic initialBudget ($800.00)
    const resetResC = await fetch(`${BASE_URL}/farms/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const resetDataC = await resetResC.json();

    recordTest(
      14,
      'Farm reset (POST /api/farms/reset) uses dynamic admin initialBudget ($800.00)',
      resetResC.status === 200 && resetDataC.farm?.budget === 800,
      `User C reset farm budget: $${resetDataC.farm?.budget} (expected 800)`
    );

    // 15. Restore SimulationConfig initialBudget back to $650 baseline
    const restoreRes = await fetch(`${BASE_URL}/admin/simulation-coefficients`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        initialBudget: 650,
      }),
    });
    const restoreData = await restoreRes.json();

    recordTest(
      15,
      'Restored global SimulationConfig initialBudget to baseline $650.00',
      restoreRes.status === 200 && restoreData.coefficients?.initialBudget === 650,
      `Cleaned up baseline initialBudget: $${restoreData.coefficients?.initialBudget}`
    );

    // 16. Source code audit: Verify no hardcoded credentials in AdminPortalPage UI
    const adminPath = fs.existsSync(path.resolve(process.cwd(), 'client/src/pages/admin/AdminPortalPage.jsx'))
      ? path.resolve(process.cwd(), 'client/src/pages/admin/AdminPortalPage.jsx')
      : path.resolve(process.cwd(), '../client/src/pages/admin/AdminPortalPage.jsx');
    const adminPageContent = fs.readFileSync(adminPath, 'utf8');
    const hasPlaintextPassword = adminPageContent.includes('CultivateAdmin@2026');
    const hasCredentialsBox = adminPageContent.includes('Designated Admin Credentials:');

    recordTest(
      16,
      'Security Audit: AdminPortalPage UI has NO exposed credentials box or plaintext password',
      !hasPlaintextPassword && !hasCredentialsBox,
      `Plaintext password found: ${hasPlaintextPassword}, Credentials box found: ${hasCredentialsBox}`
    );

    // 17. Source code audit: Verify no demo personas in AuthPage UI
    const authPath = fs.existsSync(path.resolve(process.cwd(), 'client/src/pages/auth/AuthPage.jsx'))
      ? path.resolve(process.cwd(), 'client/src/pages/auth/AuthPage.jsx')
      : path.resolve(process.cwd(), '../client/src/pages/auth/AuthPage.jsx');
    const authPageContent = fs.readFileSync(authPath, 'utf8');
    const has1ClickDemo = authPageContent.includes('1-Click Academic Demo Login');
    const hasDemoPersonasImport = authPageContent.includes('DEMO_PERSONAS');

    recordTest(
      17,
      'Security Audit: AuthPage UI has NO 1-Click Academic Demo Login or DEMO_PERSONAS rendered',
      !has1ClickDemo && !hasDemoPersonasImport,
      `1-Click demo found: ${has1ClickDemo}, DEMO_PERSONAS found: ${hasDemoPersonasImport}`
    );
  } finally {
    // Cleanup created test records
    try {
      await User.deleteMany({ email: { $in: [emailA, emailB, emailC] } });
      if (userAId) {
        await CourseProgress.deleteMany({ userId: userAId });
        await Farm.deleteMany({ userId: userAId });
      }
      if (userBId) {
        await CourseProgress.deleteMany({ userId: userBId });
        await Farm.deleteMany({ userId: userBId });
      }
    } catch {
      // ignore cleanup errors
    }

    server.close();
    await mongoose.connection.close();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log('======================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
};

runAuthIsolationTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
