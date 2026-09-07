'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PaymentSubmission,
  SmsGatewayConfig,
  SmsScheduledCampaign,
  SmsTargetPlan,
  SmsScheduleDuration,
  SmsBatchDispatchProgress,
  SmsProviderType,
} from '@/types';
import { normalizePlanAndAmount } from '@/lib/planUtils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/context/ToastContext';
import {
  Send,
  Calendar,
  Clock,
  Settings,
  History,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  XCircle,
  Smartphone,
  Users,
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  RefreshCw,
  FileText,
  Copy,
  Trash2,
  ChevronRight,
  Eye,
  EyeOff,
  Radio,
  Sliders,
  Filter,
  ArrowRight,
  ExternalLink,
  Check,
  BookOpen,
  Crown,
  Heart,
  MessageSquare,
  RotateCcw,
  Plus,
  Pencil,
  BookmarkPlus,
  X,
} from 'lucide-react';

export interface SmsLogItem {
  id: string;
  recipientPhone: string;
  recipientName: string;
  messageText: string;
  sentAt: string;
  status: 'Delivered' | 'Queued' | 'Failed';
  segmentCount: number;
}

export interface SmsCustomTemplate {
  id: string;
  title: string;
  tag: string;
  text: string;
  createdAt: string;
}

interface SmsConsoleProps {
  submissions: PaymentSubmission[];
  approvedCount: number;
  smsLogs: SmsLogItem[];
  setSmsLogs: React.Dispatch<React.SetStateAction<SmsLogItem[]>>;
  initialSelectedPhone?: string;
}

