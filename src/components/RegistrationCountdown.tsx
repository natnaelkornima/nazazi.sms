'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRegistrationDeadline } from '../hooks/useRegistrationDeadline';
import { useLanguage } from '../context/LanguageContext';
import { Clock, ShieldCheck, Lock, Smartphone, ArrowRight, Sparkles } from 'lucide-react';

interface RegistrationCountdownProps {
  onOpenVerifyModal?: () => void;
  className?: string;
  variant?: 'hero' | 'banner' | 'compact';
}

export const RegistrationCountdown: React.FC<RegistrationCountdownProps> = ({
  onOpenVerifyModal,
  className = '',
  variant = 'hero',
}) => {
  const { days, hours, minutes, seconds, isClosed, mounted } = useRegistrationDeadline();
  const { language } = useLanguage();
  const isAmharic = language === 'am';

  // Prevent layout hydration shift
  if (!mounted) {
    return (
      <div className={`w-full max-w-xl mx-auto p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 animate-pulse ${className}`}>
        <div className="h-14 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  // State A: Registration Closed View
  if (isClosed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full max-w-xl mx-auto p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-zinc-900 text-white border border-zinc-800 shadow-xl relative overflow-hidden ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                <span>{isAmharic ? 'ምዝገባው ተጠናቋል' : 'Registration Closed'}</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {isAmharic ? 'የአሁኑ ዙር ምዝገባ ተጠናቋል' : 'Cohort Registration Concluded'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                {isAmharic
                  ? 'የተመዘገቡ አባላት የአባልነት ሁኔታቸውን በስልክ ቁጥር ማረጋገጥ ይችላሉ።'
                  : 'Already registered? Check your approval status with your phone.'}
              </p>
            </div>
          </div>

          {onOpenVerifyModal && (
            <button
              type="button"
              onClick={onOpenVerifyModal}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-md cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isAmharic ? 'ሁኔታዎን ያረጋግጡ' : 'Check Approval'}</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // State B: Active Countdown View (Modern, Sleek, High-Tech Warm Palette)
  const timeUnits = [
    { label: isAmharic ? 'ቀናት' : 'Days', value: days },
    { label: isAmharic ? 'ሰዓታት' : 'Hours', value: hours },
    { label: isAmharic ? 'ደቂቃዎች' : 'Minutes', value: minutes },
    { label: isAmharic ? 'ሰከንዶች' : 'Seconds', value: seconds },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`w-full max-w-xl mx-auto p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/90 shadow-lg shadow-zinc-950/5 dark:shadow-black/30 transition-all ${className}`}
    >
      {/* Top Header info */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
            {isAmharic ? 'የምዝገባ ጊዜው ሊያበቃ ነው' : 'Registration Closing Soon'}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          <Clock className="w-3 h-3 text-amber-500" />
          <span>{isAmharic ? 'የ3 ቀናት ቀነ-ገደብ' : '3-Day Deadline'}</span>
        </div>
      </div>

      {/* Modern 4-Digit Grid */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {timeUnits.map((unit, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/70 dark:border-zinc-750/70 text-center relative overflow-hidden"
          >
            <AnimatePresence mode="popLayout">
              <motion.span
                key={unit.value}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-lg sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums leading-none"
              >
                {String(unit.value).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1">
              {unit.label}
            </span>
          </div>
        ))}
      </div>

      {/* Footer Subtext */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="truncate">
          {isAmharic ? 'ቀነ ገደቡ ካለፈ በኋላ አዲስ ምዝገባ አይቻልም' : 'No new registrations accepted once the timer hits zero.'}
        </span>
        <span className="shrink-0 font-medium text-amber-600 dark:text-amber-400">
          {isAmharic ? 'የተወሰነ ቦታ' : 'Limited spots'}
        </span>
      </div>
    </motion.div>
  );
};
