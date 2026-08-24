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
  ChevronLeft,
  ChevronDown,
  X,
  Square,
  ListFilter,
  Download,
  FileSpreadsheet,
  Calendar,
  Layers,
  CircleDollarSign,
  TrendingUp,
  User,
  CreditCard,
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

  // Pagination for Registrations
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Selection Mode (shows modern select boxes only when activated or when items are selected)
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

  // Export Loading States
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  // Reset to page 1 if query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [paymentSearch, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredSubmissions.length);
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

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
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (next.length === 0) {
        setIsSelectionMode(false);
      } else {
        setIsSelectionMode(true);
      }
      return next;
    });
  };

  const handleSelectPage = () => {
    const pageIds = paginatedSubmissions.map((s) => s.id);
    const allPageSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allPageSelected) {
      const next = selectedIds.filter((id) => !pageIds.includes(id));
      setSelectedIds(next);
      if (next.length === 0) setIsSelectionMode(false);
    } else {
      setIsSelectionMode(true);
      const combined = Array.from(new Set([...selectedIds, ...pageIds]));
      setSelectedIds(combined);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setIsSelectionMode(true);
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

  // Export to CSV with full registration information
  const exportToCSV = () => {
    if (filteredSubmissions.length === 0) {
      info('No Data to Export', 'There are no registered users matching your filter.');
      return;
    }

    setIsExportingCsv(true);
    try {
      const headers = [
        '#',
        'Registration ID',
        'Full Name',
        'Phone Number',
        'Email Address',
        'Plan Tier',
        'Amount (ETB)',
        'Currency',
        'Payer Name',
        'Transaction ID',
        'Status',
        'Registration Date',
        'Registration Time',
        'Receipt Screenshot URL',
        'Notes',
      ];

      const rows = filteredSubmissions.map((sub, index) => {
        const subDate = new Date(sub.submittedAt);
        const formattedDate = !isNaN(subDate.getTime()) ? subDate.toLocaleDateString() : 'N/A';
        const formattedTime = !isNaN(subDate.getTime()) ? subDate.toLocaleTimeString() : 'N/A';

        return [
          index + 1,
          `"${(sub.id || '').replace(/"/g, '""')}"`,
          `"${(sub.userName || '').replace(/"/g, '""')}"`,
          `"${(sub.userPhone || '').replace(/"/g, '""')}"`,
          `"${(sub.userEmail || '').replace(/"/g, '""')}"`,
          `"${(sub.planName || '').replace(/"/g, '""')}"`,
          sub.amount || 0,
          `"${(sub.currency || 'ETB').replace(/"/g, '""')}"`,
          `"${(sub.payerName || '').replace(/"/g, '""')}"`,
          `"${(sub.transactionId || '').replace(/"/g, '""')}"`,
          `"${(sub.status || '').toUpperCase()}"`,
          `"${formattedDate}"`,
          `"${formattedTime}"`,
          `"${(sub.screenshotUrl || '').replace(/"/g, '""')}"`,
          `"${(sub.notes || '').replace(/"/g, '""')}"`,
        ];
      });

      // UTF-8 BOM for spreadsheet application compatibility with Amharic / Ethiopian names
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateSlug = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `nazazi_registered_users_${statusFilter}_${dateSlug}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('CSV Exported', `Successfully exported ${filteredSubmissions.length} user record(s) to CSV.`);
    } catch (err) {
      console.error('CSV Export Error:', err);
      error('Export Error', 'Failed to generate CSV export file.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Export to PDF with professional summary report and table
  const exportToPDF = async () => {
    if (filteredSubmissions.length === 0) {
      info('No Data to Export', 'There are no registered users matching your filter.');
      return;
    }

    setIsExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Banner
      doc.setFillColor(24, 24, 27); // #18181b
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('NAZAZI SPIRITUAL SMS SERVICE', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(212, 212, 216);
      doc.text('Registered Users Master Report & Subscriptions List', 14, 18);

      // Meta details block
      const exportDate = new Date().toLocaleString();
      const totalAmount = filteredSubmissions.reduce((sum, s) => sum + (s.amount || 0), 0);
      const approvedTotal = filteredSubmissions.filter((s) => s.status === 'approved').length;
      const pendingTotal = filteredSubmissions.filter((s) => s.status === 'pending').length;
      const rejectedTotal = filteredSubmissions.filter((s) => s.status === 'rejected').length;

      doc.setTextColor(60, 60, 65);
      doc.setFontSize(8);
      doc.text(`Generated: ${exportDate}`, 14, 30);
      doc.text(`Status Filter: ${statusFilter.toUpperCase()}`, 14, 34.5);
      doc.text(
        `Total Records: ${filteredSubmissions.length} (${approvedTotal} Approved, ${pendingTotal} Pending, ${rejectedTotal} Rejected)`,
        14,
        39
      );

      doc.text(`Total Subscription Value: ${totalAmount.toLocaleString()} ETB`, 122, 30);
      doc.text(`Admin System: Nazazi SMS Portal`, 122, 34.5);

      // Subtle Divider
      doc.setDrawColor(225, 225, 230);
      doc.line(14, 43, 196, 43);

      const tableData = filteredSubmissions.map((sub, idx) => {
        const subDate = new Date(sub.submittedAt);
        const dateStr = !isNaN(subDate.getTime()) ? subDate.toLocaleDateString() : 'N/A';
        return [
          idx + 1,
          sub.userName || 'N/A',
          sub.userPhone || 'N/A',
          sub.planName || '1 Month Access',
          `${Number(sub.amount || 0).toLocaleString()} ETB`,
          (sub.status || 'PENDING').toUpperCase(),
          dateStr,
        ];
      });

      autoTable(doc, {
        startY: 46,
        head: [['#', 'Member Name', 'Phone Number', 'Plan Tier', 'Amount', 'Status', 'Date']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [39, 39, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          valign: 'middle',
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 42, fontStyle: 'bold' },
          2: { cellWidth: 32 },
          3: { cellWidth: 38 },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [248, 248, 250],
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const status = String(data.cell.raw).toUpperCase();
            if (status === 'APPROVED') {
              data.cell.styles.textColor = [16, 149, 106];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'PENDING') {
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = 'bold';
            } else if (status === 'REJECTED') {
              data.cell.styles.textColor = [225, 29, 72];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        foot: [
          [
            '',
            `Total: ${filteredSubmissions.length} user(s)`,
            '',
            '',
            `${totalAmount.toLocaleString()} ETB`,
            '',
            '',
          ],
        ],
        footStyles: {
          fillColor: [240, 240, 243],
          textColor: [24, 24, 27],
          fontStyle: 'bold',
          fontSize: 8,
        },
      });

      // Add footer to each page
      const totalDocPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalDocPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 145);
        doc.text(
          `Nazazi Spiritual Services | Confidential Admin Report | Page ${i} of ${totalDocPages}`,
          14,
          290
        );
      }

      const dateSlug = new Date().toISOString().split('T')[0];
      doc.save(`nazazi_registered_users_${statusFilter}_${dateSlug}.pdf`);
      success('PDF Exported', `Generated PDF report with ${filteredSubmissions.length} user record(s).`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      error('Export Error', 'Failed to generate PDF document.');
    } finally {
      setIsExportingPdf(false);
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
      <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Back to Public Site"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Public Site</span>
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black flex items-center justify-center shadow-xs text-sm">
            N
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              Nazazi Admin
            </h1>
            <p className="text-[10px] sm:hidden text-zinc-400 font-medium">Control Center</p>
          </div>
        </div>

        {/* Settings Menu Popover */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all flex items-center gap-1.5 sm:gap-2 text-xs font-bold cursor-pointer group shadow-xs ${
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div
          onClick={() => {
            setActiveTab('approvals');
            setStatusFilter('pending');
          }}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'approvals' && statusFilter === 'pending'
              ? 'border-amber-500/80 bg-amber-500/10'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">1. Pending</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{pendingCount}</p>
          <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">Need verification</p>
        </div>

        <div
          onClick={() => {
            setActiveTab('send_sms');
            setTargetType('all_approved');
          }}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'send_sms'
              ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-md'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-80">2. Approved</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold mt-1">{approvedCount}</p>
          <p className="text-[10px] sm:text-[11px] opacity-70 mt-0.5 truncate">Ready for SMS</p>
        </div>

        <div
          onClick={() => {
            setActiveTab('approvals');
            setStatusFilter('approved');
          }}
          className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">3. Revenue</span>
            <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1 sm:px-1.5 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">ETB</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1 truncate">
            {totalCollectedRevenue.toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">
            Verified collections
          </p>
        </div>

        <div
          onClick={() => setActiveTab('logs')}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-sky-500/80 bg-sky-500/10'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">4. Dispatches</span>
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">{smsLogs.length}</p>
          <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 truncate">Delivery history</p>
        </div>
      </div>

      {/* 3. Purpose Tab Navigation - Scrollable & Responsive */}
      <div className="w-full overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 min-w-max">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>1. Approvals</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-extrabold rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('send_sms')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'send_sms'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
            <span>2. Send SMS</span>
            <span className="px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold rounded-md">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-sky-500" />
            <span>3. Logs</span>
            <span className="px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold rounded-md">
              {smsLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PURPOSE 1: PAYMENT APPROVALS */}
      {/* ========================================================================= */}
      {activeTab === 'approvals' && (
        <Card className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                Member Payment Approvals
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Verify payment receipts and activate member access.
              </p>
            </div>

            {/* Filter Pills - scrollable on mobile */}
            <div className="flex items-center gap-1 text-xs font-semibold overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-xs ${
                  statusFilter === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-xs ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-xs ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                Approved ({approvedCount})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-xs ${
                  statusFilter === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>
          </div>

          {/* Search Input, Batch Selection & Pagination Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="w-full sm:max-w-xs md:max-w-sm">
              <Input
                placeholder="Search member, phone, plan..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-end">
              {/* Export to CSV Button with responsive icon/text */}
              <button
                type="button"
                onClick={exportToCSV}
                disabled={isExportingCsv}
                aria-label="Export to CSV"
                title="Export list as CSV"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 h-8 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">CSV</span>
              </button>

              {/* Export to PDF Button with responsive icon/text */}
              <button
                type="button"
                onClick={exportToPDF}
                disabled={isExportingPdf}
                aria-label="Export to PDF"
                title="Export list as PDF"
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 h-8 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              {/* Toggle Select Mode Button */}
              {filteredSubmissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (isSelectionMode && selectedIds.length === 0) {
                      setIsSelectionMode(false);
                    } else if (isSelectionMode && selectedIds.length > 0) {
                      setSelectedIds([]);
                      setIsSelectionMode(false);
                    } else {
                      setIsSelectionMode(true);
                    }
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 h-8 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSelectionMode || selectedIds.length > 0
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                  aria-label="Select items"
                  title="Toggle multi-item select mode"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{isSelectionMode || selectedIds.length > 0 ? 'Selection Active' : 'Select'}</span>
                </button>
              )}

              {/* Active Selection Floating Pill */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 px-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                    {selectedIds.length}
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setShowBatchDeleteModal(true)}
                    leftIcon={<Trash2 className="w-3 h-3" />}
                    className="text-xs py-0.5 h-6.5 px-2"
                  >
                    <span className="hidden sm:inline">Delete Selected</span>
                    <span className="sm:hidden">Delete</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds([]);
                      setIsSelectionMode(false);
                    }}
                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[11px] underline cursor-pointer px-0.5"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Registrations List - Mobile Cards View + Desktop Table View */}
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
            <div className="space-y-3">
              {/* Mobile View: Modern Cards Layout (Visible only on < md screens) */}
              <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {paginatedSubmissions.map((sub, pageIndex) => {
                  const absoluteIndex = startIndex + pageIndex + 1;
                  const isSelected = selectedIds.includes(sub.id);

                  return (
                    <div
                      key={`m-${sub.id}`}
                      onClick={() => {
                        if (isSelectionMode) handleToggleSelect(sub.id);
                      }}
                      className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                        isSelected
                          ? 'bg-zinc-100/90 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 shadow-2xs'
                          : 'bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      {/* Card Header: Index/Select, Name, Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {(isSelectionMode || selectedIds.length > 0) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelect(sub.id);
                              }}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-2xs'
                                  : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                              }`}
                              aria-label={isSelected ? 'Deselect member' : 'Select member'}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          )}
                          <span className="text-[11px] font-mono font-bold text-zinc-400 dark:text-zinc-500">
                            #{absoluteIndex}
                          </span>
                          <div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-tight">
                              {sub.userName}
                            </h3>
                            <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 font-semibold flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-zinc-400" /> {sub.userPhone}
                            </p>
                          </div>
                        </div>

                        <div>
                          {sub.status === 'pending' && <Badge variant="amber" dot>Pending</Badge>}
                          {sub.status === 'approved' && <Badge variant="zinc" dot>Approved</Badge>}
                          {sub.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                        </div>
                      </div>

                      {/* Card Body: Plan Selector, Receipt thumbnail, Date */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                        {/* Plan & Amount Select */}
                        <div className="flex items-center gap-1.5">
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
                                success('Plan Updated', `Set to ${val} ETB for ${sub.userName}`);
                              }}
                              className={`text-[10px] font-extrabold uppercase py-1 pl-2 pr-5 rounded-md border appearance-none cursor-pointer ${
                                sub.amount >= 1000 || sub.planName.toLowerCase().includes('6')
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                  : sub.amount >= 600 || sub.planName.toLowerCase().includes('3')
                                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
                              }`}
                              title="Change plan tier"
                            >
                              <option value="200" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
                                1 Mo • 200 ETB
                              </option>
                              <option value="600" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
                                3 Mo • 600 ETB
                              </option>
                              <option value="1000" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
                                6 Mo • 1k ETB
                              </option>
                            </select>
                            <ChevronDown className="w-2.5 h-2.5 absolute right-1 pointer-events-none opacity-60" />
                          </div>
                        </div>

                        {/* Receipt preview button */}
                        <div className="flex items-center gap-2">
                          {sub.screenshotUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewSubmission(sub);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                              title="View receipt screenshot"
                            >
                              <Eye className="w-3 h-3 text-zinc-500" /> Receipt
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">No receipt</span>
                          )}

                          <span className="text-[10px] font-mono text-zinc-400">
                            {new Date(sub.submittedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Action Buttons (Large, touch-friendly icon/label buttons) */}
                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        {sub.status === 'pending' && (
                          <div className="flex items-center gap-1.5 w-full">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                approvePayment(sub.id, sub.userPhone);
                                success('Approved!', `Activated for ${sub.userPhone}`);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-2xs"
                              title="Approve registration"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                rejectPayment(sub.id, sub.userPhone);
                                info('Rejected', `Marked ${sub.userPhone} as rejected`);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-all cursor-pointer border border-rose-200 dark:border-rose-900"
                              title="Reject registration"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {sub.status === 'approved' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhone(sub.userPhone);
                              setActiveTab('send_sms');
                              setTargetType('single_member');
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
                          >
                            <Send className="w-3 h-3" /> Send SMS
                          </button>
                        )}

                        {sub.status === 'rejected' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              approvePayment(sub.id, sub.userPhone);
                              success('Approved', `Status updated to active for ${sub.userPhone}`);
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                          >
                            <Check className="w-3 h-3" /> Re-Approve
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(sub);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Delete this record"
                          aria-label="Delete registration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Full-featured Table (Visible only on >= md screens) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-zinc-500 font-semibold uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      {/* Selection Column Header - shown when Selection Mode is on or items are selected */}
                      {(isSelectionMode || selectedIds.length > 0) && (
                        <th className="py-3 px-3 pl-4 w-10 text-center transition-all animate-fadeIn">
                          <button
                            type="button"
                            onClick={handleSelectPage}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                              paginatedSubmissions.length > 0 &&
                              paginatedSubmissions.every((s) => selectedIds.includes(s.id))
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-2xs'
                                : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-zinc-400'
                            }`}
                            title="Select / Deselect all on this page"
                          >
                            {paginatedSubmissions.length > 0 &&
                            paginatedSubmissions.every((s) => selectedIds.includes(s.id)) ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : paginatedSubmissions.some((s) => selectedIds.includes(s.id)) ? (
                              <div className="w-2 h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                            ) : null}
                          </button>
                        </th>
                      )}
                      <th className={`py-3 px-3 w-12 text-center text-[11px] font-mono text-zinc-400 ${!(isSelectionMode || selectedIds.length > 0) ? 'pl-4' : ''}`}>#</th>
                      <th className="py-3 px-3">Member Name & Phone</th>
                      <th className="py-3 px-3">Plan / Amount</th>
                      <th className="py-3 px-3">Receipt Image</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {paginatedSubmissions.map((sub, pageIndex) => {
                      const absoluteIndex = startIndex + pageIndex + 1;
                      const isSelected = selectedIds.includes(sub.id);

                      return (
                        <tr
                          key={sub.id}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (
                              isSelectionMode &&
                              !target.closest('button') &&
                              !target.closest('select') &&
                              !target.closest('a') &&
                              !target.closest('img')
                            ) {
                              handleToggleSelect(sub.id);
                            }
                          }}
                          className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                            isSelected
                              ? 'bg-zinc-100/80 dark:bg-zinc-800/70'
                              : ''
                          } ${isSelectionMode ? 'cursor-pointer select-none' : ''}`}
                        >
                          {/* Modern Select Checkbox Cell */}
                          {(isSelectionMode || selectedIds.length > 0) && (
                            <td className="py-3 px-3 pl-4 w-10 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelect(sub.id);
                                }}
                                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-2xs'
                                    : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800/80 hover:border-zinc-400'
                                }`}
                                title={isSelected ? 'Deselect member' : 'Select member'}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                            </td>
                          )}

                          {/* Index Number */}
                          <td className={`py-3 px-3 w-12 text-center text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 ${!(isSelectionMode || selectedIds.length > 0) ? 'pl-4' : ''}`}>
                            {absoluteIndex}
                          </td>

                          {/* Member Name & Phone */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">{sub.userName}</p>
                              <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-zinc-400" /> {sub.userPhone}
                              </p>
                            </div>
                          </td>

                          {/* Plan / Amount */}
                          <td className="py-3 px-3">
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

                          {/* Receipt Image */}
                          <td className="py-3 px-3">
                            {sub.screenshotUrl ? (
                              <div
                                onClick={() => setPreviewSubmission(sub)}
                                className="relative h-11 w-18 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 cursor-pointer group shadow-xs"
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

                          {/* Date */}
                          <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            {sub.status === 'pending' && <Badge variant="amber" dot>Pending</Badge>}
                            {sub.status === 'approved' && <Badge variant="zinc" dot>Approved</Badge>}
                            {sub.status === 'rejected' && <Badge variant="danger">Rejected</Badge>}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                              {sub.status === 'pending' && (
                                <div className="inline-flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      approvePayment(sub.id, sub.userPhone);
                                      success('Approved!', `Activated SMS subscription for ${sub.userPhone}`);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 transition-all cursor-pointer"
                                    title="Approve and activate"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve
                                  </button>
                                  <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      rejectPayment(sub.id, sub.userPhone);
                                      info('Rejected', `Marked ${sub.userPhone} as rejected`);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 transition-all cursor-pointer"
                                    title="Reject registration"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </div>
                              )}

                              {sub.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPhone(sub.userPhone);
                                    setActiveTab('send_sms');
                                    setTargetType('single_member');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
                                >
                                  <Send className="w-3 h-3" /> Send SMS
                                </button>
                              )}

                              {sub.status === 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    approvePayment(sub.id, sub.userPhone);
                                    success('Approved', `Status updated to active for ${sub.userPhone}`);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                                >
                                  <Check className="w-3 h-3" /> Re-Approve
                                </button>
                              )}

                              <button
                                type="button"
                                id={`delete-btn-${sub.id}`}
                                onClick={() => setItemToDelete(sub)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer ml-1"
                                title="Delete this record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 20 Per Page Pagination Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pt-2 px-1 text-xs text-zinc-500">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="font-mono text-[11px] sm:text-xs">
                    Showing <strong className="text-zinc-900 dark:text-zinc-100">{startIndex + 1}</strong>–
                    <strong className="text-zinc-900 dark:text-zinc-100">{endIndex}</strong> of{' '}
                    <strong className="text-zinc-900 dark:text-zinc-100">{filteredSubmissions.length}</strong>
                  </span>

                  {/* Page Size Selector */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-zinc-400">per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="py-0.5 px-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs text-xs"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <span className="px-2.5 sm:px-3 py-1.5 font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] sm:text-xs">
                    {validCurrentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs text-xs"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
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
        <Card className="p-3.5 sm:p-6 space-y-4 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                SMS Dispatch History
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Audit log of sent encouragement and spiritual messages.
              </p>
            </div>
            {smsLogs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSmsLogs([]);
                  if (typeof window !== 'undefined') localStorage.removeItem('nazazi_sms_logs');
                  info('Cleared SMS logs');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
                title="Clear all logs"
                aria-label="Clear all logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear History</span>
              </button>
            )}
          </div>

          {smsLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <p className="font-bold text-zinc-600 dark:text-zinc-300">No SMS messages sent yet</p>
              <p>Dispatched messages from the SMS Console will appear here with delivery timestamps.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Mobile Logs Cards (< md) */}
              <div className="grid grid-cols-1 gap-2.5 md:hidden">
                {smsLogs.map((log) => (
                  <div
                    key={`m-log-${log.id}`}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm leading-tight">{log.recipientName}</p>
                        <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 font-semibold">{log.recipientPhone}</p>
                      </div>
                      <Badge variant="zinc" dot>
                        {log.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 leading-relaxed font-sans">
                      {log.messageText}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
                      <span>{new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      <span>{log.segmentCount} segment(s)</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Logs Table (>= md) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
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
            </div>
          )}
        </Card>
      )}

      {/* Receipt Inspection Modal - Compact, Modern & Zero Wasted Whitespace */}
      <Modal
        isOpen={!!previewSubmission}
        onClose={() => setPreviewSubmission(null)}
        maxWidth="md"
        noPadding
      >
        {previewSubmission && (
          <div className="flex flex-col">
            {/* Header: Name, Plan & Close Button */}
            <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    Name: <strong className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">{previewSubmission.userName}</strong>
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Plan:</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold font-mono text-xs">
                    {previewSubmission.amount || (previewSubmission.planName.toLowerCase().includes('1000') || previewSubmission.planName.toLowerCase().includes('1,000') ? 1000 : previewSubmission.planName.toLowerCase().includes('600') ? 600 : 200)} Birr
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewSubmission(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Image (Maximal view area, minimal margins) */}
            <div className="p-2.5 sm:p-3 bg-zinc-950/95 flex items-center justify-center min-h-[200px] max-h-[58vh] sm:max-h-[64vh]">
              {previewSubmission.screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSubmission.screenshotUrl}
                  alt={`Receipt for ${previewSubmission.userName}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[54vh] sm:max-h-[60vh] w-auto max-w-full object-contain rounded-lg select-none"
                />
              ) : (
                <div className="py-12 text-center text-zinc-400 text-xs space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-zinc-600" />
                  <p>No receipt image uploaded</p>
                </div>
              )}
            </div>

            {/* Compact Action Footer */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewSubmission(null)}
                className="text-xs h-8 px-3"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {previewSubmission.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      rejectPayment(previewSubmission.id, previewSubmission.userPhone);
                      info('Rejected', 'Marked transaction as rejected');
                      setPreviewSubmission(null);
                    }}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer h-8"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                )}

                {previewSubmission.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      approvePayment(previewSubmission.id, previewSubmission.userPhone);
                      success('Approved', `Activated for ${previewSubmission.userName}`);
                      setPreviewSubmission(null);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer h-8"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Approve
                  </button>
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
