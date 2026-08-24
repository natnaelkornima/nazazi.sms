'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavigationTab } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Settings,
  Globe,
  Smartphone,
  Sun,
  Moon,
  X,
  ChevronRight,
} from 'lucide-react';

interface NavbarProps {
  activeTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  onOpenVerifyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onNavigate,
  onOpenVerifyModal,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const isAmharic = language === 'am';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVerifyClick = () => {
    setIsSettingsOpen(false);
    if (onOpenVerifyModal) {
      onOpenVerifyModal();
    } else {
      onNavigate('landing');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 font-black text-lg">
              <span>N</span>
            </div>
            <div className="flex flex-col">
              <span className={`font-black tracking-tight text-lg text-zinc-900 dark:text-zinc-50 leading-none ${isAmharic ? 'font-nazazi' : ''}`}>
                {t('header.title')}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium pt-0.5">
                {isAmharic ? 'የመንፈሳዊ SMS አገልግሎት' : 'Spiritual SMS Platform'}
              </span>
            </div>
          </button>
        </div>

        {/* Settings Icon & Popout Menu Trigger */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Settings & Preferences"
            className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              isSettingsOpen
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-md ring-2 ring-zinc-900/10'
                : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {isSettingsOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Settings className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            )}
            <span className="text-xs font-bold hidden sm:inline-block">
              {isAmharic ? 'ማስተካከያዎች' : 'Settings'}
            </span>
          </button>

          {/* Settings Popout Animated Dropdown Menu */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute right-0 mt-3 w-72 sm:w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-3 z-50 space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800/60"
              >
                {/* Popout Header */}
                <div className="pb-2.5 px-2 flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  <span>{isAmharic ? 'አማራጮች እና ማስተካከያዎች' : 'Control Menu'}</span>
                  <Settings className="w-3.5 h-3.5" />
                </div>

                <div className="pt-2 space-y-1">
                  {/* 1. Language Switcher */}
                  <button
                    onClick={toggleLanguage}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-sm border border-zinc-200 dark:border-zinc-700">
                        <Globe className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {isAmharic ? 'ቋንቋ ቀይር' : 'Change Language'}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {language === 'en' ? '🇪🇹 አማርኛ' : '🇺🇸 English'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* 2. Verify Status */}
                  <button
                    onClick={handleVerifyClick}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center font-bold text-xs shadow-xs">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {isAmharic ? 'የአባልነት ማረጋገጫ' : 'Verify Approval Status'}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {isAmharic ? 'በስልክ ቁጥር ማረጋገጫ' : 'Check receipt approval'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* 3. Theme Changer */}
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-xs border border-zinc-200 dark:border-zinc-700">
                        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {isAmharic ? 'ገጽታ ቀይር (Theme)' : 'Theme Mode'}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
