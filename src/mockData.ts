import { Message, Invoice, ApiKey, SystemUser, ActivityLog, AnalyticsDataPoint, NotificationItem } from './types';

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg_90a1b2c3',
    recipient: '+1 (555) 019-2834',
    recipientName: 'Sarah Jenkins',
    channel: 'SMS',
    subject: 'Verification Code',
    body: 'Your Nazazi authentication code is 849-201. Expires in 10 minutes.',
    status: 'delivered',
    sentAt: '2026-07-28T04:12:10Z',
    latencyMs: 142,
    cost: 0.0075,
    metadata: { app_id: 'app_prod_01', region: 'us-east-1' }
  },
  {
    id: 'msg_81f2d3e4',
    recipient: 'alex.rivera@acmecorp.com',
    recipientName: 'Alex Rivera',
    channel: 'Email',
    subject: 'Invoice #INV-2026-004 Available',
    body: 'Your monthly statement for Nazazi Scale Plan is ready for review.',
    status: 'delivered',
    sentAt: '2026-07-28T03:45:00Z',
    latencyMs: 89,
    cost: 0.002,
    metadata: { invoice_id: 'inv_882', automated: 'true' }
  },
  {
    id: 'msg_72e3f4a5',
    recipient: '+44 7700 900077',
    recipientName: 'Liam O\'Connor',
    channel: 'WhatsApp',
    subject: 'Security Alert',
    body: 'New sign-in detected from macOS Safari in London, UK.',
    status: 'failed',
    sentAt: '2026-07-28T02:18:22Z',
    latencyMs: 310,
    cost: 0.00,
    errorReason: 'Undeliverable: Recipient phone number unreachable or unregistered.',
    metadata: { ip: '185.120.44.2', level: 'warning' }
  },
  {
    id: 'msg_63d4c5b6',
    recipient: 'https://hooks.slack.com/services/T00/B00/X00',
    recipientName: 'DevOps Slack Webhook',
    channel: 'Webhook',
    subject: 'Deployment Event: v2.4.0-rc3',
    body: 'Production canary release complete. Health checks 100% green.',
    status: 'delivered',
    sentAt: '2026-07-28T01:05:44Z',
    latencyMs: 64,
    cost: 0.0005,
    metadata: { commit: 'a1b2c3d', env: 'production' }
  },
  {
    id: 'msg_54c5b6a7',
    recipient: '+1 (555) 432-8901',
    recipientName: 'Marcus Vance',
    channel: 'SMS',
    subject: 'Password Reset',
    body: 'Tap the link to reset your password: https://nazazi.io/auth/reset?token=xyz',
    status: 'scheduled',
    sentAt: '2026-07-28T06:00:00Z',
    latencyMs: 0,
    cost: 0.0075,
    metadata: { scheduled_by: 'user_admin_09' }
  },
  {
    id: 'msg_43b6a7f8',
    recipient: 'elena.rodriguez@techverse.io',
    recipientName: 'Elena Rodriguez',
    channel: 'Email',
    subject: 'Welcome to Nazazi Enterprise',
    body: 'Thank you for upgrading. Your dedicated technical account manager is assigned.',
    status: 'delivered',
    sentAt: '2026-07-27T22:30:15Z',
    latencyMs: 112,
    cost: 0.002,
    metadata: { tier: 'Enterprise' }
  },
  {
    id: 'msg_32a7f8e9',
    recipient: '+49 151 5550123',
    recipientName: 'Hans Weber',
    channel: 'WhatsApp',
    subject: 'Order Confirmation #9941',
    body: 'Your order #9941 has been dispatched via DHL Express.',
    status: 'delivered',
    sentAt: '2026-07-27T19:14:02Z',
    latencyMs: 180,
    cost: 0.012,
    metadata: { carrier: 'DHL', tracking: '3399102931' }
  }
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-2026-007',
    date: '2026-07-01',
    amount: 299.00,
    currency: 'USD',
    status: 'paid',
    plan: 'Scale Plan (Monthly)',
    pdfUrl: '#'
  },
  {
    id: 'INV-2026-006',
    date: '2026-06-01',
    amount: 299.00,
    currency: 'USD',
    status: 'paid',
    plan: 'Scale Plan (Monthly)',
    pdfUrl: '#'
  },
  {
    id: 'INV-2026-005',
    date: '2026-05-01',
    amount: 299.00,
    currency: 'USD',
    status: 'paid',
    plan: 'Scale Plan (Monthly)',
    pdfUrl: '#'
  },
  {
    id: 'INV-2026-004',
    date: '2026-04-01',
    amount: 149.00,
    currency: 'USD',
    status: 'paid',
    plan: 'Growth Plan (Monthly)',
    pdfUrl: '#'
  },
  {
    id: 'INV-2026-003',
    date: '2026-03-01',
    amount: 149.00,
    currency: 'USD',
    status: 'paid',
    plan: 'Growth Plan (Monthly)',
    pdfUrl: '#'
  }
];

