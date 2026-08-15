'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  Check,
  Loader2,
  Sparkles,
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
  const [hasSearched, setHasSearched] = useState(false);
  const [isPreviewImageOpen, setIsPreviewImageOpen] = useState(false);
  const [showSuccessView, setShowSuccessView] = useState<boolean>(Boolean(initialSubmission));

  // Perform live lookup
  const performLookup = useCallback(async (phone: string) => {
    const trimmed = phone.trim();
    if (!trimmed) return;

    const validation = validateEthiopianPhone(trimmed, isAmharic);
    if (!validation.isValid) {
      setPhoneSearchError(validation.error);
      return;
    }
    setPhoneSearchError(null);
    setIsSearching(true);

    try {
      const result = await checkStatusLive(trimmed);
      setActiveSubmission(result || null);
    } catch {
      setActiveSubmission(getSubmissionByPhone(trimmed) || null);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
      setShowSuccessView(false);
    }
  }, [checkStatusLive, getSubmissionByPhone, isAmharic]);

  useEffect(() => {
    if (initialSubmission) {
      setActiveSubmission(initialSubmission);
      setShowSuccessView(true);
      setHasSearched(true);
      setPhoneInput(initialSubmission.userPhone);
      setPhoneSearchError(null);
    } else if (initialPhone) {
      setPhoneInput(initialPhone);
      setPhoneSearchError(null);
      performLookup(initialPhone);
    } else {
      setActiveSubmission(null);
      setShowSuccessView(false);
      setHasSearched(false);
      setPhoneSearchError(null);
    }
  }, [initialSubmission, initialPhone, isOpen, performLookup]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(phoneInput);
  };

  const isPending = activeSubmission?.status === 'pending';
  const isApproved = activeSubmission?.status === 'approved';
  const isRejected = activeSubmission?.status === 'rejected';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" description="" maxWidth="md">
        <div className="text-zinc-900 dark:text-zinc-100 max-h-[85vh] overflow-y-auto px-1 sm:px-2">
          {/* ========================================================================= */}
          {/* 1. SLEEK, MINIMALIST CONFIRMATION (After User Submits)                    */}
          {/* ========================================================================= */}
          {showSuccessView && activeSubmission ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 pt-2 pb-2 text-center"
            >
              {/* Minimalist Icon & Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {isAmharic ? 'ክፍያዎ ደርሶናል' : 'Payment Received'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    {isAmharic
                      ? 'የላኩት ደረሰኝ ለአድሚን ደርሷል። እንደተረጋገጠ ዕለታዊ መንፈሳዊ መልእክቶች መድረስ ይጀምራሉ።'
                      : 'Your receipt is being verified. Daily spiritual SMS reflections will begin shortly.'}
                  </p>
                </div>
              </div>

              {/* Clean Digital Receipt Card */}
              <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 text-left space-y-3.5 shadow-2xs">
                {/* Plan Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200/70 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                      {isAmharic ? 'የአገልግሎት እቅድ' : 'Selected Plan'}
                    </span>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      {activeSubmission.planName}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold font-mono text-zinc-900 dark:text-white">
                    {activeSubmission.amount} {isAmharic ? 'ብር' : 'ETB'}
                  </span>
                </div>

                {/* Key-Value Details */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      {isAmharic ? 'ሙሉ ስም' : 'Subscriber'}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]">
                      {activeSubmission.userName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      {isAmharic ? 'የስልክ ቁጥር' : 'SMS Phone'}
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                      {activeSubmission.userPhone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      {isAmharic ? 'ሁኔታ' : 'Status'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {isAmharic ? 'በግምገማ ላይ' : 'Under Review'}
                    </span>
                  </div>

                  {activeSubmission.screenshotUrl && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        {isAmharic ? 'ደረሰኝ' : 'Receipt'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPreviewImageOpen(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-black dark:hover:text-white bg-zinc-200/70 dark:bg-zinc-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isAmharic ? 'ደረሰኙን እይ' : 'View Image'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="space-y-3 pt-1">
                <Button
                  size="md"
                  onClick={onClose}
                  className="w-full font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 h-10 rounded-xl shadow-xs cursor-pointer"
                >
                  {isAmharic ? 'ተጠናቋል' : 'Done'}
                </Button>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowSuccessView(false)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {isAmharic ? 'ሁኔታውን በስልክ ቁጥር ፈትሽ' : 'Check status with phone number'}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ========================================================================= */
            /* 2. LOOKUP / VERIFY SEARCH VIEW (When checking by phone number)           */
            /* ========================================================================= */
            <div className="space-y-5 pt-1 pb-2">
              {/* Header */}
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight">
                  {isAmharic ? 'የአባልነት ሁኔታ ማረጋገጫ' : 'Subscription Status'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                  {isAmharic
                    ? 'የላኩትን የክፍያ ደረሰኝ ሁኔታ በስልክ ቁጥርዎ ያረጋግጡ'
                    : 'Check your payment verification status with your phone number'}
                </p>
              </div>

              {/* Phone Search Form */}
              <form onSubmit={handleSearch} className="space-y-2.5">
                <div>
                  <Input
                    placeholder={isAmharic ? 'ስልክ ቁጥር (ምሳሌ፡ 0911234567 ወይም +251911234567)' : 'Phone number (e.g. 0911234567 or +251911234567)'}
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      if (phoneSearchError) setPhoneSearchError(null);
                    }}
                    leftIcon={<Smartphone className="w-4 h-4 text-zinc-400" />}
                  />
                  {phoneSearchError && (
                    <p className="text-[11px] text-red-500 mt-1 font-medium pl-1">
                      {phoneSearchError}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSearching}
                  className="w-full font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 h-9 rounded-xl cursor-pointer"
                  leftIcon={isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                >
                  {isSearching
                    ? isAmharic ? 'በማረጋገጥ ላይ...' : 'Checking Live Status...'
                    : isAmharic ? 'ሁኔታ አረጋግጥ' : 'Check Status'}
                </Button>
              </form>

              {/* Search Results Display */}
              <AnimatePresence mode="wait">
                {isSearching ? (
                  <motion.div
                    key="searching-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 text-center space-y-2"
                  >
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                    <p className="text-xs text-zinc-500">
                      {isAmharic ? 'ከዳታቤዝ ጋር እየተረጋገጠ ነው...' : 'Verifying registration status...'}
                    </p>
                  </motion.div>
                ) : hasSearched ? (
                  <motion.div
                    key={activeSubmission ? `${activeSubmission.id}-${activeSubmission.status}` : 'no-result'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    {!activeSubmission ? (
                      <div className="py-6 text-center space-y-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                        <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {isAmharic ? 'ምንም የክፍያ ማረጋገጫ አልተገኘም' : 'No Submission Found'}
                        </p>
                        <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                          {isAmharic
                            ? `ለ ${phoneInput} የተመዘገበ ክፍያ አልተገኘም።`
                            : `No payment submission found for ${phoneInput}.`}
                        </p>
                        {onResubmit && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onResubmit();
                              }}
                              className="text-xs font-bold text-zinc-900 dark:text-white underline underline-offset-2 cursor-pointer"
                            >
                              {isAmharic ? 'አዲስ ደረሰኝ ላክ' : 'Submit Receipt Now'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 text-xs">
                        {/* Status Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200/70 dark:border-zinc-800">
                          <span className="font-bold text-zinc-900 dark:text-white text-sm">
                            {activeSubmission.userName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-lg text-xs ${
                              isApproved
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : isRejected
                                  ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />}
                            {isRejected && <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 stroke-[2.5]" />}
                            {isPending && <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 stroke-[2.5]" />}
                            {isApproved
                              ? isAmharic ? 'ተረጋግጧል (የነቃ)' : 'Approved & Active'
                              : isRejected
                                ? isAmharic ? 'ውድቅ ተደርጓል' : 'Rejected'
                                : isAmharic ? 'በግምገማ ላይ (Pending)' : 'Under Review (Pending)'}
                          </span>
                        </div>

                        {/* Approved Banner if Approved */}
                        {isApproved && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs">
                            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                            <p className="leading-tight">
                              {isAmharic
                                ? 'እንኳን ደስ አለዎት! ምዝገባዎ በአድሚን ጸድቋል፤ የዕለቱ የSMS መልዕክቶች ወደ ስልክዎ ይላካሉ።'
                                : 'Congratulations! Your subscription is approved and active. Daily spiritual reflections are enabled for your phone.'}
                            </p>
                          </div>
                        )}

                        <div className="space-y-2 text-zinc-600 dark:text-zinc-400 text-xs pt-1">
                          <div className="flex justify-between items-center">
                            <span>{isAmharic ? 'እቅድ' : 'Plan'}:</span>
                            <span className="font-bold text-zinc-900 dark:text-white">{activeSubmission.planName}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>{isAmharic ? 'ክፍያ' : 'Amount'}:</span>
                            <span className="font-extrabold font-mono text-zinc-900 dark:text-white">{activeSubmission.amount} {isAmharic ? 'ብር' : 'ETB'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>{isAmharic ? 'የስልክ ቁጥር' : 'Phone'}:</span>
                            <span className="font-mono font-bold text-zinc-900 dark:text-white">{activeSubmission.userPhone}</span>
                          </div>
                          {activeSubmission.reviewedAt && (
                            <div className="flex justify-between items-center text-[11px] text-zinc-400">
                              <span>{isAmharic ? 'የተረጋገጠበት ቀን' : 'Reviewed Date'}:</span>
                              <span>{new Date(activeSubmission.reviewedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {activeSubmission.screenshotUrl && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setIsPreviewImageOpen(true)}
                              className="w-full text-center py-2 rounded-xl bg-zinc-200/60 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 transition-colors cursor-pointer"
                            >
                              {isAmharic ? 'የተላከውን ደረሰኝ እይ' : 'View Uploaded Screenshot'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Close Button */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onClose}
                  className="w-full text-xs font-semibold h-9 rounded-xl cursor-pointer"
                >
                  {isAmharic ? 'ዝጋ' : 'Close'}
                </Button>
              </div>
            </div>
          )}
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
              <Button size="sm" variant="secondary" onClick={() => setIsPreviewImageOpen(false)} className="cursor-pointer">
                {isAmharic ? 'ዝጋ' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
