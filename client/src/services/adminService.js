import { MOCK_COURSES } from '../data/mockCourses';
import { MOCK_CROPS } from '../data/mockCrops';
import { apiClient } from './apiClient';

const ADMIN_STORAGE_KEY = 'terralearn_admin_config_v1';

export const DEFAULT_SIMULATION_COEFFICIENTS = {
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
  yieldPlotMultiplier: 0.28
};

const getStoredAdminData = () => {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }

  return {
    courses: JSON.parse(JSON.stringify(MOCK_COURSES)),
    crops: JSON.parse(JSON.stringify(MOCK_CROPS)),
    coefficients: { ...DEFAULT_SIMULATION_COEFFICIENTS },
    auditLogs: [
      {
        id: 'audit-init-1',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        adminName: 'Dr. Sarah Jenkins',
        action: 'COURSE_PUBLISH',
        details: 'Published initial 4 core organic farming curriculum courses.'
      },
      {
        id: 'audit-init-2',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        adminName: 'Dr. Sarah Jenkins',
        action: 'CROP_CALIBRATION',
        details: 'Calibrated base growth days and daily water needs for 5 core crops (SRS SIM-REQ-09).'
      },
      {
        id: 'audit-init-3',
        timestamp: new Date().toISOString(),
        adminName: 'Dr. Sarah Jenkins',
        action: 'RULE_CONFIG',
        details: 'Verified turn-based evaporation and irrigation coefficients.'
      }
    ]
  };
};

const saveStoredAdminData = (data) => {
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

export const adminService = {
  // Get all data
  getAdminData() {
    return getStoredAdminData();
  },

  // Toggle course status (Active / Inactive)
  toggleCourseStatus(courseId) {
    const data = getStoredAdminData();
    data.courses = data.courses.map((c) => {
      if (c.id === courseId) {
        const nextStatus = c.status === 'Active' ? 'Draft' : 'Active';
        data.auditLogs.unshift({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          adminName: 'Dr. Sarah Jenkins',
          action: 'COURSE_STATUS_CHANGE',
          details: `Updated status of "${c.title}" to ${nextStatus}.`
        });
        return { ...c, status: nextStatus };
      }
      return c;
    });
    saveStoredAdminData(data);
    return data.courses;
  },

  // Add a new course
  addCourse({ title, category, difficulty, duration, description, objectives }) {
    const data = getStoredAdminData();
    const newCourse = {
      id: `course-${Date.now()}`,
      title,
      category: category || 'Soil Health',
      difficulty: difficulty || 'Beginner',
      duration: duration || '3 Hours',
      status: 'Active',
      description,
      objectives: objectives || ['Understand key biological principles', 'Apply non-toxic methods in practice'],
      lessons: [
        {
          id: `lesson-${Date.now()}-1`,
          title: `Foundations of ${title}`,
          duration: '15 min read',
          sections: [
            {
              subtitle: 'Introduction',
              content: `Overview of ${title} and foundational regenerative practices.`
            }
          ]
        }
      ],
      quiz: {
        title: `${title} Assessment`,
        questions: [
          {
            id: 'q1',
            question: `What is the primary benefit of ${title}?`,
            options: [
              'Enhancing long-term ecological balance',
              'Applying synthetic chemical fertilizers',
              'Eliminating beneficial insect populations',
              'Monoculture depletion'
            ],
            correctAnswer: 0,
            explanation: 'Organic farming focuses on biological soil preservation and biodiversity.'
          }
        ]
      }
    };

    data.courses.unshift(newCourse);
    data.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: 'Dr. Sarah Jenkins',
      action: 'COURSE_CREATED',
      details: `Created new course "${title}" (${category}).`
    });

    saveStoredAdminData(data);
    return newCourse;
  },

  // Update crop parameters
  updateCrop(cropId, updatedParams) {
    const data = getStoredAdminData();
    data.crops = data.crops.map((c) => {
      if (c.id === cropId) {
        data.auditLogs.unshift({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          adminName: 'Dr. Sarah Jenkins',
          action: 'CROP_PARAMS_UPDATE',
          details: `Updated agronomy coefficients for ${c.name}.`
        });
        return { ...c, ...updatedParams };
      }
      return c;
    });
    saveStoredAdminData(data);
    return data.crops;
  },

  // Update simulation coefficients
  updateCoefficients(newCoefficients) {
    const data = getStoredAdminData();
    data.coefficients = { ...data.coefficients, ...newCoefficients };
    data.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName: 'Dr. Sarah Jenkins',
      action: 'COEFFICIENTS_UPDATE',
      details: 'Updated global environmental simulation coefficients.'
    });
    saveStoredAdminData(data);
    return data.coefficients;
  },

  // Add question to quiz
  addQuestion(courseId, { question, options, correctAnswer, explanation }) {
    const data = getStoredAdminData();
    data.courses = data.courses.map((c) => {
      if (c.id === courseId) {
        if (!c.quiz) {
          c.quiz = { title: `${c.title} Assessment`, questions: [] };
        }
        c.quiz.questions.push({
          id: `q-${Date.now()}`,
          question,
          options,
          correctAnswer,
          explanation
        });
        data.auditLogs.unshift({
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          adminName: 'Dr. Sarah Jenkins',
          action: 'QUIZ_QUESTION_ADDED',
          details: `Added new question to ${c.title} assessment.`
        });
      }
      return c;
    });
    saveStoredAdminData(data);
    return data.courses;
  },

  // Reset to baseline defaults
  resetToDefaults() {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {
      // ignore
    }
    return getStoredAdminData();
  },

  // --- Backend API Integrations (MongoDB Single Source of Truth) ---
  async getOverviewApi() {
    const res = await apiClient.get('/admin/overview');
    return res.data;
  },

  async toggleCourseStatusApi(courseId) {
    const res = await apiClient.patch(`/admin/courses/${courseId}/status`);
    return res.data;
  },

  async addCourseApi(courseData) {
    const res = await apiClient.post('/admin/courses', courseData);
    return res.data;
  },

  async addQuestionApi(courseId, questionData) {
    const res = await apiClient.post(`/admin/courses/${courseId}/quiz/questions`, questionData);
    return res.data;
  },

  async updateCropApi(cropId, updatedParams) {
    const res = await apiClient.put(`/admin/crops/${cropId}`, updatedParams);
    return res.data;
  },

  async getSimulationCoefficientsApi() {
    const res = await apiClient.get('/admin/simulation-coefficients');
    return res.data?.coefficients;
  },

  async updateCoefficientsApi(newCoefficients) {
    const res = await apiClient.put('/admin/simulation-coefficients', newCoefficients);
    return res.data?.coefficients;
  },

  async getAuditLogsApi(limit = 50) {
    const res = await apiClient.get(`/admin/audit-logs?limit=${limit}`);
    return res.data?.auditLogs || [];
  }
};
