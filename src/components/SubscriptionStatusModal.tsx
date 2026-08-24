'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PaymentSubmission } from '../types';
import { usePayment } from '../context/PaymentContext';
import { useLanguage } from '../context/LanguageContext';
import { validateEthiopianPhone } from '../lib/validation';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Smartphone,
  Eye,
  Search,
  Loader2,
  Sparkles,
  RefreshCw,
  User,
  CreditCard,
  Calendar,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

interface SubscriptionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission?: PaymentSubmission | null;
  searchedPhone?: string;
  onResubmit?: () => void;
  isSuccessView?: boolean;
}

export const SubscriptionStatusModal: React.FC<SubscriptionStatusModalProps> = ({
  isOpen,
  onClose,
  submission: initialSubmission,
  searchedPhone: initialPhone = '',
  onResubmit,
}) => {
  const { checkStatusLive, getSubmissionByPhone } = usePayment();
  const { language } = useLanguage();
  const isAmharic = language === 'am';

  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const [phoneSearchError, setPhoneSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<PaymentSubmission | null>(
    initialSubmission || null
  );
  const [hasSearched, setHasSearched] = useState(Boolean(initialSubmission || initialPhone));
  const [isPreviewImageOpen, setIsPreviewImageOpen] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);

  // Store latest lookup helpers in ref to prevent stale closures and avoid useEffect re-triggering loops
  const checkStatusLiveRef = useRef(checkStatusLive);
  const getSubmissionByPhoneRef = useRef(getSubmissionByPhone);
  useEffect(() => {
    checkStatusLiveRef.current = checkStatusLive;
    getSubmissionByPhoneRef.current = getSubmissionByPhone;
  }, [checkStatusLive, getSubmissionByPhone]);

  // Perform live lookup with fallback and timeout resilience
  const performLookup = useCallback(
    async (phone: string) => {
      const trimmed = phone.trim();
      if (!trimmed) {
        setPhoneSearchError(isAmharic ? 'እባክዎ የስልክ ቁጥር ያስገቡ' : 'Please enter a phone number');
        return;
      }

      const validation = validateEthiopianPhone(trimmed, isAmharic);
      if (!validation.isValid) {
        setPhoneSearchError(validation.error);
        return;
      }

      setPhoneSearchError(null);
      setIsSearching(true);

      try {
        // 1. Optimistic fast lookup from context state
        const localMatch = getSubmissionByPhoneRef.current(trimmed);
        if (localMatch) {
          setActiveSubmission(localMatch);
          setIsManualSearchOpen(false);
        }

        // 2. Fetch fresh real-time status from server
        const result = await checkStatusLiveRef.current(trimmed);
        if (result) {
          setActiveSubmission(result);
          setIsManualSearchOpen(false);
        } else if (localMatch) {
          setActiveSubmission(localMatch);
          setIsManualSearchOpen(false);
        } else {
          // 3. Check localStorage directly as fallback
          let foundInStorage: PaymentSubmission | null = null;
          if (typeof window !== 'undefined') {
            try {
              const saved = localStorage.getItem('nazazi_payment_submissions');
              if (saved) {
                const list = JSON.parse(saved);
                if (Array.isArray(list)) {
                  foundInStorage =
                    list.find((s: PaymentSubmission) => {
                      const cleanA = s.userPhone?.replace(/\D/g, '') || '';
                      const cleanB = trimmed.replace(/\D/g, '') || '';
                      return (
                        cleanA === cleanB ||
                        (cleanA.length >= 8 && cleanB.length >= 8 && cleanA.slice(-8) === cleanB.slice(-8))
                      );
                    }) || null;
                }
              }
            } catch {
              // ignore
            }
          }

          if (foundInStorage) {
            setActiveSubmission(foundInStorage);
            setIsManualSearchOpen(false);
          } else {
            setActiveSubmission(null);
          }
        }
      } catch (lookupErr) {
        console.warn('Status lookup notice:', lookupErr);
        const fallback = getSubmissionByPhoneRef.current(trimmed) || null;
        setActiveSubmission(fallback);
        if (fallback) {
          setIsManualSearchOpen(false);
        }
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    },
    [isAmharic]
  );

  // Track previous open state to only reset modal when opening freshly
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSearching(false);
      prevIsOpenRef.current = false;
      return;
    }

    const isNewlyOpening = !prevIsOpenRef.current && isOpen;
    prevIsOpenRef.current = true;

    if (initialSubmission) {
      setActiveSubmission(initialSubmission);
      setHasSearched(true);
      setPhoneInput(initialSubmission.userPhone);
      setPhoneSearchError(null);
      setIsManualSearchOpen(false);
    } else if (initialPhone) {
      setPhoneInput(initialPhone);
      setPhoneSearchError(null);
      performLookup(initialPhone);
    } else if (isNewlyOpening) {
      // Opened with no initial data -> show search input
      setPhoneSearchError(null);
      setActiveSubmission(null);
      setHasSearched(false);
      setIsManualSearchOpen(true);
    }
  }, [isOpen, initialSubmission, initialPhone, performLookup]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(phoneInput);
  };

  const status = activeSubmission?.status || 'pending';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';

  // Helper to format clean plan display without duplicated currency text
  const getFormattedPlan = () => {
    if (!activeSubmission) return '';
    const raw = activeSubmission.planName || '';
    // Strip trailing parenthesis with price if present to prevent double '(200 Birr) (200 ETB)'
    const basePlan = raw.replace(/\s*\(\s*\d+[\s\S]*?\)/gi, '').trim();
    const cleanName = basePlan || raw;
    const currency = isAmharic ? 'ብር' : 'ETB';
    return `${cleanName} (${activeSubmission.amount} ${currency})`;
  };

  // Helper for formatted date
  const getFormattedDate = () => {
    if (!activeSubmission) return '';
    const dateVal = activeSubmission.submittedAt || activeSubmission.reviewedAt;
    if (dateVal) {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString();
      }
    }
    return new Date().toLocaleDateString();
  };

  const handleResubmitAction = () => {
    onClose();
    if (onResubmit) {
      onResubmit();
    } else {
      const pricingElem = document.getElementById('pricing');
      if (pricingElem) {
        pricingElem.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" description="" maxWidth="md">
        <div className="text-zinc-900 dark:text-zinc-100 max-h-[85vh] overflow-y-auto px-1 sm:px-2 pt-2 pb-2">
          <div className="space-y-4">
            {/* ========================================================================= */}
            {/* 1. MANUAL SEARCH VIEW (When user wants to enter or change phone number)   */}
            {/* ========================================================================= */}
            {isManualSearchOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pt-4"
              >
                <div className="flex items-center justify-between">
                  {activeSubmission ? (
                    <button
                      type="button"
                      onClick={() => setIsManualSearchOpen(false)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      {isAmharic ? 'ተመለስ' : 'Back to Status'}
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {isAmharic ? 'የሁኔታ ማረጋገጫ' : 'Status Verification'}
                  </span>
                </div>

                <div className="text-center space-y-1.5 pt-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-inner">
                    <Search className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {isAmharic ? 'የስልክ ቁጥርዎን ያስገቡ' : 'Verify Approval Status'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    {isAmharic
                      ? 'የተመዘገቡበትን የኢትዮጵያ ስልክ ቁጥር በማስገባት የጸደቀ፣ በመጠባበቅ ወይም ውድቅ የተደረገ መሆኑን ያረጋግጡ'
                      : 'Enter your phone number to check if your subscription is Approved, Pending, or Declined.'}
                  </p>
                </div>

                <form onSubmit={handleSearch} className="space-y-3 pt-2">
                  <div>
                    <Input
                      placeholder={isAmharic ? 'ምሳሌ፡ 0911234567' : 'e.g. 0911234567'}
                      value={phoneInput}
                      onChange={(e) => {
                        setPhoneInput(e.target.value);
                        if (phoneSearchError) setPhoneSearchError(null);
                      }}
                      leftIcon={<Smartphone className="w-4 h-4 text-zinc-400" />}
                      autoFocus
                    />
                    {phoneSearchError && (
                      <p className="text-[11px] text-red-500 mt-1.5 font-medium pl-1">
                        {phoneSearchError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSearching}
                    className="w-full font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 h-10 rounded-xl cursor-pointer shadow-xs"
                    leftIcon={
                      isSearching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )
                    }
                  >
                    {isSearching
                      ? isAmharic
                        ? 'በማረጋገጥ ላይ...'
                        : 'Checking Live Status...'
                      : isAmharic
                        ? 'ሁኔታ አረጋግጥ'
                        : 'Check Status'}
                  </Button>
                </form>
              </motion.div>
            ) : isSearching ? (
              /* ========================================================================= */
              /* 2. LOADING STATE                                                          */
              /* ========================================================================= */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-14 text-center space-y-4"
              >
                <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white"
                  />
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-500 dark:text-zinc-400" />
                </div>
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {isAmharic ? 'የአባልነት ሁኔታ እየተረጋገጠ ነው...' : 'Verifying approval status...'}
                </p>
              </motion.div>
            ) : hasSearched && !activeSubmission ? (
              /* ========================================================================= */
              /* 3. NOT FOUND STATE                                                        */
              /* ========================================================================= */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle className="w-7 h-7 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {isAmharic ? 'ምንም መረጃ አልተገኘም' : 'No Registration Found'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    {isAmharic
                      ? `ለ ${phoneInput || 'የተጠቀሰው ቁጥር'} የተላከ የክፍያ ማረጋገጫ አልተገኘም።`
                      : `No payment submission found for ${phoneInput || 'this number'}.`}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2 max-w-xs mx-auto">
                  <Button
                    size="sm"
                    onClick={handleResubmitAction}
                    className="w-full font-bold text-xs bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 h-10 rounded-xl cursor-pointer"
                  >
                    {isAmharic ? 'አዲስ ደረሰኝ ላክ' : 'Submit Receipt Now'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneSearchError(null);
                      setIsManualSearchOpen(true);
                    }}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 py-1.5 transition-colors cursor-pointer"
                  >
                    {isAmharic ? 'ሌላ ስልክ ቁጥር ፈልግ' : 'Search another phone number'}
                  </button>
                </div>
              </motion.div>
            ) : activeSubmission ? (
              /* ========================================================================= */
              /* 4. ACTIVE STATUS CARD (APPROVED / PENDING / DECLINED)                     */
              /* ========================================================================= */
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4 pt-2"
              >
                {/* HERO ANIMATION BADGE SECTION - SLEEK, MODERN & PROPERLY SPACED */}
                <div className="text-center pt-2 pb-1 space-y-3">
                  {/* GREEN ANIMATION FOR APPROVED & ACTIVE */}
                  {isApproved && (
                    <div className="relative h-24 flex items-center justify-center overflow-visible">
                      {/* Ambient soft glow backdrop */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.95, 1.08, 0.95] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                        className="absolute w-28 h-28 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 blur-xl pointer-events-none"
                      />

                      {/* Rotating subtle orbital particle / dashed ring */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                        className="absolute w-22 h-22 rounded-full border border-emerald-500/25 border-dashed pointer-events-none"
                      />

                      {/* Floating Micro-sparkle 1 */}
                      <motion.div
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 0], y: [-6, -18], scale: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2.2, delay: 0.2, ease: 'easeOut' }}
                        className="absolute -top-1 right-1/3 text-emerald-500 dark:text-emerald-300 pointer-events-none"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </motion.div>

                      {/* Floating Micro-sparkle 2 */}
                      <motion.div
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: [0, 0.9, 0], y: [-4, -14], scale: [0.5, 0.9, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2.5, delay: 1.1, ease: 'easeOut' }}
                        className="absolute bottom-1 left-1/3 text-teal-500 dark:text-teal-300 pointer-events-none"
                      >
                        <Sparkles className="w-3 h-3" />
                      </motion.div>

                      {/* Center Glossy Badge */}
                      <motion.div
                        initial={{ scale: 0, rotate: -25 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                        className="relative z-10 p-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-400/15 ring-4 ring-emerald-500/25 backdrop-blur-xs"
                      >
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35">
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15, duration: 0.25 }}
                          >
                            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* YELLOW/AMBER ANIMATION FOR PENDING / UNDER REVIEW */}
                  {isPending && (
                    <div className="relative h-24 flex items-center justify-center overflow-visible">
                      {/* Ambient warm golden glow */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: [0.4, 0.65, 0.4], scale: [0.95, 1.05, 0.95] }}
                        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                        className="absolute w-28 h-28 rounded-full bg-amber-500/20 dark:bg-amber-400/20 blur-xl pointer-events-none"
                      />

                      {/* Orbiting Satellite Particle & Track */}
                      <div className="absolute w-22 h-22 rounded-full border border-amber-500/25 dark:border-amber-400/25">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 4.5, ease: 'linear' }}
                          className="w-full h-full relative"
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400 shadow-sm shadow-amber-500" />
                        </motion.div>
                      </div>

                      {/* Concentric rotating counter-ring */}
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ repeat: Infinity, duration: 9, ease: 'linear' }}
                        className="absolute w-20 h-20 rounded-full border border-amber-500/15 border-dotted pointer-events-none"
                      />

                      {/* Center Golden Badge */}
                      <motion.div
                        initial={{ scale: 0, rotate: 20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                        className="relative z-10 p-1.5 rounded-full bg-amber-500/15 dark:bg-amber-400/15 ring-4 ring-amber-500/25 backdrop-blur-xs"
                      >
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/35">
                          <motion.div
                            animate={{ rotate: [0, 8, 0, -8, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                          >
                            <Clock className="w-7 h-7 stroke-[2.5]" />
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* RED ANIMATION FOR DECLINED / REJECTED */}
                  {isRejected && (
                    <div className="relative h-24 flex items-center justify-center overflow-visible">
                      {/* Ambient rose alert glow */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: [0.35, 0.6, 0.35], scale: [0.95, 1.06, 0.95] }}
                        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                        className="absolute w-28 h-28 rounded-full bg-rose-500/20 dark:bg-rose-400/20 blur-xl pointer-events-none"
                      />

                      {/* Concentric warning ripple rings (bounded) */}
                      <motion.div
                        initial={{ scale: 0.85, opacity: 0.4 }}
                        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.4, 0.1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        className="absolute w-22 h-22 rounded-full border border-rose-500/30 pointer-events-none"
                      />

                      {/* Center Coral Red Badge */}
                      <motion.div
                        initial={{ scale: 0, rotate: 15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                        className="relative z-10 p-1.5 rounded-full bg-rose-500/15 dark:bg-rose-400/15 ring-4 ring-rose-500/25 backdrop-blur-xs"
                      >
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/35">
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.15, duration: 0.25 }}
                          >
                            <XCircle className="w-8 h-8 stroke-[2.5]" />
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* STATUS TITLE & SUBHEADING */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                      {isApproved && (
                        <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-sm sm:text-base flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                          {isAmharic ? 'ተረጋግጧል (የነቃ)' : 'Approved & Active'}
                        </span>
                      )}
                      {isPending && (
                        <span className="text-amber-700 dark:text-amber-400 font-extrabold text-sm sm:text-base flex items-center gap-1.5 bg-amber-500/10 dark:bg-amber-400/10 px-3 py-1 rounded-full border border-amber-500/20">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                          </span>
                          {isAmharic ? 'በግምገማ ላይ (Pending)' : 'Under Review (Pending)'}
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-rose-700 dark:text-rose-400 font-extrabold text-sm sm:text-base flex items-center gap-1.5 bg-rose-500/10 dark:bg-rose-400/10 px-3 py-1 rounded-full border border-rose-500/20">
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          {isAmharic ? 'ውድቅ ተደርጓል (Declined)' : 'Verification Declined'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      {isApproved
                        ? isAmharic
                          ? 'እንኳን ደስ አለዎት! ምዝገባዎ ጸድቋል፤ የዕለቱ መንፈሳዊ የSMS መልዕክቶች ወደ ስልክዎ ይላካሉ።'
                          : 'Congratulations! Your subscription is active. Spiritual SMS messages will be delivered to your phone.'
                        : isPending
                          ? isAmharic
                            ? 'ደረሰኝዎ በአድሚን እየተገመገመ ነው። እንደተረጋገጠ አገልግሎቱ ወዲያው ይጀምራል።'
                            : 'Our admins are verifying your receipt. Service will activate automatically once approved.'
                          : isAmharic
                            ? 'የላኩት ደረሰኝ አልተረጋገጠም። እባክዎ ትክክለኛውን የክፍያ ደረሰኝ በድጋሚ ይላኩ።'
                            : 'We could not verify the submitted receipt. Please resubmit with a clear payment screenshot.'}
                    </p>
                  </div>
                </div>

                {/* =================== CLEAR CONCISE INFO CARD =================== */}
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-2.5 shadow-2xs">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Phone */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        <Smartphone className="w-3 h-3" />
                        <span>{isAmharic ? 'ስልክ' : 'Phone'}</span>
                      </div>
                      <p className="font-mono font-bold text-zinc-900 dark:text-white text-xs truncate">
                        {activeSubmission.userPhone}
                      </p>
                    </div>

                    {/* Plan */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        <CreditCard className="w-3 h-3" />
                        <span>{isAmharic ? 'እቅድ' : 'Plan'}</span>
                      </div>
                      <p className="font-bold text-zinc-900 dark:text-white text-xs truncate">
                        {getFormattedPlan()}
                      </p>
                    </div>

                    {/* Subscriber */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        <User className="w-3 h-3" />
                        <span>{isAmharic ? 'ስም' : 'Name'}</span>
                      </div>
                      <p className="font-semibold text-zinc-900 dark:text-white text-xs truncate">
                        {activeSubmission.userName}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        <span>{isAmharic ? 'ቀን' : 'Date'}</span>
                      </div>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300 text-xs truncate">
                        {getFormattedDate()}
                      </p>
                    </div>
                  </div>

                  {/* Screenshot Preview Button if exists */}
                  {activeSubmission.screenshotUrl && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setIsPreviewImageOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          {isAmharic ? 'የተላከውን የክፍያ ደረሰኝ እይ' : 'View Uploaded Receipt'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* =================== ACTIONS =================== */}
                <div className="space-y-2 pt-1">
                  {isRejected ? (
                    <Button
                      size="md"
                      onClick={handleResubmitAction}
                      className="w-full font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white h-10 rounded-xl shadow-xs cursor-pointer"
                    >
                      {isAmharic ? 'አዲስ ደረሰኝ ላክ (Resubmit)' : 'Resubmit Payment Receipt'}
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      onClick={onClose}
                      className="w-full font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 h-10 rounded-xl shadow-xs cursor-pointer"
                    >
                      {isAmharic ? 'እሺ (ተጠናቋል)' : 'Done'}
                    </Button>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    {/* Refresh button */}
                    <button
                      type="button"
                      disabled={isSearching}
                      onClick={() => performLookup(activeSubmission.userPhone || phoneInput)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`} />
                      {isAmharic ? 'ሁኔታ አድስ' : 'Refresh'}
                    </button>

                    {/* Search another phone */}
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneInput('');
                        setPhoneSearchError(null);
                        setIsManualSearchOpen(true);
                      }}
                      className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {isAmharic ? 'ሌላ ስልክ ቁጥር ፈልግ' : 'Check another number'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </Modal>

      {/* High-Res Image Preview Modal */}
      {activeSubmission && (
        <Modal
          isOpen={isPreviewImageOpen}
          onClose={() => setIsPreviewImageOpen(false)}
          title={isAmharic ? 'የክፍያ ደረሰኝ ፎቶ' : 'Payment Screenshot'}
          description={`${activeSubmission.userName} • ${activeSubmission.userPhone}`}
          maxWidth="xl"
        >
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black flex items-center justify-center max-h-[65vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeSubmission.screenshotUrl}
                alt="Payment Receipt"
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsPreviewImageOpen(false)}
                className="cursor-pointer font-bold text-xs"
              >
                {isAmharic ? 'ዝጋ' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};


