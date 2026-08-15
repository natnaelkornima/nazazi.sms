'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { NavigationTab } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MOCK_ANALYTICS, MOCK_ACTIVITY_LOGS, MOCK_MESSAGES } from '../mockData';
import { formatCurrency, formatNumber, formatDate } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  CreditCard,
  MessageSquare,
  Calendar,
  Zap,
  ArrowUpRight,
  Plus,
  Send,
  UserPlus,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface UserDashboardViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const UserDashboardView: React.FC<UserDashboardViewProps> = ({ onNavigate }) => {
  const [metricFilter, setMetricFilter] = useState<'messages' | 'revenue' | 'deliverabilityRate'>('messages');
  const { success } = useToast();
  const { language, t } = useLanguage();
  const isAmharic = language === 'am';

  const handleQuickAction = (actionName: string) => {
    if (actionName === 'New Message') onNavigate('messages');
    else if (actionName === 'Manage Plan') onNavigate('payments');
    else if (actionName === 'Invite Member') onNavigate('profile');
    else {
      success(`${actionName} triggered`, 'Action processed successfully.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome & Quick Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isAmharic ? 'እንኳን ደህና መጡ፣ ኤፍሬም 👋' : 'Welcome back, Korni 👋'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isAmharic ? 'የናዛዚ አገልግሎት በጥሩ ሁኔታ በስራ ላይ ይገኛል።' : 'Nazazi Scale Cluster is running smoothly across 32 regional edge proxies.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => handleQuickAction('New Message')}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            {isAmharic ? 'አዲስ መልእክት' : 'New Message'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleQuickAction('Invite Member')}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            {isAmharic ? 'አባል ጋብዝ' : 'Invite Member'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickAction('Export Logs')}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            {isAmharic ? 'ታሪክ አውርድ' : 'Export Logs'}
          </Button>
        </div>
      </div>

      {/* Bento Grid Summary Tiles (Top Row: 3 White Tiles + 1 Solid Dark Accent Tile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bento Tile 1 */}
        <div className="bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-[6px] p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              {isAmharic ? 'የደንበኝነት እቅድ' : 'Subscription Tier'}
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-bold rounded-full">
              {isAmharic ? 'ንቁ' : 'Active Scale'}
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {isAmharic ? 'የ3 ወር አገልግሎት' : 'Scale Plan'}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{isAmharic ? 'የየዕለቱ የኤስኤምኤስ ስርጭት የተጠበቀ' : '84% compute usage quota'}</p>
          </div>
        </div>

        {/* Bento Tile 2 */}
        <div className="bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-[6px] p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Today&apos;s Volume
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-bold rounded-full">
              +18.4%
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatNumber(84120)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Dispatched via edge</p>
          </div>
        </div>

        {/* Bento Tile 3 */}
        <div className="bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-[6px] p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Monthly Spend
            </span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 text-[10px] font-bold rounded-full">
              Auto-renew
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatCurrency(299.0)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">Renews Aug 01, 2026</p>
          </div>
        </div>

        {/* Bento Tile 4 (Solid Black High-Contrast Bento Block) */}
        <div className="bg-black text-white rounded-[6px] p-5 flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
              Edge Infrastructure
            </span>
            <span className="text-[10px] opacity-50 font-mono">32 Nodes</span>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-lg font-bold">Operational</span>
            </div>
            <p className="text-[11px] opacity-60 mt-1">Sub-80ms global latency nominal</p>
          </div>
        </div>
      </div>

      {/* Main Bento Grid Module: Analytics Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-[#E5E7EB] dark:border-zinc-800 rounded-[6px] p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Delivery Telemetry & Volume
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Real-time message throughput and success rate over the last 7 days.
            </p>
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-[#F3F4F6] dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 gap-1">
            <button
              onClick={() => setMetricFilter('messages')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                metricFilter === 'messages'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setMetricFilter('revenue')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                metricFilter === 'revenue'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setMetricFilter('deliverabilityRate')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                metricFilter === 'deliverabilityRate'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
            >
              Success Rate
            </button>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_ANALYTICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#27272a',
                  borderRadius: '12px',
                  color: '#fafafa',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey={metricFilter}
                stroke="#18181b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMetric)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Layout: Recent Messages & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Recent Dispatched Messages
              </h3>
              <p className="text-xs text-zinc-500">Live feed from production environment</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('messages')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              View Inbox
            </Button>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {MOCK_MESSAGES.slice(0, 4).map((msg) => (
              <div key={msg.id} className="py-3 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                    {msg.channel[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {msg.subject}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">{msg.recipient}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <Badge
                    variant={
                      msg.status === 'delivered'
                        ? 'emerald'
                        : msg.status === 'failed'
                        ? 'red'
                        : 'amber'
                    }
                  >
                    {msg.status}
                  </Badge>
                  <p className="text-[10px] text-zinc-400">{msg.latencyMs}ms</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Security & Audit Activity Log */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Workspace Audit Logs
              </h3>
              <p className="text-xs text-zinc-500">Security events and administrative actions</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('settings')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              Audit Trail
            </Button>
          </div>

          <div className="space-y-3">
            {MOCK_ACTIVITY_LOGS.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800 flex items-start gap-3 text-xs"
              >
                <div className="mt-0.5 shrink-0">
                  {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {log.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {log.status === 'warning' && <Clock className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-zinc-400">{log.ipAddress}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {log.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
