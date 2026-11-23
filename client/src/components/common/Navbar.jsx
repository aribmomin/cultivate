import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sprout,
  Menu,
  X,
  ArrowRight,
  BookOpen,
  Layers,
  Trophy,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  User,
  Shield
} from 'lucide-react';
import { Button } from './Button';
import { useTheme } from '../../context/useTheme';
import { useAuth } from '../../context/useAuth';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle ESC key to close menus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { label: 'Courses', to: '/courses', icon: BookOpen },
    { label: 'Simulator', to: '/simulator', icon: Layers },
    { label: 'The 5 Crops', targetHash: '#crops', icon: Sprout },
    { label: 'How It Works', targetHash: '#how-it-works', icon: Sparkles },
    { label: 'Leaderboard', to: '/leaderboard', icon: Trophy },
  ];

  const handleNavClick = (e, targetHash) => {
    setMobileMenuOpen(false);
    e.preventDefault();
    if (location.pathname === '/') {
      const target = document.querySelector(targetHash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/' + targetHash);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-[#E5EAE5] shadow-2xs py-3'
          : 'bg-[#FBFBF9] border-b border-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 text-[#0E2A1E] font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-xl tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] rounded-lg p-1"
            aria-label="Cultivate Home"
          >
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white shadow-xs">
              <Sprout className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="leading-none text-lg text-[#0E2A1E]">Cultivate</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">Organic Academy</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
            {navLinks.map((item) => (
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="px-3.5 py-2 text-sm font-semibold text-gray-700 hover:text-[#0E2A1E] hover:bg-[#143D2B]/5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={`/${item.targetHash}`}
                  onClick={(e) => handleNavClick(e, item.targetHash)}
                  className="px-3.5 py-2 text-sm font-semibold text-gray-700 hover:text-[#0E2A1E] hover:bg-[#143D2B]/5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
                >
                  {item.label}
                </a>
              )
            ))}
          </nav>

          {/* Desktop Actions & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-xl text-gray-700 hover:text-[#0E2A1E] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Auth State in Desktop Nav */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#10B981] bg-white dark:bg-[#15261D] transition-colors cursor-pointer text-xs"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#10B981] text-white font-bold flex items-center justify-center text-[10px]">
                    {user.avatar || 'TL'}
                  </div>
                  <span className="font-bold text-[#0E2A1E] dark:text-white max-w-[100px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-sm uppercase">
                    {user.role}
                  </span>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#12231A] border border-[#D5DDD5] dark:border-[#1E382B] shadow-xl p-2 z-50 text-xs"
                    >
                      <div className="p-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                        <div className="font-bold text-[#0E2A1E] dark:text-white truncate">{user.name}</div>
                        <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
                        <div className="text-[10px] text-emerald-600 font-medium truncate mt-0.5">{user.institution}</div>
                      </div>

                      <Link
                        to="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-[#F0FDF4] dark:hover:bg-[#15261D]"
                      >
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>Account Profile</span>
                      </Link>

                      <Link
                        to="/leaderboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-[#F0FDF4] dark:hover:bg-[#15261D]"
                      >
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>My Standing & XP</span>
                      </Link>

                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 p-2 rounded-xl text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                        >
                          <Shield className="w-4 h-4 text-purple-600" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await logout();
                            setUserDropdownOpen(false);
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
            )}

            <Link to="/simulator">
              <Button variant="primary" size="sm" icon={ArrowRight} iconPosition="right">
                Launch Simulator
              </Button>
            </Link>
          </div>

          {/* Mobile Right Controls: Theme Toggle & Hamburger */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-xl text-gray-700 hover:text-[#0E2A1E] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-gray-700 hover:text-[#0E2A1E] hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] cursor-pointer"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Framer Motion) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden bg-white border-b border-[#E5EAE5] px-4 pt-3 pb-6 shadow-lg"
          >
            <div className="flex flex-col gap-1.5 pt-2">
              {/* Authenticated user profile strip in mobile menu */}
              {isAuthenticated && user && (
                <div className="p-3 mb-2 bg-[#F0FDF4] dark:bg-[#14261D] rounded-2xl border border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#10B981] text-white font-bold flex items-center justify-center text-xs">
                      {user.avatar || 'TL'}
                    </div>
                    <div>
                      <div className="font-bold text-[#0E2A1E] dark:text-white text-xs">{user.name}</div>
                      <div className="text-[10px] text-gray-500">{user.roleLabel}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      setMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {navLinks.map((item) => {
                const IconComponent = item.icon;
                return item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-[#F0FDF4] hover:text-[#0E2A1E] transition-colors"
                  >
                    <IconComponent className="w-4 h-4 text-[#10B981]" />
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={`/${item.targetHash}`}
                    onClick={(e) => handleNavClick(e, item.targetHash)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-[#F0FDF4] hover:text-[#0E2A1E] transition-colors"
                  >
                    <IconComponent className="w-4 h-4 text-[#10B981]" />
                    {item.label}
                  </a>
                );
              })}

              <div className="border-t border-gray-100 my-2 pt-3 flex flex-col gap-2.5">
                {!isAuthenticated && (
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="md" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                )}
                <Link to="/simulator" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full" icon={ArrowRight} iconPosition="right">
                    Launch Simulator
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
