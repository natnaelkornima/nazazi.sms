'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Smartphone,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';
import { validateFullName, validateEthiopianPhone } from '@/lib/validation';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface SubmittedRegistration {
  id: string;
  name: string;
  phone_number: string;
  payment_image_url: string;
  created_at: string;
}

export default function RegisterPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State (name, phone_number, plan, and payment image)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('6m');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Interaction State
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [fileTouched, setFileTouched] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<SubmittedRegistration | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Validation logic
  const validateName = (val: string) => {
    const res = validateFullName(val);
    return res.isValid ? null : res.error;
  };

  const validatePhone = (val: string) => {
    const res = validateEthiopianPhone(val);
    return res.isValid ? null : res.error;
  };

  const validateFile = (file: File | null) => {
    if (!file) return 'Payment image is required.';
    const isImageMime = file.type ? file.type.startsWith('image/') : true;
    const isImageExt = /\.(jpg|jpeg|png|webp|heic|jfif)$/i.test(file.name || '');
    if (!isImageMime && !isImageExt) {
      return 'Only JPG, JPEG, PNG, and WEBP formats are supported.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size exceeds ${MAX_FILE_SIZE_MB} MB limit.`;
    }
    return null;
  };

  const nameError = nameTouched ? validateName(name) : null;
  const phoneError = phoneTouched ? validatePhone(phone) : null;
  const fileError = fileTouched ? validateFile(selectedFile) : null;

  const handleFileSelect = (file: File) => {
    setFileTouched(true);
    setServerError(null);

    const errorMsg = validateFile(file);
    if (errorMsg) {
      setSelectedFile(null);
      setImagePreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    setPhoneTouched(true);
    setFileTouched(true);
    setServerError(null);

    const currentNameError = validateName(name);
    const currentPhoneError = validatePhone(phone);
    const currentFileError = validateFile(selectedFile);

    if (currentNameError || currentPhoneError || currentFileError || !selectedFile) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(20);

    let progressTimer: NodeJS.Timeout | null = null;

    try {
      progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            return 85;
          }
          return prev + 15;
        });
      }, 150);

      // Compress image client side
      let fileToUpload: File = selectedFile;
      try {
        const compressed = await compressImage(selectedFile, 1400, 0.82);
        fileToUpload = compressed.file;
      } catch (compErr) {
        console.warn('Image compression fallback:', compErr);
      }

      const planNameStr =
        selectedPlan === '6m'
          ? '6 Months Access (1,000 Birr)'
          : selectedPlan === '3m'
          ? '3 Months Access (600 Birr)'
          : '1 Month Access (200 Birr)';

      const planAmountNum = selectedPlan === '6m' ? 1000 : selectedPlan === '3m' ? 600 : 200;

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone_number', phone.trim());
      formData.append('plan_name', planNameStr);
      formData.append('amount', String(planAmountNum));
      formData.append('payment_image', fileToUpload);

      const response = await fetch('/api/register', {
        method: 'POST',
        body: formData,
      });

      if (progressTimer) clearInterval(progressTimer);
      setUploadProgress(100);

      let result: Record<string, any> | null = null;
      try {
        const text = await response.text();
        if (text) {
          result = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn('Could not parse server response text:', parseErr);
      }

      if (!response.ok || (result && result.success === false)) {
        const errorMsg =
          result?.error ||
          (response.status === 413
            ? 'The image file is too large for upload. Please try a smaller receipt screenshot.'
            : `Server returned error (${response.status})`);
        throw new Error(errorMsg);
      }

      setSubmittedData(result?.registration);
      setIsSuccess(true);
    } catch (err: unknown) {
      if (progressTimer) clearInterval(progressTimer);
      console.error('Registration failed:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setPhone('');
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setNameTouched(false);
    setPhoneTouched(false);
    setFileTouched(false);
    setServerError(null);
    setIsSuccess(false);
    setSubmittedData(null);
    setUploadProgress(0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-zinc-800">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-black text-sm tracking-tighter">
              N
            </div>
            <span className="font-bold text-base tracking-tight text-white group-hover:text-zinc-300 transition-colors">
              Nazazi
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              /* ================= Registration Form ================= */
              <motion.div
                key="register-form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 space-y-6"
              >
                {/* Form Header */}
                <div className="space-y-1.5 text-center">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-zinc-800 border border-zinc-700/80 text-white mb-2">
                    <ShieldCheck className="w-5 h-5 text-zinc-200" />
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white">
                    Registration & Payment
                  </h1>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Provide your name, phone number, and payment image to complete your registration.
                  </p>
                </div>

                {/* Server Error Alert */}
                {serverError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">{serverError}</p>
                    </div>
                  </motion.div>
                )}

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Field 1: Full Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="full-name"
                      className="block text-xs font-bold text-zinc-300 uppercase tracking-wider"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="full-name"
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder="e.g. Natnael Kornima"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (!nameTouched) setNameTouched(true);
                        }}
                        onBlur={() => setNameTouched(true)}
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-4 py-2.5 bg-zinc-950 border text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-hidden transition-all ${
                          nameError
                            ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500/20'
                            : nameTouched && !nameError
                              ? 'border-emerald-600/70 focus:border-emerald-500'
                              : 'border-zinc-800 focus:border-zinc-500'
                        }`}
                      />
                    </div>
                    {nameError && (
                      <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {nameError}
                      </p>
                    )}
                  </div>

                  {/* Field 2: Phone Number */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="phone-number"
                      className="block text-xs font-bold text-zinc-300 uppercase tracking-wider"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <input
                        id="phone-number"
                        type="tel"
                        name="phone_number"
                        autoComplete="tel"
                        placeholder="e.g. 0911234567 or +251911234567"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (!phoneTouched) setPhoneTouched(true);
                        }}
                        onBlur={() => setPhoneTouched(true)}
                        disabled={isSubmitting}
                        className={`w-full pl-10 pr-4 py-2.5 bg-zinc-950 border font-mono text-sm text-white placeholder-zinc-500 rounded-xl focus:outline-hidden transition-all ${
                          phoneError
                            ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500/20'
                            : phoneTouched && !phoneError
                              ? 'border-emerald-600/70 focus:border-emerald-500'
                              : 'border-zinc-800 focus:border-zinc-500'
                        }`}
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {phoneError}
                      </p>
                    ) : (
                      <p className="text-[11px] text-zinc-500">
                        Supports Ethiopian mobile numbers or valid international numbers.
                      </p>
                    )}
                  </div>

                  {/* Field 3: Select Plan */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Selected Plan
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: '1m', name: '1 Month', price: '200 Birr' },
                        { id: '3m', name: '3 Months', price: '600 Birr' },
                        { id: '6m', name: '6 Months', price: '1,000 Birr', tag: 'Popular' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPlan(p.id)}
                          className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedPlan === p.id
                              ? 'border-white bg-zinc-800 text-white shadow-xs'
                              : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {p.tag && (
                            <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full bg-amber-400 text-zinc-950 font-black text-[9px] uppercase">
                              {p.tag}
                            </span>
                          )}
                          <p className="text-xs font-bold leading-tight text-zinc-100">{p.name}</p>
                          <p className="text-[11px] font-mono font-semibold text-zinc-400 mt-0.5">{p.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field 4: Payment Image Upload */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Payment Image
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Max {MAX_FILE_SIZE_MB}MB
                      </span>
                    </div>

                    {imagePreviewUrl && selectedFile ? (
                      /* Attached Image Preview Card */
                      <div className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-3 flex items-center gap-3 shadow-inner">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreviewUrl}
                            alt="Payment receipt preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Image Attached</span>
                          </div>
                          <p className="text-xs font-mono text-zinc-300 truncate mt-0.5">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            disabled={isSubmitting}
                            className="p-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop Upload Zone */
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer rounded-2xl border border-dashed transition-all duration-150 py-6 px-4 flex flex-col items-center justify-center text-center ${
                          fileError
                            ? 'border-red-500/80 bg-red-950/20'
                            : isDragging
                              ? 'border-white bg-zinc-800'
                              : 'border-zinc-700/80 bg-zinc-950/70 hover:border-zinc-500 hover:bg-zinc-950'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-2.5 text-zinc-300">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-zinc-200">
                          Click to upload or drag payment image here
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Supported formats: JPG, JPEG, PNG, WEBP (Max 5 MB)
                        </p>
                      </div>
                    )}

                    {fileError && (
                      <p className="text-[11px] font-semibold text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {fileError}
                      </p>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* Upload Progress Bar (when submitting) */}
                  {isSubmitting && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span>Uploading image & saving record...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <motion.div
                          className="h-full bg-white"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ ease: 'easeOut', duration: 0.2 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-black text-sm tracking-tight flex items-center justify-center gap-2 shadow-lg shadow-white/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                          <span>Processing Registration...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Registration</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* ================= Success View ================= */
              <motion.div
                key="register-success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 text-center space-y-6"
              >
                {/* Success Icon & Header */}
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-zinc-950 shadow-md">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      Registration submitted successfully.
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      Your payment screenshot has been uploaded to Cloudinary and your details are saved in the Supabase database.
                    </p>
                  </div>
                </div>

                {/* Submitted Summary Card */}
                {submittedData && (
                  <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-4 text-left space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Saved Details
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(submittedData.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Name:</span>
                        <span className="font-bold text-white truncate max-w-[200px]">
                          {submittedData.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Phone:</span>
                        <span className="font-mono font-bold text-white">
                          {submittedData.phone_number}
                        </span>
                      </div>

                      {submittedData.payment_image_url && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-zinc-400">Payment Image:</span>
                          <a
                            href={submittedData.payment_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-white hover:underline bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            View Image
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Submit Another
                  </button>

                  <Link
                    href="/"
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-black transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Go to Home</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="border-t border-zinc-800/80 py-4 text-center text-zinc-500 text-[11px]">
        <span>Powered by Supabase PostgreSQL & Cloudinary Media Storage</span>
      </footer>
    </div>
  );
}
