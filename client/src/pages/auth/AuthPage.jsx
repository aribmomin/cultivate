import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  User,
  Building,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sprout
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { DEMO_PERSONAS } from '../../services/authService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AuthPage = ({ initialMode = 'login' }) => {
  const { user, isAuthenticated, login, loginAsPersona, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(
    location.pathname === '/register' ? 'register' : initialMode
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState('learner');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Validation / Feedback states
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle Login submission
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = login(email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.reason);
      return;
    }

    setSuccessMsg(`Welcome back, ${res.user.name}!`);
    setTimeout(() => {
      navigate('/courses');
    }, 1000);
  };

  // Handle Register submission
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setLoading(true);
    const res = register({
      name,
      email,
      password,
      role,
      institution
    });
    setLoading(false);

    if (!res.success) {
      setError(res.reason);
      return;
    }

    setSuccessMsg(`Account created successfully! Welcome to TerraLearn, ${res.user.name}.`);
    setTimeout(() => {
      navigate('/courses');
    }, 1200);
  };

  // Handle 1-Click Persona Login
  const handlePersonaLogin = (personaId) => {
    setError(null);
    const res = loginAsPersona(personaId);
    if (res.success) {
      setSuccessMsg(`Signed in as ${res.user.name} (${res.user.roleLabel})`);
      setTimeout(() => {
        navigate(res.user.role === 'admin' ? '/admin' : '/courses');
      }, 800);
    }
  };

  // If user is already authenticated, show active session profile card
  if (isAuthenticated && user) {
    return (
      <div className="py-12 sm:py-20 min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] p-6 sm:p-8 shadow-xl text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-[#10B981] to-[#059669] text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-md mb-4">
            {user.avatar || 'TL'}
          </div>

          <Badge variant="emerald" size="md" className="mb-2">
            {user.roleLabel || 'Active Scholar'}
          </Badge>

          <h2 className="text-xl sm:text-2xl font-bold text-[#0E2A1E] dark:text-[#E8F5EE]">
            {user.name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            {user.institution}
          </p>

          <div className="my-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-left text-xs space-y-2 text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span>Account Role:</span>
              <span className="font-bold uppercase text-[#0E2A1E] dark:text-white">{user.role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Session Status:</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
              </span>
            </div>
            {user.loggedInAt && (
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Last Login:</span>
                <span>{new Date(user.loggedInAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Link to="/courses">
              <Button variant="primary" size="md" className="w-full font-bold">
                Continue to Course Catalog ➔
              </Button>
            </Link>
            <Link to="/simulator">
              <Button variant="outline" size="md" className="w-full">
                Open 2D Farm Simulator
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Sign Out of Session
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-12 sm:py-20 min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Sprout className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0E2A1E] dark:text-[#E8F5EE] font-['Plus_Jakarta_Sans',sans-serif]">
            {mode === 'login' ? 'Sign In to TerraLearn' : 'Create Learner Account'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {mode === 'login'
              ? 'Access your biological courses, virtual farm plots, and verified XP.'
              : 'Join the organic farming learning community and track your agroecology milestones.'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex items-center bg-[#F4F6F3] dark:bg-[#14261D] p-1 rounded-2xl border border-[#E5EAE5] dark:border-[#1E382B]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-[#12231A] text-[#0E2A1E] dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-[#12231A] text-[#0E2A1E] dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Main Form Card */}
        <div className="bg-white dark:bg-[#12231A] rounded-3xl border border-[#D5DDD5] dark:border-[#1E382B] p-6 sm:p-8 shadow-xl">
          
          {/* Notification Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Content */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Academic or Personal Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="learner@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-[#10B981] focus:ring-[#10B981]"
                  />
                  <span>Remember session</span>
                </label>
                <span className="text-gray-400 cursor-not-allowed">
                  Forgot password?
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                className="w-full font-bold shadow-md py-2.5"
                icon={ArrowRight}
                iconPosition="right"
              >
                {loading ? 'Authenticating...' : 'Sign In to Account'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jordan Smith"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Academic Institution or Organic Farm
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. UC Davis or Green Valley Farm"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Primary Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'learner', label: 'Student' },
                    { id: 'instructor', label: 'Educator' },
                    { id: 'admin', label: 'Researcher' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        role === r.id
                          ? 'bg-[#ECFDF5] dark:bg-[#1B4D36] border-[#10B981] text-[#065F46] dark:text-emerald-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@agro.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Confirm
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15261D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={loading}
                className="w-full font-bold shadow-md py-2.5 mt-2"
                icon={CheckCircle2}
                iconPosition="right"
              >
                {loading ? 'Creating...' : 'Register Account'}
              </Button>
            </form>
          )}

          {/* Quick Academic Demo Personas (SRS AUTH-REQ-01 & 06) */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2 text-center">
              ⚡ 1-Click Academic Demo Login
            </span>

            <div className="flex flex-col gap-1.5">
              {DEMO_PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => handlePersonaLogin(persona.id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#10B981] hover:bg-[#F0FDF4] dark:hover:bg-[#1B4D36]/40 transition-colors text-left cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#065F46] font-bold text-[10px] flex items-center justify-center">
                      {persona.avatar}
                    </div>
                    <div>
                      <span className="font-bold text-[#0E2A1E] dark:text-white">
                        {persona.name}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        {persona.institution}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {persona.roleLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security & Disclaimer Note */}
        <p className="text-[11px] text-center text-gray-500 max-w-xs mx-auto">
          🔒 Phase 1 Client Authentication. Sessions persist in local storage. Production passwords will be hashed with bcrypt in Phase 2 per SRS AUTH-REQ-02.
        </p>

      </div>
    </div>
  );
};
