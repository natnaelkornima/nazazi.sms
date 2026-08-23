'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { usePayment } from '../context/PaymentContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PaymentSubmission } from '../types';
import { AdminLoginGate } from '../components/AdminLoginGate';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  Check,
  Smartphone,
  FileText,
  RefreshCw,
  History,
  AlertCircle,
  Trash2,
  ExternalLink,
  Users,
  XCircle,
  Copy,
  CheckCheck,
  CheckSquare,
  ArrowLeft,
  Sun,
  Moon,
  Globe,
  LogOut,
  Lock,
  Settings,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';

interface SmsLogItem {
  id: string;
  recipientPhone: string;
  recipientName: string;
  messageText: string;
  sentAt: string;
  status: 'Delivered' | 'Queued' | 'Failed';
  segmentCount: number;
}

const FAITH_SMS_TEMPLATES = [
  {
    title: 'Daily Scripture & Peace',
    text: 'Nazazi: "The LORD is my shepherd; I shall not want." - Psalm 23:1. May His grace fill your heart with peace and abundance today.',
  },
  {
    title: 'Strength & Confidence',
    text: 'Nazazi: "I can do all things through Christ who strengthens me." - Philippians 4:13. Walk boldly today knowing you are guided by His hand.',
  },
  {
    title: 'Hope & Prosperity',
    text: 'Nazazi: "For I know the plans I have for you, declares the LORD, plans to give you hope and a future." - Jeremiah 29:11.',
  },
  {
    title: 'Comfort & Grace',
    text: 'Nazazi: "Peace I leave with you; my peace I give you. Do not let your hearts be troubled." - John 14:27. Have a blessed day!',
  },
];