export const SmsConsole: React.FC<SmsConsoleProps> = ({
  submissions,
  approvedCount,
  smsLogs,
  setSmsLogs,
  initialSelectedPhone,
}) => {
  const { success, error, info } = useToast();

  // Primary Tab within SMS Console
  const [activeSubTab, setActiveSubTab] = useState<'dispatcher' | 'schedules' | 'gateway' | 'logs'>('dispatcher');

  // Targeting: 'all' | '200' | '600' | '1000' | 'single'
  const [targetPlan, setTargetPlan] = useState<SmsTargetPlan>(initialSelectedPhone ? 'single' : 'all');
  const [singlePhone, setSinglePhone] = useState<string>(initialSelectedPhone || '');
  const [customPhone, setCustomPhone] = useState<string>('');

  useEffect(() => {
    if (initialSelectedPhone) {
      setTargetPlan('single');
      setSinglePhone(initialSelectedPhone);
    }
  }, [initialSelectedPhone]);

  // Mode: Instant Dispatch vs Scheduled Campaign
  const [dispatchMode, setDispatchMode] = useState<'instant' | 'schedule'>('instant');

  // Custom Saved Sample Texts
  const [customTemplates, setCustomTemplates] = useState<SmsCustomTemplate[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nazazi_sms_custom_templates');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.error('Error reading custom templates from storage', e);
      }
    }
    return [];
  });

  // Sync custom templates to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nazazi_sms_custom_templates', JSON.stringify(customTemplates));
      } catch (e) {
        console.error('Error saving custom templates to storage', e);
      }
    }
  }, [customTemplates]);

  // Message Composer
  const [messageText, setMessageText] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nazazi_sms_custom_templates');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.text) {
            return parsed[0].text;
          }
        }
      } catch {}
    }
    return '';
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Template Modal State (Create / Edit)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTag, setModalTag] = useState('Scripture');
  const [modalText, setModalText] = useState('');
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Chunking / Batch Settings
  const [batchSize, setBatchSize] = useState<number>(50);
  const [batchDelayMs, setBatchDelayMs] = useState<number>(500);

  // Live Batch Progress State
  const [progress, setProgress] = useState<SmsBatchDispatchProgress>({
    isDispatching: false,
    totalRecipients: 0,
    totalBatches: 0,
    currentBatch: 0,
    sentCount: 0,
    failedCount: 0,
    statusText: '',
    isPaused: false,
  });

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Scheduled Campaign Creation State
  const [scheduleDuration, setScheduleDuration] = useState<SmsScheduleDuration>('1_month');
  const [customDurationDays, setCustomDurationDays] = useState<number>(30);
  const [scheduleDailyTime, setScheduleDailyTime] = useState<string>('07:00');
  const [scheduleStartDate, setScheduleStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [campaignTitle, setCampaignTitle] = useState<string>('');
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);

  // Scheduled Campaigns List
  const [campaigns, setCampaigns] = useState<SmsScheduledCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  // Gateway Settings State
  const [gatewayConfig, setGatewayConfig] = useState<SmsGatewayConfig>({
    provider: 'generic_http',
    apiUrl: '',
    apiKey: '',
    senderId: 'NAZAZI',
    authHeader: 'Bearer',
    batchSize: 50,
    batchDelayMs: 500,
  });
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isSavingGateway, setIsSavingGateway] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get Admin auth token from browser storage
  const getAdminToken = (): string => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('nazazi_admin_token') || localStorage.getItem('nazazi_admin_token') || '';
  };

  // 1. Group Approved Submissions by Plan
  const { approvedAll, plan200Members, plan600Members, plan1000Members } = useMemo(() => {
    const approved = submissions.filter((s) => s.status === 'approved');
    const p200: PaymentSubmission[] = [];
    const p600: PaymentSubmission[] = [];
    const p1000: PaymentSubmission[] = [];

    for (const sub of approved) {
      const norm = normalizePlanAndAmount(sub.planName, sub.amount, sub.notes);
      if (norm.amount >= 900 || norm.planName.toLowerCase().includes('1000') || norm.planName.toLowerCase().includes('6 month') || norm.planName.toLowerCase().includes('vip')) {
        p1000.push(sub);
      } else if (norm.amount >= 500 || norm.planName.toLowerCase().includes('600') || norm.planName.toLowerCase().includes('3 month')) {
        p600.push(sub);
      } else {
        p200.push(sub);
      }
    }

    return {
      approvedAll: approved,
      plan200Members: p200,
      plan600Members: p600,
      plan1000Members: p1000,
    };
  }, [submissions]);

  // 2. Compute Active Recipient List based on Plan Target
  const activeRecipients = useMemo(() => {
    if (targetPlan === '200') return plan200Members;
    if (targetPlan === '600') return plan600Members;
    if (targetPlan === '1000') return plan1000Members;
    if (targetPlan === 'single') {
      const targetP = singlePhone || customPhone;
      if (!targetP) return [];
      const found = approvedAll.find((s) => s.userPhone === targetP || s.userPhone.includes(targetP));
      if (found) return [found];
      return [{
        id: 'manual',
        userId: 'manual',
        userName: 'Member',
        userEmail: '',
        userPhone: targetP,
        planName: 'Daily Devotional',
        amount: 200,
        currency: 'ETB',
        payerName: '',
        transactionId: '',
        screenshotUrl: '',
        status: 'approved',
        submittedAt: new Date().toISOString(),
      } as PaymentSubmission];
    }
    return approvedAll;
  }, [targetPlan, approvedAll, plan200Members, plan600Members, plan1000Members, singlePhone, customPhone]);

  // 3. Load Gateway Config & Schedules on Mount
  useEffect(() => {
    fetchGatewayConfig();
    fetchScheduledCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGatewayConfig = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/sms/config', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setGatewayConfig((prev) => ({
            ...prev,
            ...data.config,
            apiKey: data.config.apiKey || prev.apiKey,
          }));
          if (data.config.batchSize) setBatchSize(data.config.batchSize);
          if (data.config.batchDelayMs) setBatchDelayMs(data.config.batchDelayMs);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchScheduledCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const token = getAdminToken();
      const res = await fetch('/api/admin/sms/schedules', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Helper to insert placeholders into textarea cleanly with smart spacing
  const insertPlaceholder = (tag: string) => {
    if (!textareaRef.current) {
      setMessageText((prev) => (prev ? `${prev} ${tag} ` : `${tag} `));
      return;
    }
    const el = textareaRef.current;
    const start = el.selectionStart ?? messageText.length;
    const end = el.selectionEnd ?? messageText.length;

    // Check surrounding characters to avoid squishing tags together
    const prevChar = start > 0 ? messageText[start - 1] : '';
    const nextChar = end < messageText.length ? messageText[end] : '';

    const needLeadingSpace = prevChar && !/\s/.test(prevChar);
    const needTrailingSpace = nextChar && !/\s/.test(nextChar);

    const insertion = `${needLeadingSpace ? ' ' : ''}${tag}${needTrailingSpace ? ' ' : ' '}`;
    const next = messageText.substring(0, start) + insertion + messageText.substring(end);
    setMessageText(next);
    setTimeout(() => {
      el.focus();
      const nextPos = start + insertion.length;
      el.setSelectionRange(nextPos, nextPos);
    }, 50);
  };

  // Template Management Handlers
  const handleOpenNewTemplateModal = (initialText?: string) => {
    setEditingTemplateId(null);
    setModalTitle('');
    setModalTag('Scripture');
    setModalText(initialText ?? (messageText || ''));
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplateModal = (tmpl: SmsCustomTemplate) => {
    setEditingTemplateId(tmpl.id);
    setModalTitle(tmpl.title);
    setModalTag(tmpl.tag);
    setModalText(tmpl.text);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (andUseInComposer = false) => {
    if (!modalTitle.trim()) {
      error('Title Required', 'Please enter a name or label for this sample text.');
      return;
    }
    if (!modalText.trim()) {
      error('Content Required', 'Please enter the message body for this sample text.');
      return;
    }

    if (editingTemplateId) {
      setCustomTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplateId
            ? {
                ...t,
                title: modalTitle.trim(),
                tag: modalTag.trim() || 'Custom',
                text: modalText.trim(),
              }
            : t
        )
      );
      success('Template Updated', `"${modalTitle.trim()}" has been updated.`);
    } else {
      const newTmpl: SmsCustomTemplate = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: modalTitle.trim(),
        tag: modalTag.trim() || 'Custom',
        text: modalText.trim(),
        createdAt: new Date().toISOString(),
      };
      setCustomTemplates((prev) => [newTmpl, ...prev]);
      success('Sample Text Saved', `"${newTmpl.title}" is saved and ready for instant broadcast or schedules.`);
    }

    if (andUseInComposer) {
      setMessageText(modalText.trim());
    }

    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    info('Sample Text Removed', `"${title}" has been deleted.`);
  };

  const handleUseTemplateInSchedule = (tmpl: SmsCustomTemplate) => {
    setMessageText(tmpl.text);
    setCampaignTitle(`${tmpl.title} Campaign`);
    setDispatchMode('schedule');
    success('Loaded for Schedule', `"${tmpl.title}" is ready in the Campaign Scheduler.`);
    const step2El = document.getElementById('step-2-dispatch-mode');
    if (step2El) {
      step2El.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const insertModalPlaceholder = (token: string) => {
    const textarea = modalTextareaRef.current;
    if (!textarea) {
      setModalText((prev) => (prev ? `${prev.trim()} ${token} ` : `${token} `));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prev = modalText;

    const needsSpaceBefore = start > 0 && prev[start - 1] !== ' ' && prev[start - 1] !== '\n';
    const needsSpaceAfter = end < prev.length && prev[end] !== ' ' && prev[end] !== '\n';
    const insertion = `${needsSpaceBefore ? ' ' : ''}${token}${needsSpaceAfter ? ' ' : ' '}`;

    const updated = prev.substring(0, start) + insertion + prev.substring(end);
    setModalText(updated);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + insertion.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  // 4. CHUNKED BATCH DISPATCH ENGINE
  const handleStartBatchDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim()) {
      error('Empty Message', 'Please provide scripture text or message content before sending.');
      return;
    }

    if (activeRecipients.length === 0) {
      error('No Recipients', 'There are no approved numbers matching the selected audience plan.');
      return;
    }

    // Split recipient list into safe chunks
    const safeChunkSize = Math.max(10, Math.min(200, batchSize));
    const chunks: PaymentSubmission[][] = [];
    for (let i = 0; i < activeRecipients.length; i += safeChunkSize) {
      chunks.push(activeRecipients.slice(i, i + safeChunkSize));
    }

    const totalRecipients = activeRecipients.length;
    const totalBatches = chunks.length;

    // Reset loop control flags
    isPausedRef.current = false;
    isCancelledRef.current = false;

    setProgress({
      isDispatching: true,
      totalRecipients,
      totalBatches,
      currentBatch: 0,
      sentCount: 0,
      failedCount: 0,
      statusText: `Preparing ${totalBatches} chunks for ${totalRecipients} subscribers...`,
      isPaused: false,
      startTime: Date.now(),
    });

    const token = getAdminToken();
    let overallSent = 0;
    let overallFailed = 0;
    const newLogs: SmsLogItem[] = [];

    for (let bIndex = 0; bIndex < chunks.length; bIndex++) {
      // Check cancellation
      if (isCancelledRef.current) {
        info('Dispatch Stopped', 'SMS transmission was stopped by administrator.');
        break;
      }

      // Handle pause loop
      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
        if (isCancelledRef.current) break;
      }
      if (isCancelledRef.current) break;

      const currentChunk = chunks[bIndex];
      const batchNumber = bIndex + 1;

      setProgress((prev) => ({
        ...prev,
        currentBatch: batchNumber,
        statusText: `Dispatching Batch ${batchNumber} of ${totalBatches} (${currentChunk.length} numbers)...`,
      }));

      try {
        const res = await fetch('/api/admin/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            recipients: currentChunk.map((r) => ({
              name: r.userName,
              phone: r.userPhone,
              planName: r.planName,
              amount: r.amount,
            })),
            message: messageText,
            batchIndex: batchNumber,
            totalBatches,
            gatewayConfig: {
              ...gatewayConfig,
              batchSize,
              batchDelayMs,
            },
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const sentInBatch = Number(data.sentCount) || currentChunk.length;
          overallSent += sentInBatch;

          // Record logs
          const segments = Math.ceil(messageText.length / 160) || 1;
          for (const recipient of currentChunk) {
            newLogs.unshift({
              id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              recipientPhone: recipient.userPhone,
              recipientName: recipient.userName,
              messageText,
              sentAt: new Date().toISOString(),
              status: 'Delivered',
              segmentCount: segments,
            });
          }
        } else {
          overallFailed += currentChunk.length;
          console.warn(`Batch ${batchNumber} gateway error:`, data.error);
        }
      } catch (err: unknown) {
        overallFailed += currentChunk.length;
        console.error(`Batch ${batchNumber} transmission exception:`, err);
      }

      setProgress((prev) => ({
        ...prev,
        sentCount: overallSent,
        failedCount: overallFailed,
      }));

      // Throttle delay between chunks to protect gateway socket limits
      if (bIndex < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.max(150, batchDelayMs)));
      }
    }

    // Persist logs in state and local storage
    if (newLogs.length > 0) {
      setSmsLogs((prev) => {
        const combined = [...newLogs, ...prev].slice(0, 500);
        if (typeof window !== 'undefined') {
          localStorage.setItem('nazazi_sms_logs', JSON.stringify(combined));
        }
        return combined;
      });
    }

    setProgress((prev) => ({
      ...prev,
      isDispatching: false,
      statusText: `Transmission Completed: ${overallSent} delivered successfully, ${overallFailed} failed.`,
    }));

    if (overallSent > 0) {
      success(
        'Batch SMS Dispatch Complete!',
        `Successfully delivered to ${overallSent} approved members in ${totalBatches} chunks.`
      );
    } else {
      error('Dispatch Incomplete', 'Could not transmit messages through the selected gateway.');
    }
  };

  const handleTogglePause = () => {
    const nextState = !progress.isPaused;
    isPausedRef.current = nextState;
    setProgress((prev) => ({
      ...prev,
      isPaused: nextState,
      statusText: nextState ? 'Transmission paused by user.' : 'Resuming batch transmission...',
    }));
  };

  const handleCancelDispatch = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setProgress((prev) => ({
      ...prev,
      isDispatching: false,
      isPaused: false,
      statusText: 'Transmission cancelled.',
    }));
  };

  // 5. SCHEDULE RECURRING CAMPAIGN CREATION
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      error('Empty Template', 'Please enter scripture or devotional text for the scheduled campaign.');
      return;
    }

    setIsCreatingSchedule(true);
    const token = getAdminToken();

    const planLabel =
      targetPlan === '200'
        ? '200 ETB (Monthly)'
        : targetPlan === '600'
        ? '600 ETB (Quarterly)'
        : targetPlan === '1000'
        ? '1000 ETB (VIP)'
        : 'All Approved';

    const defaultTitle =
      campaignTitle.trim() ||
      `${planLabel} Morning Scripture (${scheduleDuration.replace('_', ' ')})`;

    try {
      const res = await fetch('/api/admin/sms/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: defaultTitle,
          targetPlan,
          targetCount: activeRecipients.length,
          duration: scheduleDuration,
          dailyTime: scheduleDailyTime,
          startDate: scheduleStartDate,
          messageTemplate: messageText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Campaign Scheduled!', data.message || 'Scheduled campaign activated.');
        setCampaignTitle('');
        setActiveSubTab('schedules');
        fetchScheduledCampaigns();
      } else {
        error('Scheduling Failed', data.error || 'Could not schedule campaign.');
      }
    } catch {
      error('Network Error', 'Could not reach server to schedule campaign.');
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  // Campaign Actions (Trigger now, Pause, Delete)
  const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const token = getAdminToken();
    try {
      const res = await fetch('/api/admin/sms/schedules', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus as any } : c)));
        info(`Campaign ${newStatus === 'active' ? 'Resumed' : 'Paused'}`);
      }
    } catch {
      error('Update Failed', 'Could not update campaign status.');
    }
  };

  const handleRunCampaignNow = async (campaign: SmsScheduledCampaign) => {
    const token = getAdminToken();
    try {
      info('Running Broadcast...', `Sending today's scheduled batch for "${campaign.title}"`);
      // Update run counter
      await fetch('/api/admin/sms/schedules', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: campaign.id, runNow: true }),
      });

      // Execute broadcast to matching recipients
      const recipients =
        campaign.targetPlan === '200'
          ? plan200Members
          : campaign.targetPlan === '600'
          ? plan600Members
          : campaign.targetPlan === '1000'
          ? plan1000Members
          : approvedAll;

      await fetch('/api/admin/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipients: recipients.map((r) => ({
            name: r.userName,
            phone: r.userPhone,
            planName: r.planName,
            amount: r.amount,
          })),
          message: campaign.messageTemplate,
          batchIndex: 1,
          totalBatches: 1,
        }),
      });

      success('Broadcast Sent!', `Executed broadcast for ${recipients.length} members.`);
      fetchScheduledCampaigns();
    } catch {
      error('Execution Failed', 'Could not run scheduled campaign now.');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    const token = getAdminToken();
    try {
      const res = await fetch(`/api/admin/sms/schedules?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        success('Campaign Removed', 'Scheduled campaign was deleted successfully.');
      }
    } catch {
      error('Delete Failed', 'Could not remove scheduled campaign.');
    }
  };

  // 6. SAVE GATEWAY SETTINGS
  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGateway(true);
    const token = getAdminToken();

    try {
      const res = await fetch('/api/admin/sms/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          provider: gatewayConfig.provider,
          apiUrl: gatewayConfig.apiUrl,
          apiKey: gatewayConfig.apiKey,
          senderId: gatewayConfig.senderId,
          authHeader: gatewayConfig.authHeader,
          batchSize,
          batchDelayMs,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        success('Gateway Saved', 'SMS API Gateway configuration updated.');
      } else {
        error('Save Failed', data.error || 'Could not save gateway settings.');
      }
    } catch {
      error('Error', 'Could not reach server to save gateway settings.');
    } finally {
      setIsSavingGateway(false);
    }
  };

  // Test Connection
  const handleTestGateway = async () => {
    if (!testPhone.trim()) {
      error('Phone Required', 'Please enter a test phone number (e.g. 0912345678).');
      return;
    }
    setIsTestingGateway(true);
    setTestResult(null);
    const token = getAdminToken();

    try {
      const res = await fetch('/api/admin/sms/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          testPhone: testPhone.trim(),
          testMessage: `Nazazi SMS Gateway Verification: Connected to ${gatewayConfig.senderId || 'NAZAZI'}. Test delivered successfully.`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Success! Test message dispatched via ${data.provider} to ${testPhone}.`,
        });
        success('Connection Verified', `Test SMS dispatched successfully via ${data.provider}.`);
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Gateway returned an error. Check API URL and Key.',
        });
        error('Test Failed', data.error || 'Gateway returned failure.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error during test';
      setTestResult({ success: false, message: msg });
      error('Test Error', msg);
    } finally {
      setIsTestingGateway(false);
    }
  };

  // Unicode-aware character and segment calculator (Amharic uses 70 chars/segment, Latin uses 160 chars)
  const isUnicodeMessage = /[^\u0000-\u00ff]/.test(messageText);
  const charsPerSegment = isUnicodeMessage ? 70 : 160;
  const currentSegmentCount = Math.ceil(messageText.length / charsPerSegment) || 1;
  const charsRemainingInSegment =
    messageText.length === 0
      ? charsPerSegment
      : charsPerSegment - (messageText.length % charsPerSegment || charsPerSegment);

  // Live Phone Preview Formatter
  const previewMessage = useMemo(() => {
    const sampleName =
      targetPlan === 'single' && (singlePhone || customPhone)
        ? approvedAll.find((s) => s.userPhone === (singlePhone || customPhone))?.userName || 'Abebe Kebede'
        : 'Abebe Kebede';
    const sampleDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return (
      messageText
        .replace(/{name}/g, sampleName)
        .replace(/{date}/g, sampleDate) || 'Good morning! Nazazi blessing...'
    );
  }, [messageText, targetPlan, singlePhone, customPhone, approvedAll]);

  const dispatchPercentage =
    progress.totalRecipients > 0
      ? Math.round(((progress.sentCount + progress.failedCount) / progress.totalRecipients) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Clean Sub-Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('dispatcher')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'dispatcher'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose SMS</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('schedules')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'schedules'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled Campaigns</span>
            {campaigns.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                {campaigns.filter((c) => c.status === 'active').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('gateway')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'gateway'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Gateway Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Logs</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-100 dark:bg-zinc-800 font-mono">
              {smsLogs.length}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Gateway Ready ({gatewayConfig.provider === 'generic_http' ? 'Custom API' : gatewayConfig.provider})</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: BULK DISPATCHER & SCHEDULER */}
      {/* ========================================================================= */}
      {activeSubTab === 'dispatcher' && (
        <div className="space-y-6">
          {/* Real-Time Live Dispatch Progress Card (When Active) */}
          {progress.isDispatching && (
            <Card className="p-6 bg-zinc-900 text-zinc-50 dark:bg-zinc-950 border-zinc-800 shadow-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                      Live Chunked SMS Transmission
                    </h3>
                    <Badge variant="emerald" className="text-[10px]">
                      Batch {progress.currentBatch} of {progress.totalBatches}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">{progress.statusText}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleTogglePause}
                    className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-xs"
                    leftIcon={progress.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  >
                    {progress.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={handleCancelDispatch}
                    className="text-xs"
                    leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                  <span>
                    Delivered: <strong>{progress.sentCount}</strong> / {progress.totalRecipients}
                  </span>
                  <span>{dispatchPercentage}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden p-0.5 border border-zinc-700/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(3, dispatchPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80 text-center">
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">Current Batch</p>
                  <p className="text-sm font-bold text-zinc-100">
                    {progress.currentBatch} / {progress.totalBatches}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-[10px] text-emerald-400 uppercase font-semibold">Sent Successfully</p>
                  <p className="text-sm font-bold text-emerald-400">{progress.sentCount}</p>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-[10px] text-red-400 uppercase font-semibold">Failed / Dropped</p>
                  <p className="text-sm font-bold text-red-400">{progress.failedCount}</p>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <p className="text-[10px] text-zinc-400 uppercase font-semibold">Batch Chunk Size</p>
                  <p className="text-sm font-bold text-zinc-100">{batchSize} / req</p>
                </div>
              </div>
            </Card>
          )}

          {/* Main Visibly Clear & Recognizable SMS Composer */}
          <div className="space-y-6">
            {/* ========================================================================= */}
            {/* STEP 1: CHOOSE PLAN & TARGET AUDIENCE */}
            {/* ========================================================================= */}
            <Card className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Step 1. Choose Plan & Target Audience
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Select which subscription tier to send the morning scripture or spiritual message to.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                    activeRecipients.length > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activeRecipients.length > 0 ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    {activeRecipients.length} {activeRecipients.length === 1 ? 'Recipient' : 'Recipients'} Selected
                  </span>
                </div>
              </div>

              {/* 4 Recognizable Tier Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 200 ETB Plan Card */}
                <button
                  type="button"
                  onClick={() => setTargetPlan('200')}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    targetPlan === '200'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-400 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    {targetPlan === '200' ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                        Tier 1
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      200 ETB Plan
                    </h3>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {plan200Members.length} Members
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      Standard 30-Day Morning Scripture & Faith Text
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded">
                      Daily Morning Cycle
                    </span>
                  </div>
                </button>

                {/* 600 ETB Plan Card */}
                <button
                  type="button"
                  onClick={() => setTargetPlan('600')}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    targetPlan === '600'
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Heart className="w-5 h-5" />
                    </div>
                    {targetPlan === '600' ? (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                        Tier 2
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      600 ETB Plan
                    </h3>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {plan600Members.length} Members
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      Quarterly 90-Day Full Devotional & Prayer Path
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                      3 Months Active
                    </span>
                  </div>
                </button>

                {/* 1,000 ETB VIP Card */}
                <button
                  type="button"
                  onClick={() => setTargetPlan('1000')}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    targetPlan === '1000'
                      ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 dark:border-amber-400 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Crown className="w-5 h-5" />
                    </div>
                    {targetPlan === '1000' ? (
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                        Tier 3 VIP
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      1,000 ETB VIP
                    </h3>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {plan1000Members.length} Members
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      VIP 6-Month Comprehensive Guidance & Teachings
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                      Semi-Annual VIP
                    </span>
                  </div>
                </button>

                {/* All Approved Members Card */}
                <button
                  type="button"
                  onClick={() => setTargetPlan('all')}
                  className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    targetPlan === 'all'
                      ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 dark:border-purple-400 shadow-md ring-2 ring-purple-500/20'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    {targetPlan === 'all' ? (
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                        Broadcast
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                      All Approved
                    </h3>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                      {approvedAll.length} Total
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                      Broadcast to every verified member across all tiers
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/40 px-2 py-0.5 rounded">
                      Complete Roster
                    </span>
                  </div>
                </button>
              </div>

              {/* Single Member Direct Option */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTargetPlan('single')}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                    targetPlan === 'single'
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                      : 'border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-bold">Or send to a single specific member phone</span>
                  </div>
                  <span className="text-[11px] font-medium text-zinc-500">
                    {targetPlan === 'single' ? 'Selected' : 'Click to choose'}
                  </span>
                </button>

                {targetPlan === 'single' && (
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Choose Approved Member ({approvedAll.length})
                      </label>
                      <select
                        value={singlePhone}
                        onChange={(e) => {
                          setSinglePhone(e.target.value);
                          setCustomPhone('');
                        }}
                        className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                      >
                        <option value="">-- Choose Member ({approvedAll.length}) --</option>
                        {approvedAll.map((sub) => (
                          <option key={sub.id} value={sub.userPhone}>
                            {sub.userName} ({sub.userPhone}) — {sub.planName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Or Type Direct Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="0911223344 or +251911223344"
                        value={customPhone}
                        onChange={(e) => {
                          setCustomPhone(e.target.value);
                          setSinglePhone('');
                        }}
                        className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* ========================================================================= */}
            {/* STEP 2: DISPATCH MODE */}
            {/* ========================================================================= */}
            <Card id="step-2-dispatch-mode" className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Step 2. Dispatch Mode
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Choose whether to broadcast right now in safe batches or automate a daily recurring campaign.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Instant Mode Card */}
                <button
                  type="button"
                  onClick={() => setDispatchMode('instant')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    dispatchMode === 'instant'
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        Instant Chunked Dispatch
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        Right Now
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Transmits immediately in small chunks ({batchSize} per batch) with real-time progress.
                    </p>
                  </div>
                </button>

                {/* Scheduled Mode Card */}
                <button
                  type="button"
                  onClick={() => setDispatchMode('schedule')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                    dispatchMode === 'schedule'
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        Schedule Recurring Campaign
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        Automated
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Schedule daily morning scripture broadcasts for 1 Week, 3 Weeks, or 1 Month (30 Days).
                    </p>
                  </div>
                </button>
              </div>

              {/* Scheduled Configuration Controls */}
              {dispatchMode === 'schedule' && (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Campaign Duration
                      </label>
                      <select
                        value={scheduleDuration}
                        onChange={(e) => setScheduleDuration(e.target.value as any)}
                        className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="1_week">1 Week (7 Days)</option>
                        <option value="3_weeks">3 Weeks (21 Days)</option>
                        <option value="1_month">1 Month (30 Days - Recommended)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Daily Morning Send Time
                      </label>
                      <input
                        type="time"
                        value={scheduleDailyTime}
                        onChange={(e) => setScheduleDailyTime(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={scheduleStartDate}
                        onChange={(e) => setScheduleStartDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Campaign Title (Internal Reference)
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. 30-Day Morning Scripture for ${targetPlan === 'all' ? 'All Members' : `${targetPlan} ETB Tier`}`}
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Quick-Load from Saved Sample Texts for Schedule */}
                  {customTemplates.length > 0 ? (
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Use Saved Sample Text for this Schedule:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenNewTemplateModal()}
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Create New Sample</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {customTemplates.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => {
                              setMessageText(tmpl.text);
                              if (!campaignTitle) setCampaignTitle(`${tmpl.title} Campaign`);
                              success('Template Loaded', `"${tmpl.title}" selected for this scheduled campaign.`);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              messageText === tmpl.text
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span>{tmpl.title}</span>
                            <span className="text-[10px] opacity-75 font-normal">({tmpl.tag})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Tip: You can save your favorite sample texts to quickly schedule repeating campaigns anytime.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenNewTemplateModal()}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Sample Text</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* ========================================================================= */}
            {/* STEP 3: MESSAGE CONTENT & DYNAMIC VARIABLES + LIVE PHONE PREVIEW */}
            {/* ========================================================================= */}
            <Card className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Step 3. Message Content & Dynamic Variables
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Craft or select an inspired faith message. Real-time preview renders dynamic tags automatically.
                  </p>
                </div>
              </div>

              {/* 2-Column Responsive Layout: Left Composer, Right Phone Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Composer (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Saved Sample Texts & Custom Samples */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="block text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          Sample Texts & Templates:
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {customTemplates.length === 0
                            ? 'Create your own sample texts to use for instant broadcasts or recurring schedules.'
                            : 'Select a sample text below to load it into the composer or campaign scheduler.'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {messageText.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenNewTemplateModal(messageText)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1"
                            title="Save current message as a reusable sample"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Save Draft as Sample</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenNewTemplateModal()}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Sample Text</span>
                        </button>
                      </div>
                    </div>

                    {customTemplates.length === 0 ? (
                      <div className="p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 text-center space-y-2">
                        <div className="w-8 h-8 mx-auto rounded-xl bg-zinc-200/70 dark:bg-zinc-700/60 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            No sample texts saved yet
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                            Add scriptures, devotional greetings, or announcements with dynamic placeholders like &#123;name&#125; and &#123;date&#125; to reuse in instant and scheduled campaigns.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenNewTemplateModal()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Sample Text</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {customTemplates.map((tmpl) => {
                          const isSelected = messageText === tmpl.text;
                          return (
                            <div
                              key={tmpl.id}
                              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600 shadow-xs'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 bg-zinc-50/60 dark:bg-zinc-800/40'
                              }`}
                            >
                              <div
                                onClick={() => setMessageText(tmpl.text)}
                                className="cursor-pointer group"
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                                    {tmpl.title}
                                  </span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0">
                                    {tmpl.tag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                                  {tmpl.text}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-2 mt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                                <button
                                  type="button"
                                  onClick={() => setMessageText(tmpl.text)}
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                  }`}
                                >
                                  {isSelected ? 'In Composer' : 'Use in SMS'}
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUseTemplateInSchedule(tmpl)}
                                    title="Use this sample for a scheduled campaign"
                                    className="p-1 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTemplateModal(tmpl)}
                                    title="Edit sample text"
                                    className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 cursor-pointer transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                                    title="Delete sample text"
                                    className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Personalization Tag Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Personalize:
                      </span>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('{name}')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        + Name
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('{date}')}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 text-blue-800 dark:text-blue-300 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        + Date
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {customTemplates.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setMessageText(customTemplates[0].text)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1"
                          title="Reset to first saved sample text"
                        >
                          <RotateCcw className="w-3 h-3" />
                          First Sample
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setMessageText('')}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        title="Clear message"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="space-y-1.5">
                    <textarea
                      ref={textareaRef}
                      rows={5}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message, morning scripture, or encouragement here (or choose/create a sample text above)..."
                      className="w-full p-3.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:outline-hidden resize-none leading-relaxed"
                    />

                    {/* Character & SMS Part Status Bar */}
                    <div className="flex flex-wrap items-center justify-between text-xs px-1 text-zinc-500 dark:text-zinc-400 gap-2">
                      <div className="flex items-center gap-2">
                        <span>Include greetings and encouragement</span>
                        {isUnicodeMessage && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                            Amharic / Unicode (70 chars/part)
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-right font-bold text-zinc-800 dark:text-zinc-200">
                        {messageText.length} chars • {currentSegmentCount} SMS {currentSegmentCount === 1 ? 'part' : 'parts'}
                        <span className="text-[11px] text-zinc-400 ml-1 font-normal">
                          ({charsRemainingInSegment} chars left in part)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Authentic Mobile SMS Preview (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div className="rounded-3xl border-4 border-zinc-800 dark:border-zinc-700 bg-zinc-950 p-3.5 shadow-xl space-y-3">
                    {/* Phone Status Bar */}
                    <div className="flex items-center justify-between px-3 pt-1 text-[11px] font-mono text-zinc-400">
                      <span>06:30 AM</span>
                      <div className="w-16 h-3 bg-zinc-800 rounded-full mx-auto" />
                      <span>4G LTE 100%</span>
                    </div>

                    {/* Phone App Header */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                          N
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">NAZAZI SMS</p>
                          <p className="text-[10px] text-zinc-400">Official Sender ID</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono">
                        Verified
                      </span>
                    </div>

                    {/* Live SMS Bubble */}
                    <div className="min-h-[140px] p-3 rounded-2xl bg-zinc-900/90 flex flex-col justify-end space-y-2">
                      <div className="text-center text-[10px] text-zinc-500 font-mono">
                        Today • Ethio Telecom / Safaricom
                      </div>

                      <div className="self-start max-w-[90%] p-3.5 rounded-2xl rounded-tl-sm bg-emerald-700 text-white text-xs leading-relaxed shadow-md space-y-1.5">
                        <p className="font-sans whitespace-pre-wrap">{previewMessage}</p>
                        <div className="text-[9px] text-emerald-200 text-right font-mono flex items-center justify-end gap-1">
                          <span>06:30 AM</span>
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    {/* Phone Footer Info */}
                    <div className="px-2 pt-1 pb-1 text-center">
                      <p className="text-[10px] text-zinc-500">
                        {`{name} dynamically becomes recipient's actual registered name`}
                      </p>
                    </div>
                  </div>

                  {/* Summary Box under Preview */}
                  <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Target Audience:</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {targetPlan === 'all'
                          ? 'All Verified Members'
                          : targetPlan === 'single'
                          ? 'Single Recipient'
                          : `${targetPlan} ETB Plan`}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                      <span>Recipients:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {activeRecipients.length} members
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ========================================================================= */}
            {/* STEP 4: CHUNKING ENGINE & PRIMARY ACTION */}
            {/* ========================================================================= */}
            <Card className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Step 4. Chunking Engine (Protects Gateway from Timeouts & Drops)
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Math: {activeRecipients.length} recipients ÷ {batchSize} = {Math.ceil((activeRecipients.length || 1) / batchSize)} {Math.ceil((activeRecipients.length || 1) / batchSize) === 1 ? 'batch' : 'batches'}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 font-mono">
                  Delay: {batchDelayMs}ms between batches
                </div>
              </div>

              {/* 4 Chunk Options */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { size: 25, label: 'Safest', desc: 'Minimal socket load' },
                  { size: 50, label: '★ Recommended', desc: 'Optimal speed & stability' },
                  { size: 100, label: 'Fast', desc: 'For high-rate gateways' },
                  { size: 200, label: 'Fast', desc: 'Bulk throughput' },
                ].map(({ size, label, desc }) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBatchSize(size)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      batchSize === size
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-sm ring-2 ring-zinc-900/20'
                        : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <p className="font-extrabold text-sm">{size} per batch</p>
                    <p className="text-xs font-semibold mt-0.5 opacity-90">{label}</p>
                    <p className="text-[10px] opacity-70 mt-1">{desc}</p>
                  </button>
                ))}
              </div>

              {/* Primary Action Button */}
              <div className="pt-2">
                {dispatchMode === 'instant' ? (
                  <Button
                    type="button"
                    size="lg"
                    isLoading={progress.isDispatching}
                    onClick={handleStartBatchDispatch}
                    disabled={activeRecipients.length === 0}
                    className="w-full font-extrabold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-2xl py-3.5 text-sm shadow-md cursor-pointer disabled:opacity-50"
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Send Message to {activeRecipients.length} {activeRecipients.length === 1 ? 'Recipient' : 'Recipients'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    isLoading={isCreatingSchedule}
                    onClick={handleCreateSchedule}
                    disabled={activeRecipients.length === 0}
                    className="w-full font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 rounded-2xl py-3.5 text-sm shadow-md cursor-pointer disabled:opacity-50"
                    leftIcon={<Calendar className="w-4 h-4" />}
                  >
                    Schedule Daily Campaign for {activeRecipients.length} {activeRecipients.length === 1 ? 'Member' : 'Members'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: SCHEDULED CAMPAIGNS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedules' && (
        <Card className="p-6 space-y-6 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Active & Scheduled SMS Campaigns
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Manage recurring daily morning broadcasts for 1-Week, 3-Week, and 1-Month subscriber cycles.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleOpenNewTemplateModal()}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Sample Text
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setActiveSubTab('dispatcher');
                  setDispatchMode('schedule');
                }}
                leftIcon={<Clock className="w-3.5 h-3.5" />}
              >
                New Scheduled Campaign
              </Button>
            </div>
          </div>

          {isLoadingCampaigns ? (
            <div className="py-12 text-center text-xs text-zinc-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
              <p>Loading scheduled campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-14 text-center text-xs text-zinc-400 space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                  No Scheduled SMS Campaigns Active
                </p>
                <p className="max-w-md mx-auto">
                  Set up a recurring morning scripture broadcast for your 200 Birr subscribers (30 Days), 600 Birr subscribers, or 1000 Birr subscribers.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setActiveSubTab('dispatcher');
                  setDispatchMode('schedule');
                }}
              >
                Schedule First 30-Day Campaign
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 space-y-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{camp.title}</h3>
                        <Badge
                          variant={camp.status === 'active' ? 'emerald' : camp.status === 'paused' ? 'amber' : 'zinc'}
                        >
                          {camp.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 flex items-center gap-2">
                        <span>Target: <strong>{camp.targetPlan === 'all' ? 'All Members' : `${camp.targetPlan} ETB Plan`}</strong></span>
                        <span>•</span>
                        <span>{camp.targetCount || approvedCount} Recipients</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                        className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 cursor-pointer"
                        title={camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                      >
                        {camp.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message Snippet */}
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans line-clamp-2">
                    &ldquo;{camp.messageTemplate}&rdquo;
                  </div>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                      <p className="text-zinc-400">Duration</p>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {camp.duration === '1_week' ? '7 Days' : camp.duration === '3_weeks' ? '21 Days' : '30 Days'}
                      </p>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                      <p className="text-zinc-400">Time</p>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{camp.dailyTime} AM</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                      <p className="text-zinc-400">Progress</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Day {camp.runsCompleted} / {camp.totalRuns}
                      </p>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-xs">
                    <span className="text-[11px] text-zinc-400">
                      Next: {new Date(camp.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(camp.nextRunAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunCampaignNow(camp)}
                      className="text-xs"
                      leftIcon={<Play className="w-3 h-3" />}
                    >
                      Trigger Run Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PAID SMS GATEWAY INTEGRATION SETTINGS */}
      {/* ========================================================================= */}
      {activeSubTab === 'gateway' && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="space-y-1 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950">
                  <Settings className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                    Paid SMS API Gateway Integration
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Connect your paid SMS service (Generic REST API, SMS Ethio, Twilio, Africa&apos;s Talking, or custom gateway).
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveGateway} className="space-y-5">
              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  1. SMS Gateway Provider
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div
                    onClick={() => setGatewayConfig((p) => ({ ...p, provider: 'generic_http' }))}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      gatewayConfig.provider === 'generic_http'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Generic REST API (Custom)</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Compatible with any SMS provider via HTTP POST</p>
                  </div>

                  <div
                    onClick={() => setGatewayConfig((p) => ({ ...p, provider: 'africas_talking' }))}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      gatewayConfig.provider === 'africas_talking'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Africa&apos;s Talking</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Pan-African telecom SMS provider</p>
                  </div>

                  <div
                    onClick={() => setGatewayConfig((p) => ({ ...p, provider: 'twilio' }))}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      gatewayConfig.provider === 'twilio'
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Twilio SMS</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Global SMS & Programmable Messaging</p>
                  </div>
                </div>
              </div>

              {/* Endpoint URL & Sender ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Gateway API Endpoint URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.sms-gateway.com/v1/send"
                    value={gatewayConfig.apiUrl}
                    onChange={(e) => setGatewayConfig((p) => ({ ...p, apiUrl: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                  />
                  <p className="text-[10px] text-zinc-400">HTTP POST endpoint provided by your telecom/SMS partner</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Sender ID / Mask
                  </label>
                  <input
                    type="text"
                    placeholder="NAZAZI"
                    value={gatewayConfig.senderId}
                    onChange={(e) => setGatewayConfig((p) => ({ ...p, senderId: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-bold"
                  />
                  <p className="text-[10px] text-zinc-400">Name shown as the SMS sender on subscriber phones</p>
                </div>
              </div>

              {/* API Key / Token & Auth Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    API Secret Key / Bearer Token
                  </label>
                  <div className="relative">
                    <input
                      type={isApiKeyVisible ? 'text' : 'password'}
                      placeholder="sk_live_..."
                      value={gatewayConfig.apiKey}
                      onChange={(e) => setGatewayConfig((p) => ({ ...p, apiKey: e.target.value }))}
                      className="w-full p-3 pr-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {isApiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400">Encrypted server-side; never exposed to public browsers</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Authorization Header Format
                  </label>
                  <select
                    value={gatewayConfig.authHeader}
                    onChange={(e) => setGatewayConfig((p) => ({ ...p, authHeader: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
                  >
                    <option value="Bearer">Bearer Token (Authorization: Bearer {'<key>'})</option>
                    <option value="Basic">Basic Auth (Authorization: Basic {'<key>'})</option>
                    <option value="X-API-KEY">Header: X-API-KEY</option>
                    <option value="api-key">Header: api-key</option>
                  </select>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="submit"
                  size="md"
                  isLoading={isSavingGateway}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Save Gateway Credentials
                </Button>
              </div>
            </form>

            {/* Test Connection Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-3">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-500" />
                Test Gateway Connection with Real Phone Number
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Send a single verification ping to ensure your paid API credentials, sender ID, and format are configured properly before triggering bulk dispatches.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="tel"
                  placeholder="Enter your phone (e.g. 0911223344)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full sm:w-80 p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={isTestingGateway}
                  onClick={handleTestGateway}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Dispatch Test SMS
                </Button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: DELIVERY HISTORY & AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeSubTab === 'logs' && (
        <Card className="p-4 sm:p-6 space-y-4 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <History className="w-4 h-4" />
                SMS Dispatch History & Delivery Audit
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Full delivery audit log of all batch transmissions and encouragement broadcasts.
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
                {smsLogs.slice(0, 100).map((log) => (
                  <div
                    key={`m-log-${log.id}`}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{log.recipientName}</p>
                        <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">{log.recipientPhone}</p>
                      </div>
                      <Badge variant={log.status === 'Delivered' ? 'emerald' : 'zinc'}>{log.status}</Badge>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 italic">
                      &ldquo;{log.messageText}&rdquo;
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-1.5">
                      <span>{new Date(log.sentAt).toLocaleString()}</span>
                      <span>{log.segmentCount} SMS Segment(s)</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 font-bold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-3.5 pl-4">Recipient</th>
                      <th className="p-3.5">Phone Number</th>
                      <th className="p-3.5">Message Content</th>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Segments</th>
                      <th className="p-3.5 pr-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {smsLogs.slice(0, 100).map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                        <td className="p-3.5 pl-4 font-bold text-zinc-900 dark:text-zinc-100">
                          {log.recipientName}
                        </td>
                        <td className="p-3.5 font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                          {log.recipientPhone}
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-zinc-600 dark:text-zinc-400">
                          {log.messageText}
                        </td>
                        <td className="p-3.5 text-zinc-500 whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3.5 font-mono text-zinc-500">{log.segmentCount}</td>
                        <td className="p-3.5 pr-4 text-right">
                          <Badge variant={log.status === 'Delivered' ? 'emerald' : 'zinc'}>
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

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CUSTOM SAMPLE TEXT */}
      {/* ========================================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {editingTemplateId ? 'Edit Sample Text' : 'Create Custom Sample Text'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Save reusable scriptures and messages for broadcasts and schedules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Template Title *
                  </label>
                  <input
                    type="text"
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Morning Grace, Psalm 23"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={modalTag}
                    onChange={(e) => setModalTag(e.target.value)}
                    placeholder="e.g. Scripture, Devotional"
                    className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Personalization Quick Insert */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Insert Variables:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => insertModalPlaceholder('{name}')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer transition-colors"
                  >
                    + &#123;name&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertModalPlaceholder('{date}')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer transition-colors"
                  >
                    + &#123;date&#125;
                  </button>
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Message Content *
                </label>
                <textarea
                  ref={modalTextareaRef}
                  rows={4}
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder="Write your custom sample text here. E.g. Good morning {name}! May God bless your work today..."
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden leading-relaxed resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Dynamic tokens are auto-replaced during send.</span>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{modalText.length} chars</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsTemplateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSaveTemplate(false)}
              >
                Save Sample
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSaveTemplate(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save & Use Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
