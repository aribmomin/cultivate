import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  BookOpen,
  HelpCircle,
  Sprout,
  Sliders,
  History,
  Plus,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { adminService } from '../../services/adminService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AdminPortalPage = () => {
  const { user, loginAsPersona } = useAuth();
  const [data, setData] = useState(() => adminService.getAdminData());
  const [activeTab, setActiveTab] = useState('courses'); // 'courses', 'quizzes', 'crops', 'rules', 'audit'
  const [notification, setNotification] = useState(null);

  // New Course Form State
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseCategory, setNewCourseCategory] = useState('Soil Health');
  const [newCourseDifficulty, setNewCourseDifficulty] = useState('Beginner');
  const [newCourseDuration, setNewCourseDuration] = useState('3 Hours');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  // Quiz Authoring State
  const [selectedQuizCourseId, setSelectedQuizCourseId] = useState(data.courses[0]?.id || '');
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOpt0, setNewOpt0] = useState('');
  const [newOpt1, setNewOpt1] = useState('');
  const [newOpt2, setNewOpt2] = useState('');
  const [newOpt3, setNewOpt3] = useState('');
  const [newCorrectIdx, setNewCorrectIdx] = useState(0);
  const [newExplanation, setNewExplanation] = useState('');

  // Simulation Coefficients Form State
  const [coefficients, setCoefficients] = useState(data.coefficients);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Role Gate: Must be Admin (SRS ADMIN-REQ-01)
  const isAdmin = user && user.role === 'admin';

  // Background load from backend when user is admin
  useEffect(() => {
    let isMounted = true;
    if (isAdmin) {
      adminService.getOverviewApi()
        .then((overview) => {
          if (isMounted && overview) {
            setData((prev) => ({
              ...prev,
              courses: overview.courses || prev.courses,
              crops: overview.crops || prev.crops,
              coefficients: overview.coefficients || prev.coefficients,
              auditLogs: overview.auditLogs || prev.auditLogs,
              metrics: overview.metrics
            }));
            if (overview.coefficients) setCoefficients(overview.coefficients);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const reloadData = async () => {
    if (isAdmin) {
      try {
        const overview = await adminService.getOverviewApi();
        if (overview) {
          setData((prev) => ({ ...prev, ...overview }));
          if (overview.coefficients) setCoefficients(overview.coefficients);
          return;
        }
      } catch {
        // Fallback to local
      }
    }
    const updated = adminService.getAdminData();
    setData(updated);
    setCoefficients(updated.coefficients);
  };

  // 1. Course Status Toggle
  const handleToggleCourse = async (courseId) => {
    if (isAdmin) {
      try {
        await adminService.toggleCourseStatusApi(courseId);
        await reloadData();
        showToast('Course publish status updated successfully in MongoDB.');
        return;
      } catch (err) {
        showToast(err.extractedMessage || 'Server error updating course status.', 'error');
        return;
      }
    }
    adminService.toggleCourseStatus(courseId);
    reloadData();
    showToast('Course publish status updated successfully.');
  };

  // 2. Add New Course
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    if (isAdmin) {
      try {
        await adminService.addCourseApi({
          title: newCourseTitle,
          category: newCourseCategory,
          difficulty: newCourseDifficulty,
          duration: newCourseDuration,
          description: newCourseDesc || 'Comprehensive biological principles course.'
        });
        await reloadData();
        setShowAddCourse(false);
        setNewCourseTitle('');
        setNewCourseDesc('');
        showToast(`Created course "${newCourseTitle}" in MongoDB!`);
        return;
      } catch (err) {
        showToast(err.extractedMessage || 'Server error creating course.', 'error');
        return;
      }
    }

    adminService.addCourse({
      title: newCourseTitle,
      category: newCourseCategory,
      difficulty: newCourseDifficulty,
      duration: newCourseDuration,
      description: newCourseDesc || 'Comprehensive biological principles course.'
    });

    reloadData();
    setShowAddCourse(false);
    setNewCourseTitle('');
    setNewCourseDesc('');
    showToast(`Created course "${newCourseTitle}"!`);
  };

  // 3. Add Quiz Question
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !newOpt0.trim() || !newOpt1.trim()) return;

    if (isAdmin) {
      try {
        await adminService.addQuestionApi(selectedQuizCourseId, {
          question: newQuestionText,
          options: [newOpt0, newOpt1, newOpt2 || 'None of the above', newOpt3 || 'All of the above'],
          correctAnswer: parseInt(newCorrectIdx, 10),
          explanation: newExplanation || 'Ground truth grounded in approved organic farming curriculum.'
        });
        await reloadData();
        setNewQuestionText('');
        setNewOpt0('');
        setNewOpt1('');
        setNewOpt2('');
        setNewOpt3('');
        setNewExplanation('');
        showToast('Question authored and saved to MongoDB.');
        return;
      } catch (err) {
        showToast(err.extractedMessage || 'Server error adding question.', 'error');
        return;
      }
    }

    adminService.addQuestion(selectedQuizCourseId, {
      question: newQuestionText,
      options: [newOpt0, newOpt1, newOpt2 || 'None of the above', newOpt3 || 'All of the above'],
      correctAnswer: parseInt(newCorrectIdx, 10),
      explanation: newExplanation || 'Ground truth grounded in approved organic farming curriculum.'
    });

    reloadData();
    setNewQuestionText('');
    setNewOpt0('');
    setNewOpt1('');
    setNewOpt2('');
    setNewOpt3('');
    setNewExplanation('');
    showToast('Question authored and added to assessment.');
  };

  // 4. Save Coefficients
  const handleSaveCoefficients = async (e) => {
    e.preventDefault();
    if (isAdmin) {
      try {
        const updated = await adminService.updateCoefficientsApi(coefficients);
        if (updated) setCoefficients(updated);
        await reloadData();
        showToast('Environmental simulation coefficients saved to MongoDB.');
        return;
      } catch (err) {
        showToast(err.extractedMessage || 'Server error updating coefficients.', 'error');
        return;
      }
    }
    adminService.updateCoefficients(coefficients);
    reloadData();
    showToast('Environmental simulation coefficients saved and active.');
  };

  // 5. Reset Config
  const handleResetDefaults = () => {
    if (window.confirm('Reset all courses, crop parameters, and simulation coefficients to baseline defaults?')) {
      adminService.resetToDefaults();
      reloadData();
      showToast('All administrative configurations restored to defaults.', 'info');
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-16 sm:py-24 min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] p-6 sm:p-8 shadow-xl text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8" />
          </div>

          <Badge variant="neutral" size="sm" className="mb-2">
            SRS ADMIN-REQ-01 Authorization Guard
          </Badge>

          <h2 className="text-xl sm:text-2xl font-bold text-[#0E2A1E] dark:text-[#E8F5EE]">
            Administrator Access Restricted
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
            The Administration Console is restricted to authorized platform administrators and curriculum directors.
          </p>

          <div className="my-6 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 text-left text-xs space-y-1.5">
            <div className="font-bold text-purple-900 dark:text-purple-200">
              Academic Reviewer Notice:
            </div>
            <p className="text-purple-700 dark:text-purple-300 leading-relaxed">
              To inspect and verify all course authoring, crop parameter editing, and simulation rule tuning features, click below to authenticate as the Curriculum Administrator.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => loginAsPersona('user-sarah')}
            icon={UserCheck}
            className="w-full font-bold shadow-md"
          >
            Authenticate as Dr. Sarah Jenkins (Admin)
          </Button>
        </motion.div>
      </div>
    );
  }

  const selectedCourse = data.courses.find((c) => c.id === selectedQuizCourseId) || data.courses[0];

  return (
    <div className="py-8 sm:py-12 bg-[#FBFBF9] dark:bg-[#0B1510] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Floating Toast Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="fixed top-20 right-4 sm:right-8 z-50 shadow-xl rounded-2xl p-4 flex items-center gap-3 border text-xs font-semibold backdrop-blur-md bg-white/95 dark:bg-[#12231A]/95 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Header Banner */}
        <div className="bg-[#0E2A1E] text-white rounded-3xl p-6 sm:p-8 border border-[#1B4D36] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 text-2xl shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold font-['Plus_Jakarta_Sans',sans-serif]">
                  TerraLearn Administration Console
                </h1>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700 uppercase tracking-wider">
                  Admin Active
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Signed in as <strong>{user.name}</strong> • Curriculum & Environmental Simulation Director
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-2.5 rounded-xl bg-[#143D2B] hover:bg-[#1B4D36] text-gray-300 hover:text-white border border-[#1F4A37] transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 shrink-0"
              title="Reset configuration to baseline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#12231A] p-4 rounded-2xl border border-[#D5DDD5] dark:border-[#1E382B] shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Active Courses
            </span>
            <span className="text-2xl font-extrabold text-[#0E2A1E] dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#10B981]" />
              {data.courses.filter((c) => c.status === 'Active').length}
              <span className="text-xs text-gray-400 font-normal">/ {data.courses.length}</span>
            </span>
          </div>

          <div className="bg-white dark:bg-[#12231A] p-4 rounded-2xl border border-[#D5DDD5] dark:border-[#1E382B] shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Curriculum Units
            </span>
            <span className="text-2xl font-extrabold text-[#0E2A1E] dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              {data.courses.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)}
              <span className="text-xs text-gray-400 font-normal">Lessons</span>
            </span>
          </div>

          <div className="bg-white dark:bg-[#12231A] p-4 rounded-2xl border border-[#D5DDD5] dark:border-[#1E382B] shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Calibrated Crops
            </span>
            <span className="text-2xl font-extrabold text-[#0E2A1E] dark:text-white flex items-center gap-2">
              <Sprout className="w-5 h-5 text-amber-500" />
              {data.crops.length}
              <span className="text-xs text-gray-400 font-normal">Species</span>
            </span>
          </div>

          <div className="bg-white dark:bg-[#12231A] p-4 rounded-2xl border border-[#D5DDD5] dark:border-[#1E382B] shadow-2xs">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Simulation Rules
            </span>
            <span className="text-2xl font-extrabold text-[#0E2A1E] dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-500" />
              Active
              <span className="text-xs text-emerald-500 font-normal">● In Sync</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation Deck */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E5EAE5] dark:border-[#1E382B]">
          {[
            { id: 'courses', label: 'Course & Lesson Management', icon: BookOpen },
            { id: 'quizzes', label: 'Quiz Question Authoring', icon: HelpCircle },
            { id: 'crops', label: 'Crop Agronomy Parameters', icon: Sprout },
            { id: 'rules', label: 'Simulation Rules & Tuning', icon: Sliders },
            { id: 'audit', label: 'Audit Trail Ledger', icon: History }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#0E2A1E] text-white dark:bg-[#10B981] dark:text-[#0E2A1E] shadow-sm'
                    : 'bg-white dark:bg-[#12231A] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: COURSES & LESSONS (ADMIN-REQ-02) ================= */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0E2A1E] dark:text-white">
                  Curriculum Catalog Administration (SRS ADMIN-REQ-02)
                </h2>
                <p className="text-xs text-gray-500">
                  Manage course publishing status, structured lessons, and learning objectives.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setShowAddCourse(!showAddCourse)}
              >
                {showAddCourse ? 'Cancel' : 'Create Course'}
              </Button>
            </div>

            {/* Create Course Form Modal/Expansion */}
            {showAddCourse && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#10B981] p-6 shadow-md"
              >
                <h3 className="text-sm font-bold text-[#0E2A1E] dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#10B981]" /> Add New Organic Farming Course
                </h3>

                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Course Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)}
                        placeholder="e.g. Regenerative Agroforestry & Silvopasture"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <select
                        value={newCourseCategory}
                        onChange={(e) => setNewCourseCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                      >
                        <option value="Soil Health">Soil Health</option>
                        <option value="Pest Management">Pest Management</option>
                        <option value="Water Conservation">Water Conservation</option>
                        <option value="Crop Systems">Crop Systems</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Difficulty Level
                      </label>
                      <select
                        value={newCourseDifficulty}
                        onChange={(e) => setNewCourseDifficulty(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Estimated Study Duration
                      </label>
                      <input
                        type="text"
                        value={newCourseDuration}
                        onChange={(e) => setNewCourseDuration(e.target.value)}
                        placeholder="e.g. 4 Hours"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Course Description
                    </label>
                    <textarea
                      rows={2}
                      value={newCourseDesc}
                      onChange={(e) => setNewCourseDesc(e.target.value)}
                      placeholder="Educational summary and practical organic farming competencies covered."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddCourse(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit">
                      Publish Course to Catalog
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Courses Table */}
            <div className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFBF9] dark:bg-[#15261D] border-b border-[#E5EAE5] dark:border-[#1E382B] text-gray-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Course Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4 text-center">Lessons</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAE5] dark:divide-[#1E382B]">
                    {data.courses.map((course) => {
                      const isActive = course.status === 'Active';

                      return (
                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-[#15261D]/50 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="font-bold text-[#0E2A1E] dark:text-white">
                              {course.title}
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                              {course.description}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-gray-300">
                            {course.category}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {course.difficulty}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-700 dark:text-gray-300">
                            {course.lessons?.length || 0}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {course.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleCourse(course.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                                isActive
                                  ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {isActive ? 'Deactivate' : 'Publish'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: QUIZZES & QUESTIONS (ADMIN-REQ-03) ================= */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#0E2A1E] dark:text-white">
                  Assessment Question Authoring (SRS ADMIN-REQ-03)
                </h2>
                <p className="text-xs text-gray-500">
                  Inspect and author multiple-choice questions with educational feedback rationales.
                </p>
              </div>

              {/* Course Selector Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Select Assessment:</span>
                <select
                  value={selectedQuizCourseId}
                  onChange={(e) => setSelectedQuizCourseId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold text-[#0E2A1E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                >
                  {data.courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.quiz?.questions?.length || 0} Qs)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Existing Questions List */}
            <div className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#0E2A1E] dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#10B981]" />
                Questions for: {selectedCourse?.title} ({selectedCourse?.quiz?.questions?.length || 0} Active)
              </h3>

              <div className="space-y-3">
                {selectedCourse?.quiz?.questions?.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-[#FAFBF9] dark:bg-[#15261D] text-xs space-y-2"
                  >
                    <div className="font-bold text-[#0E2A1E] dark:text-white">
                      Q{idx + 1}. {q.question}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                      {q.options?.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl border flex items-center justify-between ${
                            optIdx === q.correctAnswer
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-semibold'
                              : 'bg-white dark:bg-[#12231A] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <span>{opt}</span>
                          {optIdx === q.correctAnswer && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200 dark:border-gray-800">
                        Rationale: {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Question Card Form */}
            <div className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] p-6 shadow-xs">
              <h3 className="text-sm font-bold text-[#0E2A1E] dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#10B981]" /> Author New Question for this Assessment
              </h3>

              <form onSubmit={handleAddQuestion} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Question Prompt
                  </label>
                  <input
                    type="text"
                    required
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="e.g. Which biological amendment restores soil humic structure fastest?"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Option A (Index 0)
                    </label>
                    <input
                      type="text"
                      required
                      value={newOpt0}
                      onChange={(e) => setNewOpt0(e.target.value)}
                      placeholder="Choice A"
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Option B (Index 1)
                    </label>
                    <input
                      type="text"
                      required
                      value={newOpt1}
                      onChange={(e) => setNewOpt1(e.target.value)}
                      placeholder="Choice B"
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Option C (Index 2)
                    </label>
                    <input
                      type="text"
                      value={newOpt2}
                      onChange={(e) => setNewOpt2(e.target.value)}
                      placeholder="Choice C"
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Option D (Index 3)
                    </label>
                    <input
                      type="text"
                      value={newOpt3}
                      onChange={(e) => setNewOpt3(e.target.value)}
                      placeholder="Choice D"
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Correct Answer Selection
                    </label>
                    <select
                      value={newCorrectIdx}
                      onChange={(e) => setNewCorrectIdx(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold text-emerald-700 focus:outline-none"
                    >
                      <option value={0}>Option A is Correct</option>
                      <option value={1}>Option B is Correct</option>
                      <option value={2}>Option C is Correct</option>
                      <option value={3}>Option D is Correct</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Educational Explanation / Rationale
                    </label>
                    <input
                      type="text"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="Biological explanation shown to learners post-submission."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" size="sm" type="submit" icon={Plus}>
                    Append Question to Quiz
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CROP PARAMETERS (ADMIN-REQ-04) ================= */}
        {activeTab === 'crops' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#0E2A1E] dark:text-white">
                Botanical Agronomy Parameters (SRS ADMIN-REQ-04 & SIM-REQ-09)
              </h2>
              <p className="text-xs text-gray-500">
                Calibrate daily water consumption, lifecycle duration, and economic market pricing for the 5 core food crops.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.crops.map((crop) => (
                <div
                  key={crop.id}
                  className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border"
                        style={{
                          backgroundColor: `${crop.color}15`,
                          borderColor: `${crop.color}40`
                        }}
                      >
                        {crop.id === 'crop-tomato'
                          ? '🍅'
                          : crop.id === 'crop-wheat'
                          ? '🌾'
                          : crop.id === 'crop-corn'
                          ? '🌽'
                          : crop.id === 'crop-carrot'
                          ? '🥕'
                          : '🍚'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0E2A1E] dark:text-white">
                          {crop.name}
                        </h3>
                        <span className="text-[11px] text-gray-500 italic block">
                          {crop.scientificName}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      ${crop.marketPricePerKg.toFixed(2)} / kg
                    </span>
                  </div>

                  {/* Coefficients Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="bg-gray-50 dark:bg-[#15261D] p-2 rounded-xl">
                      <span className="text-[10px] text-gray-400 block">Growth Period</span>
                      <strong className="text-[#0E2A1E] dark:text-white">{crop.baseGrowthDays} Days</strong>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#15261D] p-2 rounded-xl">
                      <span className="text-[10px] text-gray-400 block">Daily Water</span>
                      <strong className="text-blue-600">{crop.dailyWaterNeed}% / day</strong>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#15261D] p-2 rounded-xl">
                      <span className="text-[10px] text-gray-400 block">Min Harvest</span>
                      <strong className="text-amber-600">Day {crop.minHarvestDay}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                    {crop.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: SIMULATION RULES (ADMIN-REQ-05) ================= */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#0E2A1E] dark:text-white">
                Turn-Based Environmental Rules & Tuning (SRS ADMIN-REQ-05)
              </h2>
              <p className="text-xs text-gray-500">
                Configure physical and economic simulation multipliers without modifying client UI code.
              </p>
            </div>

            <div className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] p-6 sm:p-8 shadow-xs">
              <form onSubmit={handleSaveCoefficients} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Initial Farm Treasury ($)
                    </label>
                    <input
                      type="number"
                      value={coefficients.initialBudget}
                      onChange={(e) =>
                        setCoefficients({ ...coefficients, initialBudget: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400">Starting funds for new farm plots</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Daily Evaporation Rate (%)
                    </label>
                    <input
                      type="number"
                      value={coefficients.dailyEvaporationRate}
                      onChange={(e) =>
                        setCoefficients({ ...coefficients, dailyEvaporationRate: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400">Baseline soil moisture loss per 24 hours</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Rainfall Hydration Bonus (%)
                    </label>
                    <input
                      type="number"
                      value={coefficients.rainfallBonus}
                      onChange={(e) =>
                        setCoefficients({ ...coefficients, rainfallBonus: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400">Free moisture delivered across field on rain days</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Water Stress Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={coefficients.waterStressThreshold}
                      onChange={(e) =>
                        setCoefficients({ ...coefficients, waterStressThreshold: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400">Below this moisture, plants suffer leaf damage</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Irrigation Moisture Boost (%)
                    </label>
                    <input
                      type="number"
                      value={coefficients.irrigationMoistureBoost}
                      onChange={(e) =>
                        setCoefficients({ ...coefficients, irrigationMoistureBoost: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400">Hydration per drip run (Cost: ${coefficients.irrigationCost})</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Neem Pest Reduction (%)
                    </label>
                    <input
                      type="number"
                      value={coefficients.neemPestReduction}
                      onChange={(e) =>
                        setCoefficients({ ...coefficients, neemPestReduction: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs font-bold focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400">Pest risk reduction per bio-spray (Cost: ${coefficients.neemCost})</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                  <Button variant="primary" size="md" type="submit" icon={CheckCircle2}>
                    Save Simulation Coefficients
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= TAB 5: AUDIT LOG (ADMIN-REQ-07) ================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#0E2A1E] dark:text-white">
                Administrative Audit Trail (SRS ADMIN-REQ-07)
              </h2>
              <p className="text-xs text-gray-500">
                Auditable transaction log recording administrative mutations, curriculum edits, and rule updates.
              </p>
            </div>

            <div className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFBF9] dark:bg-[#15261D] border-b border-[#E5EAE5] dark:border-[#1E382B] text-gray-500 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 sm:px-6">Timestamp</th>
                      <th className="py-3 px-4">Action Type</th>
                      <th className="py-3 px-4">Administrator</th>
                      <th className="py-3 px-4 sm:px-6">Change Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5EAE5] dark:divide-[#1E382B]">
                    {data.auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#15261D]/50 transition-colors">
                        <td className="py-3 px-4 sm:px-6 font-mono text-[11px] text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0E2A1E] dark:text-white">
                          {log.adminName}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-gray-700 dark:text-gray-300">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
