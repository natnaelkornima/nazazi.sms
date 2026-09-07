import fs from 'fs';
import path from 'path';
import { SmsGatewayConfig, SmsScheduledCampaign, SmsTargetPlan, SmsScheduleDuration } from '../types';

const PRIMARY_DATA_DIR = path.join(process.cwd(), '.data');
const PRIMARY_CONFIG_FILE = path.join(PRIMARY_DATA_DIR, 'nazazi_sms_config.json');
const TMP_CONFIG_FILE = '/tmp/nazazi_sms_config.json';

const PRIMARY_SCHEDULES_FILE = path.join(PRIMARY_DATA_DIR, 'nazazi_sms_schedules.json');
const TMP_SCHEDULES_FILE = '/tmp/nazazi_sms_schedules.json';

const DEFAULT_CONFIG: SmsGatewayConfig = {
  provider: (process.env.SMS_PROVIDER as SmsGatewayConfig['provider']) || 'generic_http',
  apiUrl: process.env.SMS_API_URL || '',
  apiKey: process.env.SMS_API_KEY || '',
  senderId: process.env.SMS_SENDER_ID || 'NAZAZI',
  authHeader: 'Bearer',
  batchSize: 50,
  batchDelayMs: 500,
};

/**
 * Standardizes Ethiopian and International phone numbers for SMS gateway dispatches
 */
export function formatPhoneNumberForSms(phone: string, style: 'e164' | 'digits' | 'local' = 'e164'): string {
  if (!phone) return '';
  const digits = phone.trim().replace(/\D/g, '');

  let e164 = '';
  if (digits.startsWith('251') && digits.length >= 12) {
    e164 = `+${digits}`;
  } else if (digits.startsWith('0') && (digits.startsWith('09') || digits.startsWith('07')) && digits.length === 10) {
    e164 = `+251${digits.substring(1)}`;
  } else if ((digits.startsWith('9') || digits.startsWith('7')) && digits.length === 9) {
    e164 = `+251${digits}`;
  } else if (digits.length >= 9) {
    e164 = `+${digits}`;
  } else {
    e164 = phone.trim();
  }

  if (style === 'digits') {
    return e164.replace(/\D/g, '');
  }
  if (style === 'local') {
    const raw = e164.replace(/\D/g, '');
    if (raw.startsWith('251') && raw.length >= 12) {
      return `0${raw.substring(3)}`;
    }
    return phone;
  }

  return e164;
}

/**
 * Replaces placeholders like {name}, {plan}, {amount}, {date} with subscriber details
 */
export function interpolateSmsTemplate(
  template: string,
  recipient: { name?: string; phone?: string; planName?: string; amount?: number }
): string {
  if (!template) return '';
  const todayStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return template
    .replace(/\{name\}/gi, recipient.name?.trim() || 'Valued Member')
    .replace(/\{phone\}/gi, recipient.phone?.trim() || '')
    .replace(/\{plan\}/gi, recipient.planName?.trim() || 'Daily Devotional')
    .replace(/\{amount\}/gi, recipient.amount ? `${recipient.amount} ETB` : '200 ETB')
    .replace(/\{date\}/gi, todayStr);
}

function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

/**
 * Loads current SMS Gateway configuration
 */
export function getSmsGatewayConfig(): SmsGatewayConfig {
  const candidateFiles = [PRIMARY_CONFIG_FILE, TMP_CONFIG_FILE];
  for (const f of candidateFiles) {
    try {
      if (fs.existsSync(f)) {
        const raw = fs.readFileSync(f, 'utf-8');
        const parsed = safeJsonParse<Partial<SmsGatewayConfig>>(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_CONFIG,
            ...parsed,
            // Fallback to env vars if file values are blank
            apiUrl: parsed.apiUrl || process.env.SMS_API_URL || '',
            apiKey: parsed.apiKey || process.env.SMS_API_KEY || '',
            senderId: parsed.senderId || process.env.SMS_SENDER_ID || 'NAZAZI',
            provider: parsed.provider || (process.env.SMS_PROVIDER as SmsGatewayConfig['provider']) || 'generic_http',
          };
        }
      }
    } catch {
      // try next
    }
  }

  return { ...DEFAULT_CONFIG };
}

/**
 * Saves SMS Gateway configuration to disk
 */
