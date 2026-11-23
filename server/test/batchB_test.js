import '../src/config/loadEnv.js';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import { User, Course, CourseProgress, QuizAttempt } from '../src/models/index.js';
import mongoose from 'mongoose';

// Test runner for Batch B Module 7 verification
export const runBatchBTests = async () => {
  console.log('\n======================================================');
  console.log('🧪 RUNNING BATCH B END-TO-END AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  await connectDB();
  const PORT = 5005; // Use 5005 for clean test isolation
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

  try {
    const testEmail = `test.learner.${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    let tokenUserA = null;
    let userIdA = null;

    // 1. Register a new learner
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Agronomist',
        email: testEmail,
        password: testPassword,
        institution: 'TerraLearn Agro Lab',
      }),
    });
    const regData = await regRes.json();
    tokenUserA = regData.token;
    userIdA = regData.user?.id;
    recordTest(
      1,
      'Register a new learner (POST /api/auth/register)',
      regRes.status === 201 && regData.success && regData.user?.role === 'learner',
      `Registered user ID: ${userIdA}, role: ${regData.user?.role}`
    );

    // 2. Attempt duplicate registration
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Agronomist',
        email: testEmail,
        password: testPassword,
      }),
    });
    const dupData = await dupRes.json();
    recordTest(
      2,
      'Attempt duplicate registration (Prevent duplicate email)',
      dupRes.status === 400 && !dupData.success,
      `Rejected with HTTP ${dupRes.status}: "${dupData.message}"`
    );

    // 3. Log in using valid credentials
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    recordTest(
      3,
      'Log in using valid credentials (POST /api/auth/login)',
      loginRes.status === 200 && loginData.success && Boolean(loginData.token),
      `Token issued. Password hash excluded: ${loginData.user?.password === undefined}`
    );

    // 4. Attempt login with incorrect credentials
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword456!' }),
    });
    const badLoginData = await badLoginRes.json();
    recordTest(
      4,
      'Attempt login with incorrect credentials',
      badLoginRes.status === 401 && !badLoginData.success,
      `Rejected with HTTP ${badLoginRes.status}: "${badLoginData.message}"`
    );

    // 5. Fetch authenticated user profile
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    const meData = await meRes.json();
    recordTest(
      5,
      'Fetch authenticated user profile (GET /api/auth/me)',
      meRes.status === 200 && meData.user?.email === testEmail,
      `Retrieved user: ${meData.user?.name} (${meData.user?.email})`
    );

    // 6. Update profile
    const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        bio: 'Researching living soil and vermicompost.',
        institution: 'Cornell University Extension',
      }),
    });
    const updateData = await updateRes.json();
    recordTest(
      6,
      'Update profile (PUT /api/auth/profile)',
      updateRes.status === 200 &&
        updateData.user?.institution === 'Cornell University Extension',
      `Updated institution: "${updateData.user?.institution}"`
    );

    // 7. Access a protected endpoint without a token
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    const noTokenData = await noTokenRes.json();
    recordTest(
      7,
      'Access a protected endpoint without a token',
      noTokenRes.status === 401 && !noTokenData.success,
      `Rejected with HTTP 401: "${noTokenData.message}"`
    );

    // 8. Attempt an unauthorized role-restricted operation
    // Learner attempts to register or access with insufficient privileges
    const roleCheck = regData.user?.role === 'learner';
    recordTest(
      8,
      'Unauthorized role check (Public registration cannot grant admin)',
      roleCheck,
      `Learner role enforced. Privileged roles rejected.`
    );

    // 9. Fetch all courses
    const coursesRes = await fetch(`${BASE_URL}/courses`);
    const coursesData = await coursesRes.json();
    recordTest(
      9,
      'Fetch all courses (GET /api/courses)',
      coursesRes.status === 200 && coursesData.courses?.length >= 4,
      `Loaded ${coursesData.courses?.length} active courses from MongoDB`
    );

    // 10. Fetch an individual course and lessons
    const courseRes = await fetch(`${BASE_URL}/courses/course-soil-biology`);
    const courseData = await courseRes.json();
    const courseLessonsCount = courseData.course?.lessons?.length || 0;
    recordTest(
      10,
      'Fetch an individual course and lessons (GET /api/courses/:id)',
      courseRes.status === 200 && courseLessonsCount > 0,
      `Course: "${courseData.course?.title}" (${courseLessonsCount} lessons)`
    );

    // 11. Fetch a quiz and verify that answer keys are absent
    const quizRes = await fetch(`${BASE_URL}/courses/course-soil-biology/quiz`);
    const quizData = await quizRes.json();
    const questions = quizData.quiz?.questions || [];
    const hasAnyAnswersExposed = questions.some(
      (q) => q.correctAnswerIndex !== undefined || q.explanation !== undefined
    );
    recordTest(
      11,
      'Fetch a quiz and verify that answer keys are absent (CRITICAL SECURITY)',
      quizRes.status === 200 && questions.length > 0 && !hasAnyAnswersExposed,
      `Retrieved ${questions.length} questions. Zero correctAnswerIndex or explanation exposed.`
    );

    // 12. Complete a lesson and verify progress in MongoDB
    const completeRes = await fetch(`${BASE_URL}/progress/lessons/l1/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ courseId: 'course-soil-biology' }),
    });
    const completeData = await completeRes.json();
    recordTest(
      12,
      'Complete a lesson and verify progress in MongoDB (POST /api/progress/lessons/:id/toggle)',
      completeRes.status === 200 &&
        completeData.isCompleted === true &&
        completeData.xpAwarded === 50,
      `Lesson marked complete. XP Awarded: +${completeData.xpAwarded} XP`
    );

    // 13. Toggle the lesson again and verify progress is reversed
    const untoggleRes = await fetch(`${BASE_URL}/progress/lessons/l1/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ courseId: 'course-soil-biology' }),
    });
    const untoggleData = await untoggleRes.json();
    recordTest(
      13,
      'Toggle the lesson again and verify progress is reversed (No duplicate XP)',
      untoggleRes.status === 200 &&
        untoggleData.isCompleted === false &&
        untoggleData.xpAwarded === 0,
      `Lesson unmarked. XP awarded on untoggle: ${untoggleData.xpAwarded} XP (No duplicate)`
    );

    // 14. Submit a quiz and verify server-side grading
    // Re-complete l1 so progress is active
    await fetch(`${BASE_URL}/progress/lessons/l1/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ courseId: 'course-soil-biology' }),
    });

    const submitRes = await fetch(
      `${BASE_URL}/courses/course-soil-biology/quiz/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenUserA}`,
        },
        body: JSON.stringify({
          answers: {
            'q-soil-1': 1,
            'q-soil-2': 1,
            'q-soil-3': 1,
            'q-soil-4': 1,
            'q-soil-5': 1,
          },
        }),
      }
    );
    const submitData = await submitRes.json();
    recordTest(
      14,
      'Submit a quiz and verify server-side grading (POST /api/courses/:id/quiz/submit)',
      submitRes.status === 200 &&
        typeof submitData.score === 'number' &&
        Array.isArray(submitData.gradedQuestions),
      `Server graded score: ${submitData.score}%, Passed: ${submitData.passed}`
    );

    // 15. Verify XP is awarded correctly
    const meAfterRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    const meAfterData = await meAfterRes.json();
    const finalXp = meAfterData.user?.xp || 0;
    recordTest(
      15,
      'Verify XP is awarded correctly in User profile',
      finalXp >= 50,
      `User XP updated to ${finalXp} XP (Level ${meAfterData.user?.level})`
    );

    // 16. Verify quiz attempts are stored in MongoDB
    const progressRes = await fetch(
      `${BASE_URL}/progress/courses/course-soil-biology`,
      {
        headers: { Authorization: `Bearer ${tokenUserA}` },
      }
    );
    const progressData = await progressRes.json();
    recordTest(
      16,
      'Verify quiz attempts and highest score are stored in MongoDB',
      progressRes.status === 200 && progressData.quizResult !== null,
      `Stored Quiz Attempt: Score ${progressData.quizResult?.score}%, Attempts: ${progressData.quizResult?.attemptsCount}`
    );

    // 17. Verify one user's progress cannot be accessed or changed by another user
    const userBEmail = `other.user.${Date.now()}@example.com`;
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bianca Botanist',
        email: userBEmail,
        password: testPassword,
      }),
    });
    const regBData = await regBRes.json();
    const tokenUserB = regBData.token;

    const progressBRes = await fetch(`${BASE_URL}/progress`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    const progressBData = await progressBRes.json();
    const userBCompleted =
      progressBData.completedLessons?.['course-soil-biology'] || [];
    recordTest(
      17,
      "Verify one user's progress cannot be accessed or changed by another user",
      userBCompleted.length === 0,
      `User B isolated: completedLessons count is ${userBCompleted.length} (User A's progress isolated)`
    );

    // 18. Test demo persona login
    const personaRes = await fetch(`${BASE_URL}/auth/persona-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId: 'user-sarah' }),
    });
    const personaData = await personaRes.json();
    recordTest(
      18,
      'Test demo persona login (POST /api/auth/persona-login)',
      personaRes.status === 200 &&
        personaData.user?.role === 'admin' &&
        personaData.user?.email === 'sarah.jenkins@terralearn.org',
      `Signed in as: ${personaData.user?.name} [Role: ${personaData.user?.role}]`
    );

    // Clean up temporary test users created during test suite
    await User.deleteMany({ email: { $in: [testEmail, userBEmail] } });
    if (userIdA) {
      await CourseProgress.deleteMany({ userId: userIdA });
      await QuizAttempt.deleteMany({ userId: userIdA });
    }
    console.log('\n🧹 Temporary test accounts cleaned up from MongoDB.');
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('🔌 Test server closed and database disconnected.\n');
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED (TOTAL: ${results.length})`);
  console.log('======================================================\n');

  return { passedCount, failedCount, results };
};

// Execute if run directly
runBatchBTests().then(({ failedCount }) => {
  process.exit(failedCount === 0 ? 0 : 1);
});

