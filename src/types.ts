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