interface AdminDashboardViewProps {
  onExitAdmin?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onExitAdmin }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('nazazi_admin_token');
      return !!token;
    }
    return false;
  });

  const {
    submissions,
    isLoading,
    connectionInfo,
    fetchRegistrations,
    approvePayment,
    rejectPayment,
    updatePaymentPlan,
    deletePayment,
    resetAllData,
  } = usePayment();

  const { success, info, error } = useToast();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nazazi_admin_token');
      localStorage.removeItem('nazazi_admin_auth_at');
    }
    setIsAuthenticated(false);
    info('Logged Out', 'Admin console has been locked securely.');
  };

  // 3 Main Purposes Tab Selection
  const [activeTab, setActiveTab] = useState<'approvals' | 'send_sms' | 'logs'>('approvals');

  // Search & Filter for Approvals
  const [paymentSearch, setPaymentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [previewSubmission, setPreviewSubmission] = useState<PaymentSubmission | null>(null);

  // Single Item Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<PaymentSubmission | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Batch Selection & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Reset Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // SMS Dispatcher State
  const [targetType, setTargetType] = useState<'all_approved' | 'single_member'>('all_approved');
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [smsMessage, setSmsMessage] = useState<string>(FAITH_SMS_TEMPLATES[0].text);
  const [isSendingSms, setIsSendingSms] = useState(false);

  // Settings Menu Popover State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen]);

  // SMS Sent History Logs
  const [smsLogs, setSmsLogs] = useState<SmsLogItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nazazi_sms_logs');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Auto-sync registrations on mount
  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nazazi_sms_logs', JSON.stringify(smsLogs));
    }
  }, [smsLogs]);

  // Derived counts & revenue statistics
  const approvedSubmissions = submissions.filter((s) => s.status === 'approved');
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const approvedCount = approvedSubmissions.length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

  const totalCollectedRevenue = approvedSubmissions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalPotentialRevenue = submissions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  // Filtered Payments for table
  const filteredSubmissions = submissions.filter((sub) => {
    const query = paymentSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      sub.userName.toLowerCase().includes(query) ||
      sub.userPhone.toLowerCase().includes(query) ||
      sub.planName.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Send SMS to Approved Numbers
  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();

    if (!smsMessage.trim()) {
      error('Empty Message', 'Please enter or select a scripture/encouragement message to send.');
      return;
    }

    let recipientPhone = '';
    let recipientName = '';

    if (targetType === 'all_approved') {
      if (approvedCount === 0) {
        error(
          'No Approved Members',
          'Please approve at least one member in the Payment Approvals tab before sending bulk SMS.'
        );
        return;
      }
      recipientPhone = `All ${approvedCount} Approved Numbers`;
      recipientName = `Bulk Dispatch (${approvedCount} Members)`;
    } else {
      const finalPhone = selectedPhone || customPhone;
      if (!finalPhone.trim()) {
        error('Phone Required', 'Please select or enter an approved member phone number.');
        return;
      }
      recipientPhone = finalPhone;
      const foundSub = submissions.find((s) => s.userPhone === finalPhone || s.userPhone.includes(finalPhone));
      recipientName = foundSub ? foundSub.userName : 'Member';
    }

    setIsSendingSms(true);

    setTimeout(() => {
      setIsSendingSms(false);

      const segments = Math.ceil(smsMessage.length / 160) || 1;
      const newLog: SmsLogItem = {
        id: `sms_${Date.now().toString(36)}`,
        recipientPhone: recipientPhone,
        recipientName: recipientName,
        messageText: smsMessage,
        sentAt: new Date().toISOString(),
        status: 'Delivered',
        segmentCount: segments,
      };

      setSmsLogs((prev) => [newLog, ...prev]);
      success(
        'SMS Dispatched Successfully!',
        `Sent via SMS Gateway to ${recipientPhone}`
      );
    }, 600);
  };

  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      await deletePayment(itemToDelete.id, itemToDelete.userPhone);
      setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
      success('Record Deleted', `Removed ${itemToDelete.userName} (${itemToDelete.userPhone})`);
      if (previewSubmission?.id === itemToDelete.id) {
        setPreviewSubmission(null);
      }
      setItemToDelete(null);
    } catch {
      error('Delete Failed', 'Could not delete the record. Please try again.');
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubmissions.map((s) => s.id));
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const targets = submissions.filter((s) => selectedIds.includes(s.id));
      for (const sub of targets) {
        await deletePayment(sub.id, sub.userPhone);
      }
      success('Batch Deleted', `Permanently deleted ${selectedIds.length} registration(s).`);
      setSelectedIds([]);
      setShowBatchDeleteModal(false);
    } catch {
      error('Batch Delete Failed', 'Could not delete all selected items.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      setSmsLogs([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nazazi_sms_logs');
      }
      setShowResetModal(false);
      success('Reset Complete', 'All registrations, submissions, and SMS logs have been cleared.');
    } catch {
      error('Reset Error', 'Failed to complete reset.');
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminLoginGate
        onSuccess={() => {
          setIsAuthenticated(true);
          success('Welcome Admin', 'Authenticated successfully.');
          fetchRegistrations();
        }}
        onCancel={() => {
          if (onExitAdmin) {
            onExitAdmin();
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* 1. Header Bar with Settings Popover */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 flex-wrap">
          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              className="mr-1 p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Back to User Home Page"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Public Site</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black flex items-center justify-center shadow-xs">
            N
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Nazazi Admin
          </h1>
        </div>

        {/* Settings Menu Popover */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold cursor-pointer group shadow-xs ${
              isSettingsOpen
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            title="Admin Settings & Actions"
          >
            {isSettingsOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Settings className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
            )}
            <span className="hidden sm:inline">Settings</span>
          </button>

          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-2.5 z-50 space-y-1 divide-y divide-zinc-100 dark:divide-zinc-800/60"
              >
                {/* Popover Header */}
                <div className="pb-2 px-2.5 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Admin Settings</span>
                  <Settings className="w-3.5 h-3.5" />
                </div>

                <div className="pt-2 space-y-1">
                  {/* 1. Language Switcher */}
                  <button
                    onClick={() => {
                      toggleLanguage();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-sm border border-zinc-200 dark:border-zinc-700">
                        <Globe className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {language === 'en' ? 'Language Switcher' : 'ቋንቋ ቀይር'}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {language === 'en' ? '🇺🇸 English (Switch to አማርኛ)' : '🇪🇹 አማርኛ (Switch to English)'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                      {language.toUpperCase()}
                    </span>
                  </button>

                  {/* 2. Theme Changer */}
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-sm border border-zinc-200 dark:border-zinc-700">
                        {theme === 'dark' ? (
                          <Moon className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {language === 'en' ? 'Theme Changer' : 'ገጽታ ቀይር'}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {theme === 'dark' ? 'Dark Mode (Switch to Light)' : 'Light Mode (Switch to Dark)'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-500 capitalize px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                      {theme}
                    </span>
                  </button>

                  {/* 3. Sync Database */}
                  <button
                    onClick={() => {
                      fetchRegistrations();
                      info('Refreshed', 'Synced latest registrations from Supabase.');
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-sm border border-zinc-200 dark:border-zinc-700">
                        <RefreshCw className={`w-4 h-4 text-zinc-700 dark:text-zinc-300 ${isLoading ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Sync Database
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Refresh registrations from database
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* 4. Clear Data */}
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setShowResetModal(true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm border border-rose-200 dark:border-rose-800/50">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">
                          Clear Data
                        </p>
                        <p className="text-[11px] text-rose-500/80 dark:text-rose-400/80">
                          Reset all registrations & logs
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* 5. Lock Console */}
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 text-amber-400 flex items-center justify-center font-bold text-sm shadow-xs">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Lock Console
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Securely lock admin session
                        </p>
                      </div>
                    </div>
                    <LogOut className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => {
            setActiveTab('approvals');
            setStatusFilter('pending');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'approvals' && statusFilter === 'pending'
              ? 'border-amber-500/80 bg-amber-500/10'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">1. Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Need verification</p>
        </div>

        <div
          onClick={() => {
            setActiveTab('send_sms');
            setTargetType('all_approved');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'send_sms'
              ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-md'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">2. Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold mt-1">{approvedCount}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Ready for SMS</p>
        </div>

        <div
          onClick={() => {
            setActiveTab('approvals');
            setStatusFilter('approved');
          }}
          className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">3. Revenue</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">ETB</span>
          </div>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
            {totalCollectedRevenue.toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Total verified collections
          </p>
        </div>

        <div
          onClick={() => setActiveTab('logs')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-sky-500/80 bg-sky-500/10'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">4. Dispatches</span>
            <History className="w-4 h-4" />
          </div>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{smsLogs.length}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Delivery history</p>
        </div>
      </div>

      {/* 3. Purpose Tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 w-fit">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'approvals'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>1. Payment Approvals</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-extrabold rounded-full animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('send_sms')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'send_sms'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
          <span>2. Send SMS to Approved Numbers</span>
          <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold rounded-md">
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <History className="w-3.5 h-3.5 text-sky-500" />
          <span>3. Sent SMS Logs</span>
          <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold rounded-md">
            {smsLogs.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PURPOSE 1: PAYMENT APPROVALS */}
      {/* ========================================================================= */}
      {activeTab === 'approvals' && (
        <Card className="p-6 space-y-5 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                Member Payment Approvals
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Inspect payment screenshots, verify member details, and approve active SMS access.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>
          </div>

          {/* Search Input & Batch Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="max-w-md w-full">
              <Input
                placeholder="Search by member name, phone number (+251...), or plan..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                  {selectedIds.length} selected
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowBatchDeleteModal(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  className="text-xs py-1 h-7"
                >
                  Delete Selected
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[11px] underline cursor-pointer ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Registrations Table */}
          {filteredSubmissions.length === 0 ? (
            <div className="py-14 text-center text-xs text-zinc-400 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <AlertCircle className="w-9 h-9 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div>
                <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">No registrations found</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Submissions from the registration form will appear here in real-time.
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fetchRegistrations()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 font-semibold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3.5 pl-4 w-8">
                      <input
                        type="checkbox"
                        checked={
                          filteredSubmissions.length > 0 &&
                          selectedIds.length === filteredSubmissions.length
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        title="Select all"
                      />
                    </th>
                    <th className="p-3.5">Member Name & Phone</th>
                    <th className="p-3.5">Plan / Amount</th>
                    <th className="p-3.5">Receipt Image</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredSubmissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                        selectedIds.includes(sub.id) ? 'bg-zinc-50/90 dark:bg-zinc-800/60' : ''
                      }`}
                    >
                      <td className="p-3.5 pl-4 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sub.id)}
                          onChange={() => handleToggleSelect(sub.id)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-zinc-900 dark:text-zinc-100">{sub.userName}</p>
                          <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-zinc-400" /> {sub.userPhone}
                          </p>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1.5">
                          <div className="relative inline-flex items-center">
                            <select
                              value={sub.amount >= 1000 ? '1000' : sub.amount >= 600 ? '600' : '200'}
                              onChange={async (e) => {
                                const val = Number(e.target.value);
                                const newPlanName =
                                  val === 1000
                                    ? '6 Months Access (1,000 Birr)'
                                    : val === 600
                                    ? '3 Months Access (600 Birr)'
                                    : '1 Month Access (200 Birr)';
                                await updatePaymentPlan(sub.id, newPlanName, val, sub.userPhone);
                                success('Plan Updated', `Set to ${val} ETB (${val === 1000 ? '6 Months' : val === 600 ? '3 Months' : '1 Month'}) for ${sub.userName}`);
                              }}
                              className={`text-[10px] font-extrabold uppercase py-1 pl-2 pr-6 rounded-md border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                                sub.amount >= 1000 || sub.planName.toLowerCase().includes('6')
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                  : sub.amount >= 600 || sub.planName.toLowerCase().includes('3')
                                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
                              }`}
                              title="Click to adjust plan tier & amount"
                            >
                              <option value="200" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
                                1 Mo • 200 ETB
                              </option>
                              <option value="600" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
                                3 Mo • 600 ETB
                              </option>
                              <option value="1000" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
                                6 Mo • 1,000 ETB
                              </option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
                          </div>
                          <p className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {Number(sub.amount).toLocaleString()} ETB
                          </p>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {sub.screenshotUrl ? (
                          <div
                            onClick={() => setPreviewSubmission(sub)}
                            className="relative h-12 w-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 cursor-pointer group shadow-xs"
                            title="Click to view full receipt image"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sub.screenshotUrl}
                              alt="Payment Screenshot"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200 opacity-90"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">No image</span>
                        )}
                      </td>

                      <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </td>

                      <td className="p-3.5">
                        {sub.status === 'pending' && <Badge variant="amber" dot>Pending</Badge>}
                        {sub.status === 'approved' && <Badge variant="zinc" dot>Approved</Badge>}
                        {sub.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {sub.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  approvePayment(sub.id);
                                  success('Approved!', `Activated SMS subscription for ${sub.userPhone}`);
                                }}
                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  rejectPayment(sub.id);
                                  info('Rejected', `Marked ${sub.userPhone} as rejected`);
                                }}
                                className="text-xs"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {sub.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setSelectedPhone(sub.userPhone);
                                setActiveTab('send_sms');
                                setTargetType('single_member');
                              }}
                              className="text-[11px] font-bold"
                            >
                              <Send className="w-3 h-3 mr-1" /> Send SMS
                            </Button>
                          )}

                          {sub.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                approvePayment(sub.id);
                                success('Approved', `Status updated to active for ${sub.userPhone}`);
                              }}
                              className="text-xs"
                            >
                              Re-Approve
                            </Button>
                          )}

                          <button
                            type="button"
                            id={`delete-btn-${sub.id}`}
                            onClick={() => setItemToDelete(sub)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PURPOSE 2: SEND SMS TO APPROVED MEMBERS */}
      {/* ========================================================================= */}
      {activeTab === 'send_sms' && (
        <Card className="p-6 sm:p-8 space-y-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="space-y-1 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                <Send className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50">
                  Send SMS to Approved Numbers
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Broadcast uplifting scripture verses or encouragement messages to active subscribers.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSendSms} className="space-y-6">
            {/* Recipient Target Choice */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                1. Choose Recipients
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setTargetType('all_approved')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    targetType === 'all_approved'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> All Approved Subscribers
                    </span>
                    <Badge variant="zinc">{approvedCount} Active</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Send bulk SMS to all members with verified payments simultaneously.
                  </p>
                </div>

                <div
                  onClick={() => setTargetType('single_member')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    targetType === 'single_member'
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Single Approved Member
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">
                    Target an individual subscriber phone number.
                  </p>
                </div>
              </div>
            </div>

            {/* Single Member Selector */}
            {targetType === 'single_member' && (
              <div className="space-y-2 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Select Approved Phone Number
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={selectedPhone}
                      onChange={(e) => {
                        setSelectedPhone(e.target.value);
                        setCustomPhone('');
                      }}
                      className="w-full h-10 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">-- Select from Approved Subscribers --</option>
                      {approvedSubmissions.map((s) => (
                        <option key={s.id} value={s.userPhone}>
                          {s.userName} ({s.userPhone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Input
                      placeholder="Or enter recipient phone (+251...)"
                      value={customPhone}
                      onChange={(e) => {
                        setCustomPhone(e.target.value);
                        setSelectedPhone('');
                      }}
                      leftIcon={<Smartphone className="w-3.5 h-3.5 text-zinc-400" />}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Scripture Preset Templates */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>2. Quick Scripture & Faith Templates</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Click a template to load message text
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FAITH_SMS_TEMPLATES.map((tmpl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSmsMessage(tmpl.text)}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 hover:border-zinc-900 dark:hover:border-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 transition-all cursor-pointer space-y-1"
                  >
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-zinc-500" /> {tmpl.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {tmpl.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SMS Body Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  3. SMS Message Content
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {smsMessage.length} characters • {Math.ceil(smsMessage.length / 160) || 1} SMS Segment(s)
                </span>
              </div>

              <textarea
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type encouraging verse or announcement to dispatch..."
                className="w-full p-3.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 focus:outline-hidden resize-none leading-relaxed font-sans"
              />
            </div>

            {/* Submit Dispatch Button */}
            <Button
              type="submit"
              size="lg"
              isLoading={isSendingSms}
              className="w-full font-extrabold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-xl py-3 text-sm shadow-sm"
              leftIcon={<Send className="w-4 h-4" />}
            >
              {targetType === 'all_approved'
                ? `Dispatch SMS to All ${approvedCount} Approved Members`
                : `Send SMS to Recipient`}
            </Button>
          </form>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* PURPOSE 3: SMS DELIVERY LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <Card className="p-6 space-y-4 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                Recent SMS Dispatch History
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Audit log of all sent encouragement and spiritual messages.
              </p>
            </div>
            {smsLogs.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSmsLogs([]);
                  if (typeof window !== 'undefined') localStorage.removeItem('nazazi_sms_logs');
                  info('Cleared SMS logs');
                }}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Clear History
              </Button>
            )}
          </div>

          {smsLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="font-bold text-zinc-600 dark:text-zinc-300">No SMS messages sent yet</p>
              <p>Dispatched messages from the SMS Console will appear here with delivery timestamps.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 font-semibold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="p-3.5 pl-4">Recipient</th>
                    <th className="p-3.5">Dispatched Message</th>
                    <th className="p-3.5">Time</th>
                    <th className="p-3.5">Segments</th>
                    <th className="p-3.5 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {smsLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                      <td className="p-3.5 pl-4">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{log.recipientName}</p>
                        <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                          {log.recipientPhone}
                        </p>
                      </td>

                      <td className="p-3.5 max-w-xs sm:max-w-md">
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed truncate" title={log.messageText}>
                          {log.messageText}
                        </p>
                      </td>

                      <td className="p-3.5 text-zinc-500">
                        {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="p-3.5 font-mono text-zinc-500">
                        {log.segmentCount}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <Badge variant="zinc" dot>
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Screenshot Inspection Modal */}
      <Modal
        isOpen={!!previewSubmission}
        onClose={() => setPreviewSubmission(null)}
        title="Payment Receipt Screenshot"
        description={previewSubmission ? `${previewSubmission.userName} • ${previewSubmission.userPhone}` : ''}
      >
        {previewSubmission && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-2 text-xs border border-zinc-200 dark:border-zinc-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Member Name</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {previewSubmission.userName}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Phone Number</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {previewSubmission.userPhone}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Selected Plan</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {previewSubmission.planName} ({previewSubmission.amount} ETB)
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Status</span>
                  {previewSubmission.status === 'pending' && <Badge variant="amber" dot>Pending Approval</Badge>}
                  {previewSubmission.status === 'approved' && <Badge variant="zinc" dot>Approved & Active</Badge>}
                  {previewSubmission.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                </div>
              </div>

              {/* Quick Plan & Amount Adjuster */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/80">
                <span className="text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase font-bold tracking-wider mb-1.5">
                  Verify / Adjust Plan Tier
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { amount: 200, name: '1 Month Access (200 Birr)', label: '1 Month (200 ETB)' },
                    { amount: 600, name: '3 Months Access (600 Birr)', label: '3 Months (600 ETB)' },
                    { amount: 1000, name: '6 Months Access (1,000 Birr)', label: '6 Months (1,000 ETB)' },
                  ].map((tier) => {
                    const isSelected =
                      (tier.amount === 1000 && (previewSubmission.amount >= 1000 || previewSubmission.planName.toLowerCase().includes('6'))) ||
                      (tier.amount === 600 && previewSubmission.amount === 600 && !previewSubmission.planName.toLowerCase().includes('6')) ||
                      (tier.amount === 200 && previewSubmission.amount <= 200 && !previewSubmission.planName.toLowerCase().includes('6') && !previewSubmission.planName.toLowerCase().includes('3'));

                    return (
                      <button
                        key={tier.amount}
                        type="button"
                        onClick={async () => {
                          await updatePaymentPlan(previewSubmission.id, tier.name, tier.amount, previewSubmission.userPhone);
                          setPreviewSubmission({
                            ...previewSubmission,
                            planName: tier.name,
                            amount: tier.amount,
                          });
                          success('Plan Adjusted', `Set to ${tier.label} for ${previewSubmission.userName}`);
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* High-Res Image Container */}
            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black flex items-center justify-center max-h-[55vh]">
              {previewSubmission.screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSubmission.screenshotUrl}
                  alt="Payment Receipt Screenshot"
                  referrerPolicy="no-referrer"
                  className="max-h-[50vh] w-auto object-contain"
                />
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs">No screenshot image available</div>
              )}
            </div>

            {previewSubmission.screenshotUrl && (
              <div className="text-right">
                <a
                  href={previewSubmission.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Image in New Tab
                </a>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPreviewSubmission(null)}>
                  Close
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setItemToDelete(previewSubmission);
                  }}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Delete Record
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {previewSubmission.status !== 'rejected' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      rejectPayment(previewSubmission.id);
                      info('Rejected', 'Marked transaction as rejected');
                      setPreviewSubmission(null);
                    }}
                  >
                    Reject
                  </Button>
                )}

                {previewSubmission.status !== 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      approvePayment(previewSubmission.id);
                      success('Payment Approved!', `Activated subscriber ${previewSubmission.userPhone}`);
                      setPreviewSubmission(null);
                    }}
                    className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 font-bold"
                  >
                    <Check className="w-4 h-4 mr-1" /> Approve & Activate
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Single Item Delete Confirmation Modal */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => !isDeletingItem && setItemToDelete(null)}
        title="Delete Member Registration?"
        description={itemToDelete ? `${itemToDelete.userName} • ${itemToDelete.userPhone}` : ''}
      >
        <div className="space-y-4 text-xs">
          <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Are you sure you want to permanently delete the registration record for{' '}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
              {itemToDelete?.userName}
            </strong>{' '}
            ({itemToDelete?.userPhone})? This action removes the entry from the database and approval queue.
          </p>

          <div className="flex justify-end items-center gap-2.5 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setItemToDelete(null)}
              disabled={isDeletingItem}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmSingleDelete}
              isLoading={isDeletingItem}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        isOpen={showBatchDeleteModal}
        onClose={() => !isBatchDeleting && setShowBatchDeleteModal(false)}
        title={`Delete ${selectedIds.length} Selected Registrations?`}
        description="Permanently delete multiple registration entries at once."
      >
        <div className="space-y-4 text-xs">
          <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
              {selectedIds.length} registration(s)
            </strong>
            ? This action cannot be undone.
          </p>

          <div className="flex justify-end items-center gap-2.5 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBatchDeleteModal(false)}
              disabled={isBatchDeleting}
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmBatchDelete}
              isLoading={isBatchDeleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Yes, Delete Selected
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear / Reset Data Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Clear All Registrations & Logs?"
        description="This will clear all registered members and SMS history."
      >
        <div className="space-y-4 text-xs">
          <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Are you sure you want to clear all registrations? This deletes test submissions and gives you a fresh start for real subscribers.
          </p>

          <div className="flex justify-end items-center gap-2.5 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowResetModal(false)} disabled={isResetting}>
              Cancel
            </Button>

            <Button variant="danger" size="sm" onClick={handleExecuteReset} isLoading={isResetting}>
              Yes, Clear All Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
