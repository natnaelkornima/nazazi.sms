export type NavigationTab = 
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'admin'
  | 'messages'
  | 'payments'
  | 'profile'
  | 'settings'
  | '404'
  | '500';

export type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

export type MessageStatus = 'delivered' | 'failed' | 'scheduled' | 'processing';

export interface Message {
  id: string;
  recipient: string;
  recipientName?: string;
  channel: 'SMS' | 'WhatsApp' | 'Email' | 'Webhook';
  subject: string;
  body: string;
  status: MessageStatus;
  sentAt: string;
  latencyMs: number;
  cost: number;
  errorReason?: string;
  metadata?: Record<string, string>;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  plan: string;
  pdfUrl: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  created: string;
  lastUsed: string;
  environment: 'production' | 'test';
  scopes: string[];
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer';
  avatar: string;
  status: 'active' | 'invited' | 'disabled';
  lastActive: string;
  mfaEnabled: boolean;
  totalSpent: number;
  messagesSent: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export interface AnalyticsDataPoint {
  date: string;
  revenue: number;
  messages: number;
  deliverabilityRate: number;
  latency: number;
  failed: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  planName: string;
  amount: number;
  currency: string;
  payerName: string;
  transactionId: string;
  screenshotUrl: string;
  status: PaymentStatus;
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
}

export type SmsProviderType = 'generic_http' | 'twilio' | 'africas_talking' | 'infobip' | 'simulation';

export interface SmsGatewayConfig {
  provider: SmsProviderType;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  authHeader: string;
  batchSize: number;
  batchDelayMs: number;
}

export type SmsTargetPlan = 'all' | '200' | '600' | '1000' | 'single';
export type SmsScheduleDuration = '1_week' | '3_weeks' | '1_month' | 'custom';

export interface SmsScheduledCampaign {
  id: string;
  title: string;
  targetPlan: SmsTargetPlan;
  targetCount: number;
  duration: SmsScheduleDuration;
  dailyTime: string; // e.g. "07:00" for Morning text
  startDate: string;
  endDate: string;
  messageTemplate: string;
  status: 'active' | 'paused' | 'completed';
  runsCompleted: number;
  totalRuns: number;
  createdAt: string;
  lastRunAt?: string | null;
  nextRunAt: string;
}

export interface SmsBatchDispatchProgress {
  isDispatching: boolean;
  totalRecipients: number;
  totalBatches: number;
  currentBatch: number;
  sentCount: number;
  failedCount: number;
  statusText: string;
  isPaused: boolean;
  startTime?: number;
}