export function saveSmsGatewayConfig(config: Partial<SmsGatewayConfig>): SmsGatewayConfig {
  const current = getSmsGatewayConfig();
  const updated: SmsGatewayConfig = {
    ...current,
    ...config,
    batchSize: Math.max(10, Math.min(500, config.batchSize || current.batchSize || 50)),
    batchDelayMs: Math.max(100, Math.min(5000, config.batchDelayMs || current.batchDelayMs || 500)),
  };

  const jsonStr = JSON.stringify(updated, null, 2);

  try {
    if (!fs.existsSync(PRIMARY_DATA_DIR)) {
      fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_CONFIG_FILE, jsonStr, 'utf-8');
  } catch {
    // try fallback
  }

  try {
    fs.writeFileSync(TMP_CONFIG_FILE, jsonStr, 'utf-8');
  } catch {
    // ignore
  }

  return updated;
}

export interface BatchRecipient {
  name: string;
  phone: string;
  planName?: string;
  amount?: number;
}

export interface SmsSendResultItem {
  phone: string;
  name: string;
  status: 'Delivered' | 'Failed';
  messageId?: string;
  error?: string;
}

/**
 * Dispatches a single batch of SMS messages to the configured external Paid Gateway or Simulation
 */
export async function sendSmsBatch(
  recipients: BatchRecipient[],
  messageTemplate: string,
  configOverride?: Partial<SmsGatewayConfig>
): Promise<{
  success: boolean;
  provider: string;
  sentCount: number;
  failedCount: number;
  results: SmsSendResultItem[];
  error?: string;
}> {
  const config = {
    ...getSmsGatewayConfig(),
    ...(configOverride || {}),
  };

  if (!recipients || recipients.length === 0) {
    return {
      success: true,
      provider: config.provider,
      sentCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  // Check if credentials are present for live transmission
  const hasRealApi = Boolean(config.apiUrl && config.apiUrl.startsWith('http'));

  // 1. Live Paid HTTP REST API Dispatch
  if (hasRealApi && config.provider !== 'simulation') {
    try {
      const formattedRecipients = recipients.map((r) => ({
        name: r.name,
        phone: formatPhoneNumberForSms(r.phone, 'e164'),
        localPhone: formatPhoneNumberForSms(r.phone, 'local'),
        digitsPhone: formatPhoneNumberForSms(r.phone, 'digits'),
        message: interpolateSmsTemplate(messageTemplate, r),
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (config.apiKey) {
        if (config.authHeader === 'Bearer') {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        } else if (config.authHeader === 'Basic') {
          headers['Authorization'] = `Basic ${config.apiKey}`;
        } else {
          headers[config.authHeader || 'X-API-KEY'] = config.apiKey;
        }
      }

      // Universal payload format compatible with modern SMS aggregators and gateways
      const payload = {
        sender: config.senderId || 'NAZAZI',
        from: config.senderId || 'NAZAZI',
        recipients: formattedRecipients.map((r) => r.phone),
        to: formattedRecipients.map((r) => r.phone),
        message: messageTemplate,
        messages: formattedRecipients.map((r) => ({
          to: r.phone,
          text: r.message,
        })),
        batchSize: recipients.length,
        timestamp: new Date().toISOString(),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`SMS Gateway returned error HTTP ${response.status}:`, errorText);
        // Return partial or marked failure with clear description
        return {
          success: false,
          provider: config.provider,
          sentCount: 0,
          failedCount: recipients.length,
          error: `Gateway Error (HTTP ${response.status}): ${errorText.substring(0, 150) || response.statusText}`,
          results: recipients.map((r) => ({
            phone: r.phone,
            name: r.name,
            status: 'Failed',
            error: `HTTP ${response.status}`,
          })),
        };
      }

      const responseData = await response.json().catch(() => ({}));

      return {
        success: true,
        provider: config.provider,
        sentCount: recipients.length,
        failedCount: 0,
        results: recipients.map((r, i) => ({
          phone: r.phone,
          name: r.name,
          status: 'Delivered',
          messageId: `gw_${Date.now()}_${i}`,
        })),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network failure during SMS transmission';
      console.error('Paid SMS Gateway Dispatch Exception:', errMsg);
      return {
        success: false,
        provider: config.provider,
        sentCount: 0,
        failedCount: recipients.length,
        error: errMsg,
        results: recipients.map((r) => ({
          phone: r.phone,
          name: r.name,
          status: 'Failed',
          error: errMsg,
        })),
      };
    }
  }

  // 2. High-Performance Seamless Simulation Mode (when API is not yet configured or testing)
  // Ensures test dispatches of 1500 numbers complete smoothly in small chunks with real latency
  await new Promise((resolve) => setTimeout(resolve, Math.min(250, config.batchDelayMs || 250)));

  return {
    success: true,
    provider: 'simulation',
    sentCount: recipients.length,
    failedCount: 0,
    results: recipients.map((r, i) => ({
      phone: r.phone,
      name: r.name,
      status: 'Delivered',
      messageId: `sim_${Date.now()}_${i}`,
    })),
  };
}

/**
 * Reads all scheduled recurring SMS campaigns from disk
 */
export function getScheduledCampaigns(): SmsScheduledCampaign[] {
  const candidateFiles = [PRIMARY_SCHEDULES_FILE, TMP_SCHEDULES_FILE];
  for (const f of candidateFiles) {
    try {
      if (fs.existsSync(f)) {
        const raw = fs.readFileSync(f, 'utf-8');
        const parsed = safeJsonParse<SmsScheduledCampaign[]>(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // try next
    }
  }
  return [];
}

/**
 * Saves all scheduled recurring SMS campaigns to disk
 */
export function saveScheduledCampaigns(campaigns: SmsScheduledCampaign[]) {
  const jsonStr = JSON.stringify(campaigns, null, 2);
  try {
    if (!fs.existsSync(PRIMARY_DATA_DIR)) {
      fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_SCHEDULES_FILE, jsonStr, 'utf-8');
  } catch {
    // ignore
  }

  try {
    fs.writeFileSync(TMP_SCHEDULES_FILE, jsonStr, 'utf-8');
  } catch {
    // ignore
  }
}

/**
 * Creates a new scheduled campaign (e.g. 1 week, 3 weeks, 1 month)
 */
export function createScheduledCampaign(data: {
  title: string;
  targetPlan: SmsTargetPlan;
  targetCount: number;
  duration: SmsScheduleDuration;
  dailyTime?: string;
  startDate?: string;
  messageTemplate: string;
}): SmsScheduledCampaign {
  const now = new Date();
  const startDate = data.startDate ? new Date(data.startDate) : now;
  const dailyTime = data.dailyTime || '07:00'; // Default 7:00 AM Morning Scripture

  let totalRuns = 30;
  let durationDays = 30;

  if (data.duration === '1_week') {
    totalRuns = 7;
    durationDays = 7;
  } else if (data.duration === '3_weeks') {
    totalRuns = 21;
    durationDays = 21;
  } else if (data.duration === '1_month') {
    totalRuns = 30;
    durationDays = 30;
  }

  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Compute next run ISO timestamp
  const [hours, minutes] = dailyTime.split(':').map((n) => parseInt(n, 10) || 0);
  const nextRun = new Date(startDate);
  nextRun.setHours(hours, minutes, 0, 0);
  if (nextRun.getTime() <= now.getTime()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const newCampaign: SmsScheduledCampaign = {
    id: `camp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    title: data.title.trim() || `Morning Faith SMS (${data.duration.replace('_', ' ')})`,
    targetPlan: data.targetPlan,
    targetCount: data.targetCount,
    duration: data.duration,
    dailyTime,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    messageTemplate: data.messageTemplate,
    status: 'active',
    runsCompleted: 0,
    totalRuns,
    createdAt: now.toISOString(),
    lastRunAt: null,
    nextRunAt: nextRun.toISOString(),
  };

  const existing = getScheduledCampaigns();
  const updated = [newCampaign, ...existing];
  saveScheduledCampaigns(updated);

  return newCampaign;
}

/**
 * Updates a scheduled campaign status (e.g. pause, resume, increment run)
 */
export function updateScheduledCampaign(
  id: string,
  patch: Partial<SmsScheduledCampaign>
): SmsScheduledCampaign | null {
  const existing = getScheduledCampaigns();
  let found: SmsScheduledCampaign | null = null;

  const updated = existing.map((c) => {
    if (c.id === id) {
      found = { ...c, ...patch };
      return found;
    }
    return c;
  });

  if (found) {
    saveScheduledCampaigns(updated);
  }

  return found;
}

/**
 * Deletes a scheduled campaign
 */
export function deleteScheduledCampaign(id: string): boolean {
  const existing = getScheduledCampaigns();
  const filtered = existing.filter((c) => c.id !== id);
  if (filtered.length !== existing.length) {
    saveScheduledCampaigns(filtered);
    return true;
  }
  return false;
}