export const MOCK_API_KEYS: ApiKey[] = [
  {
    id: 'key_live_01827391',
    name: 'Production Server Key',
    keyPrefix: 'nz_live_9a8b7c6d...',
    created: '2026-01-15',
    lastUsed: 'Just now',
    environment: 'production',
    scopes: ['messages:write', 'messages:read', 'webhooks:manage']
  },
  {
    id: 'key_test_99812734',
    name: 'Staging Integration',
    keyPrefix: 'nz_test_1a2b3c4d...',
    created: '2026-03-10',
    lastUsed: '2 hours ago',
    environment: 'test',
    scopes: ['messages:write', 'messages:read']
  },
  {
    id: 'key_live_44918237',
    name: 'Mobile SDK Client',
    keyPrefix: 'nz_live_4f5e6d7c...',
    created: '2026-05-22',
    lastUsed: '12 mins ago',
    environment: 'production',
    scopes: ['messages:write']
  }
];

export const MOCK_USERS: SystemUser[] = [
  {
    id: 'usr_01',
    name: 'Korni Mah',
    email: 'kornimah@gmail.com',
    role: 'Owner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    status: 'active',
    lastActive: 'Active now',
    mfaEnabled: true,
    totalSpent: 3480,
    messagesSent: 482100
  },
  {
    id: 'usr_02',
    name: 'Sophia Chen',
    email: 'sophia@nazazi.io',
    role: 'Admin',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    status: 'active',
    lastActive: '14 mins ago',
    mfaEnabled: true,
    totalSpent: 1200,
    messagesSent: 194000
  },
  {
    id: 'usr_03',
    name: 'David Vance',
    email: 'david.v@acme.com',
    role: 'Developer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    status: 'active',
    lastActive: '1 hour ago',
    mfaEnabled: false,
    totalSpent: 850,
    messagesSent: 82000
  },
  {
    id: 'usr_04',
    name: 'Emma Watson',
    email: 'emma@designstudio.co',
    role: 'Viewer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    status: 'invited',
    lastActive: 'Never',
    mfaEnabled: false,
    totalSpent: 0,
    messagesSent: 0
  }
];

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act_001',
    action: 'API Key Created',
    actor: 'Korni Mah',
    timestamp: '2026-07-28T04:15:00Z',
    ipAddress: '192.168.1.104',
    status: 'success',
    details: 'Created key "Production Server Key" with scope [messages:write]'
  },
  {
    id: 'act_002',
    action: 'Webhook URL Updated',
    actor: 'Sophia Chen',
    timestamp: '2026-07-28T03:30:12Z',
    ipAddress: '184.22.91.5',
    status: 'success',
    details: 'Changed endpoint to https://api.nazazi.io/v2/webhooks/delivery'
  },
  {
    id: 'act_003',
    action: 'Failed Login Attempt',
    actor: 'Unknown',
    timestamp: '2026-07-28T01:12:09Z',
    ipAddress: '45.142.120.99',
    status: 'error',
    details: 'Invalid password attempt for account admin@nazazi.io'
  },
  {
    id: 'act_004',
    action: 'Billing Plan Changed',
    actor: 'Korni Mah',
    timestamp: '2026-07-27T18:00:00Z',
    ipAddress: '192.168.1.104',
    status: 'success',
    details: 'Upgraded from Growth to Scale Plan ($299/mo)'
  }
];

export const MOCK_ANALYTICS: AnalyticsDataPoint[] = [
  { date: 'Jul 21', revenue: 1240, messages: 42000, deliverabilityRate: 99.8, latency: 110, failed: 84 },
  { date: 'Jul 22', revenue: 1380, messages: 48500, deliverabilityRate: 99.9, latency: 98, failed: 48 },
  { date: 'Jul 23', revenue: 1510, messages: 51200, deliverabilityRate: 99.7, latency: 105, failed: 153 },
  { date: 'Jul 24', revenue: 1420, messages: 49000, deliverabilityRate: 99.9, latency: 92, failed: 49 },
  { date: 'Jul 25', revenue: 1680, messages: 58000, deliverabilityRate: 99.8, latency: 89, failed: 116 },
  { date: 'Jul 26', revenue: 1890, messages: 64200, deliverabilityRate: 99.9, latency: 84, failed: 64 },
  { date: 'Jul 27', revenue: 2150, messages: 71000, deliverabilityRate: 99.9, latency: 79, failed: 71 },
  { date: 'Jul 28', revenue: 2490, messages: 84120, deliverabilityRate: 99.95, latency: 74, failed: 42 },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Monthly Volume Exceeded 80%',
    message: 'You have used 842,100 of 1,000,000 monthly high-speed API credits.',
    timestamp: '10 mins ago',
    read: false,
    type: 'warning'
  },
  {
    id: 'notif_2',
    title: 'New API Key Provisioned',
    message: 'Production Server Key was created by Korni Mah.',
    timestamp: '25 mins ago',
    read: false,
    type: 'info'
  },
  {
    id: 'notif_3',
    title: 'Payment Processed',
    message: 'Invoice INV-2026-007 for $299.00 was successfully charged to Visa •••• 4242.',
    timestamp: '2 hours ago',
    read: true,
    type: 'success'
  }
];
