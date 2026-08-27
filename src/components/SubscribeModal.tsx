'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { GlassFolderUploader } from './ui/GlassFolderUploader';
import { usePayment } from '../context/PaymentContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { PaymentSubmission } from '../types';
import { compressImage } from '../lib/imageCompressor';
import { validateFullName, validateEthiopianPhone } from '../lib/validation';
import {
  User,
  Smartphone,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: string;
  onSuccess: (submission: PaymentSubmission) => void;
}

export const SubscribeModal: React.FC<SubscribeModalProps> = ({
  isOpen,
  onClose,
  initialPlan,
  onSuccess,
}) => {
  const { submitPayment } = usePayment();
  const { error, info, success } = useToast();
  const { language } = useLanguage();
  const isAmharic = language === 'am';

  const getPlanIdFromStr = (str?: string): '1m' | '3m' | '6m' => {
    if (!str) {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('nazazi_selected_plan_id') || localStorage.getItem('nazazi_selected_plan_id');
        if (stored === '1m' || stored === '3m' || stored === '6m') {
          return stored;
        }
      }
      return '6m';
    }
    const lower = str.toLowerCase();
    if (lower.includes('1 month') || lower.includes('የ1 ወር') || lower === '1m' || lower.includes('200')) return '1m';
    if (lower.includes('3 month') || lower.includes('የ3 ወር') || lower === '3m' || lower.includes('600')) return '3m';
    if (lower.includes('6 month') || lower.includes('የ6 ወር') || lower === '6m' || lower.includes('1000') || lower.includes('1,000')) return '6m';
    return '6m';
  };

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [selectedPlanId, setSelectedPlanId] = useState<'1m' | '3m' | '6m'>(() => getPlanIdFromStr(initialPlan));

  const handleSelectPlan = (planId: '1m' | '3m' | '6m') => {
    setSelectedPlanId(planId);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('nazazi_selected_plan_id', planId);
        localStorage.setItem('nazazi_selected_plan_id', planId);
      } catch {}
    }
  };
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotTouched, setScreenshotTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Real-time validation
  const nameValidation = validateFullName(name, isAmharic);
  const phoneValidation = validateEthiopianPhone(phone, isAmharic);

  const nameError = nameTouched && !nameValidation.isValid ? nameValidation.error : undefined;
  const nameSuccess = nameTouched && nameValidation.isValid ? (isAmharic ? 'ትክክለኛ ስም' : 'Looks good') : undefined;

  const phoneError = phoneTouched && !phoneValidation.isValid ? phoneValidation.error : undefined;
  const phoneSuccess = phoneTouched && phoneValidation.isValid ? (isAmharic ? 'ትክክለኛ ስልክ ቁጥር' : 'Valid phone number') : undefined;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setDirection(1);
      setNameTouched(false);
      setPhoneTouched(false);
      setScreenshotTouched(false);
      if (initialPlan) {
        setSelectedPlanId(getPlanIdFromStr(initialPlan));
      }
    }
  }, [isOpen, initialPlan]);

  const copyToClipboard = (text: string, title: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    info(isAmharic ? 'ተቀድቷል' : `Copied ${title}`, text);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const planAmount = selectedPlanId === '6m' ? 1000 : selectedPlanId === '3m' ? 600 : 200;
  const selectedPlan = selectedPlanId === '6m'
    ? (isAmharic ? 'የ6 ወር አገልግሎት (1000 ብር)' : '6 Months Access (1,000 Birr)')
    : selectedPlanId === '3m'
    ? (isAmharic ? 'የ3 ወር አገልግሎት (600 ብር)' : '3 Months Access (600 Birr)')
    : (isAmharic ? 'የ1 ወር አገልግሎት (200 ብር)' : '1 Month Access (200 Birr)');

  const planLabel = selectedPlanId === '6m'
    ? (isAmharic ? 'የ6 ወር አገልግሎት' : '6 Months Access')
    : selectedPlanId === '1m'
      ? (isAmharic ? 'የ1 ወር አገልግሎት' : '1 Month Access')
      : (isAmharic ? 'የ3 ወር አገልግሎት' : '3 Months Access');

  const plans = [
    {
      id: '1m',
      name: isAmharic ? 'የ1 ወር' : '1 Month',
      price: '200',
      fullPlan: isAmharic ? 'የ1 ወር አገልግሎት (200 ብር)' : '1 Month Access (200 ETB)',
    },
    {
      id: '3m',
      name: isAmharic ? 'የ3 ወር' : '3 Months',
      price: '600',
      fullPlan: isAmharic ? 'የ3 ወር አገልግሎት (600 ብር)' : '3 Months Access (600 ETB)',
    },
    {
      id: '6m',
      name: isAmharic ? 'የ6 ወር' : '6 Months',
      price: '1,000',
      tag: isAmharic ? 'ተመራጭ' : 'Popular',
      fullPlan: isAmharic ? 'የ6 ወር አገልግሎት (1000 ብር)' : '6 Months Access (1000 ETB)',
    },
  ];

  const bankAccounts = [
    {
      key: 'cbe',
      name: isAmharic ? 'CBE (ንግድ ባንክ)' : 'Commercial Bank of Ethiopia (CBE)',
      shortName: 'CBE',
      accountNumber: '1000432169948',
      holder: 'Nazazi',
    },
    {
      key: 'telebirr',
      name: isAmharic ? 'Telebirr (ቴሌብር)' : 'Telebirr',
      shortName: 'Telebirr',
      accountNumber: '0953886865',
      holder: 'Nazazi',
    },
  ];

  const goToNextStep = () => {
    setDirection(1);
    setCurrentStep(2);
  };

  const goToPrevStep = () => {
    setDirection(-1);
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setNameTouched(true);
    setPhoneTouched(true);
    setScreenshotTouched(true);

    if (!nameValidation.isValid) {
      error(
        isAmharic ? 'እባክዎ ስምዎን በትክክል ያስገቡ' : 'Invalid Name',
        nameValidation.error
      );
      return;
    }

    if (!phoneValidation.isValid) {
      error(
        isAmharic ? 'እባክዎ የስልክ ቁጥር በትክክል ያስገቡ' : 'Invalid Phone Number',
        phoneValidation.error
      );
      return;
    }

    if (!screenshotDataUrl) {
      error(
        isAmharic ? 'የደረሰኝ ፎቶ ያስገቡ' : 'Receipt required',
        isAmharic ? 'እባክዎ የክፍያ ደረሰኝ ፎቶ (Screenshot) ያስገቡ' : 'Please upload your payment screenshot.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Prepare and compress the image before sending to avoid payload limits / slow uploads
      let imageToUpload: File | string = screenshotFile || screenshotDataUrl;
      try {
        const compressed = await compressImage(screenshotFile || screenshotDataUrl, 1400, 0.82);
        imageToUpload = compressed.file;
      } catch (compErr) {
        console.warn('Compression skipped, using original file:', compErr);
      }

      // 2. Prepare FormData to submit to server route (/api/register)
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone_number', phone.trim());
      formData.append('plan_name', selectedPlan);
      formData.append('amount', String(planAmount));

      if (imageToUpload instanceof File) {
        formData.append('payment_image', imageToUpload);
      } else {
        formData.append('payment_image', String(imageToUpload));
      }

      // 3. Call backend route with multi-channel plan hints (crucial for Instagram WebViews)
      const registerUrl = new URL('/api/register', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      registerUrl.searchParams.set('plan_name', selectedPlan);
      registerUrl.searchParams.set('amount', String(planAmount));
      registerUrl.searchParams.set('plan_id', selectedPlanId);

      const response = await fetch(registerUrl.toString(), {
        method: 'POST',
        headers: {
          'X-Plan-Name': encodeURIComponent(selectedPlan),
          'X-Plan-Amount': String(planAmount),
          'X-Plan-Id': selectedPlanId,
        },
        body: formData,
      });

      let result: Record<string, any> | null = null;
      try {
        const text = await response.text();
        if (text) {
          result = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn('Could not parse server response text as JSON:', parseErr);
      }

      if (!response.ok || (result && result.success === false)) {
        const errorMsg =
          result?.error ||
          (response.status === 413
            ? 'The image file is too large for upload. Please try a smaller receipt screenshot.'
            : `Server returned error (${response.status})`);
        throw new Error(errorMsg);
      }

      // 4. Update state directly using the server's registered record (one-way live path)
      const reg = result?.registration;
      const effectivePlanName =
        (reg?.amount && reg.amount > 200) || (planAmount > 200 && reg?.amount === 200)
          ? selectedPlan
          : (reg?.plan_name || selectedPlan);

      const effectiveAmount =
        planAmount > 200
          ? planAmount
          : (reg?.amount || planAmount);

      const newSub = await submitPayment({
        id: reg?.id,
        userName: reg?.name || name.trim(),
        userPhone: reg?.phone_number || phone.trim(),
        planName: effectivePlanName,
        amount: effectiveAmount,
        payerName: reg?.name || name.trim(),
        transactionId: reg?.id
          ? `TXN-${String(reg.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`
          : `TXN-${Date.now().toString().slice(-6)}`,
        screenshotUrl: reg?.payment_image_url || screenshotDataUrl,
      });

      success(
        isAmharic ? 'ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል!' : 'Registration Submitted!',
        isAmharic ? 'ስም፣ ስልክ ቁጥር እና ደረሰኝ ተመዝግቧል' : 'Your name, phone and payment receipt have been saved.'
      );

      setName('');
      setNameTouched(false);
      setPhone('');
      setPhoneTouched(false);
      setScreenshotDataUrl(null);
      setScreenshotFile(null);
      setScreenshotTouched(false);
      setCurrentStep(1);

      onClose();
      onSuccess(newSub);
    } catch (err: unknown) {
      console.error('Submission error:', err);
      const errMsg = err instanceof Error ? err.message : 'An error occurred during submission';
      error(isAmharic ? 'የምዝገባ ስህተት' : 'Submission Error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" description="" maxWidth="xl">
      <div className="text-zinc-900 dark:text-zinc-100 max-h-[85vh] overflow-y-auto px-1 sm:px-3 py-1">
        {/* Minimalist Top Step Indicator */}
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-zinc-100 dark:border-zinc-800 pr-9 sm:pr-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  currentStep === 1
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {currentStep === 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
              </span>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  currentStep === 1
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {isAmharic ? 'ክፍያ' : 'Payment'}
              </span>
            </div>

            <span className="text-zinc-300 dark:text-zinc-700 text-xs">/</span>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  currentStep === 2
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                2
              </span>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  currentStep === 2
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {isAmharic ? 'ምዝገባ' : 'Register'}
              </span>
            </div>
          </div>

          <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
            {planAmount} {isAmharic ? 'ብር' : 'ETB'}
          </span>
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 1 ? (
            /* ================= STEP 1: SELECT PLAN & BANK ACCOUNT ================= */
            <motion.div
              key="step1"
              custom={direction}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-1"
            >
              {/* Header */}
              <div>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                  {isAmharic ? 'የአገልግሎት እቅድ እና የክፍያ አማራጭ' : 'Select Plan & Transfer'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {isAmharic
                    ? 'የሚፈልጉትን እቅድ ይምረጡና ክፍያውን ከታች ወዳሉት አካውንቶች ያስተላልፉ'
                    : 'Choose your plan and transfer the amount to one of the accounts below'}
                </p>
              </div>

              {/* Plan Choice Pills */}
              <div className="grid grid-cols-3 gap-2">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPlan(p.id as '1m' | '3m' | '6m')}
                      className={`relative p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {p.tag && (
                        <span
                          className={`absolute -top-2 right-2 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                            isSelected
                              ? 'bg-white text-zinc-950 dark:bg-zinc-900 dark:text-white'
                              : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                          }`}
                        >
                          {p.tag}
                        </span>
                      )}
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-sm font-extrabold font-mono mt-0.5">
                        {p.price}{' '}
                        <span className="text-[10px] font-normal opacity-80">
                          {isAmharic ? 'ብር' : 'ETB'}
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Squared Simple Bank Account Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {isAmharic ? 'የክፍያ አካውንቶች (CBE እና Telebirr)' : 'Official Payment Accounts'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {bankAccounts.map((acc) => (
                    <div
                      key={acc.key}
                      className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-xs ${
                              acc.key === 'cbe' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {acc.name}
                          </p>
                        </div>
                        <p className="font-mono text-sm font-extrabold text-zinc-950 dark:text-white tracking-wider select-all">
                          {acc.accountNumber}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(acc.accountNumber, acc.name, acc.key)}
                        className="shrink-0 p-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer shadow-2xs"
                        title={isAmharic ? 'ቁጥር ቅዳ' : 'Copy Number'}
                      >
                        {copiedKey === acc.key ? (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="text-xs font-semibold px-4 cursor-pointer"
                >
                  {isAmharic ? 'ሰርዝ' : 'Cancel'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={goToNextStep}
                  className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-xs px-5 cursor-pointer"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  {isAmharic ? 'ቀጣይ' : 'Next'}
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ================= STEP 2: SUBSCRIBER INFO & CLEAN RECEIPT UPLOAD ================= */
            <motion.div
              key="step2"
              custom={direction}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pt-1"
            >
              {/* Heading with Selected Plan Tag */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                    {isAmharic ? 'የተመዝጋቢ መረጃ' : 'Registration Details'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {isAmharic
                      ? 'ስም፣ ስልክ ቁጥር እና ደረሰኝ በማስገባት ያጠናቅቁ'
                      : 'Provide full name, phone number, and payment image'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline underline-offset-2 cursor-pointer"
                >
                  {planLabel} ({planAmount} ETB)
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Input
                    label={isAmharic ? 'ሙሉ ስም' : 'Full Name'}
                    placeholder={isAmharic ? 'ስምዎን ያስገቡ' : 'Your full name'}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!nameTouched) setNameTouched(true);
                    }}
                    onBlur={() => setNameTouched(true)}
                    error={nameError}
                    success={nameSuccess}
                    leftIcon={<User className="w-3.5 h-3.5 text-zinc-400" />}
                    required
                  />

                  <Input
                    label={isAmharic ? 'የስልክ ቁጥር' : 'Phone Number'}
                    placeholder={isAmharic ? '0911234567 ወይም 07...' : '0911234567 or 07...'}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!phoneTouched) setPhoneTouched(true);
                    }}
                    onBlur={() => setPhoneTouched(true)}
                    error={phoneError}
                    success={phoneSuccess}
                    helperText={
                      !phoneError && !phoneSuccess
                        ? (isAmharic ? 'ምሳሌ፡ 0911234567 ወይም 0712345678' : 'e.g. 0911234567 or 0712345678')
                        : undefined
                    }
                    leftIcon={<Smartphone className="w-3.5 h-3.5 text-zinc-400" />}
                    required
                  />
                </div>

                {/* Clean Receipt Upload */}
                <GlassFolderUploader
                  label={isAmharic ? 'የክፍያ ደረሰኝ ምስል (እስከ 5MB)' : 'Payment Image (Max 5MB)'}
                  selectedImageUrl={screenshotDataUrl}
                  onFileSelect={(dataUrl, file) => {
                    setScreenshotDataUrl(dataUrl);
                    setScreenshotFile(file);
                  }}
                  onClear={() => {
                    setScreenshotDataUrl(null);
                    setScreenshotFile(null);
                  }}
                  error={
                    screenshotTouched && !screenshotDataUrl
                      ? (isAmharic ? 'እባክዎ የደረሰኝ ምስል ይጫኑ' : 'Please upload payment image')
                      : undefined
                  }
                />

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={goToPrevStep}
                    disabled={isSubmitting}
                    className="text-xs font-semibold px-4 cursor-pointer"
                    leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  >
                    {isAmharic ? 'ተመለስ' : 'Back'}
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isSubmitting}
                    className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 shadow-xs px-5 cursor-pointer"
                    rightIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    {isSubmitting
                      ? (isAmharic ? 'በመላክ ላይ...' : 'Submitting...')
                      : (isAmharic ? 'ይመዝገቡ' : 'Submit Registration')}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};
