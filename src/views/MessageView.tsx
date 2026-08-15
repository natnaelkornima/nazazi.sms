'use client';

import React, { useState } from 'react';
import { Message, MessageStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { MOCK_MESSAGES } from '../mockData';
import { formatDateTime, formatCurrency } from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  RotateCw,
  Code,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const MessageView: React.FC = () => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);

  // Compose form state
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'SMS' | 'WhatsApp' | 'Email' | 'Webhook'>('SMS');

  const { success, info } = useToast();

  const filteredMessages = messages.filter((msg) => {
    const matchesTab = activeTab === 'all' || msg.status === activeTab;
    const matchesSearch =
      msg.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.recipientName && msg.recipientName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleComposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMsg: Message = {
      id: `msg_${Math.random().toString(36).substring(2, 9)}`,
      recipient,
      recipientName: language === 'am' ? 'ተጠቃሚ' : 'Custom Recipient',
      channel,
      subject,
      body,
      status: 'delivered',
      sentAt: new Date().toISOString(),
      latencyMs: Math.floor(Math.random() * 80) + 40,
      cost: channel === 'SMS' ? 0.0075 : channel === 'WhatsApp' ? 0.012 : 0.002,
      metadata: { dispatched_via: 'Nazazi UI' },
    };

    setMessages((prev) => [newMsg, ...prev]);
    setIsComposeOpen(false);
    setRecipient('');
    setSubject('');
    setBody('');
    success(
      language === 'am' ? 'መልእክቱ በተሳካ ሁኔታ ተላክቷል' : 'Message dispatched successfully',
      language === 'am' ? 'በፍጥነት በሞባይል አውታረ መረብ ተልኳል' : `Sub-80ms edge delivery via ${channel}`
    );
  };

  const handleResend = (msg: Message) => {
    success(
      language === 'am' ? `${msg.id} እንደገና በመላክ ላይ...` : `Re-dispatching ${msg.id}...`,
      language === 'am' ? 'መልእክቱ እንደገና ተልኳል' : 'Message routed through fallback edge node.'
    );
    setSelectedMessage(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {language === 'am' ? 'የመልእክቶች ሳጥን (Messages Inbox)' : 'Real-time Message Inbox'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'am'
              ? 'የተላኩ አጽናኝ መንፈሳዊ መልእክቶችን እና የSMS ታሪክ ይከታተሉ'
              : 'Sub-80ms message dispatch telemetry, raw payload inspection, and retry management.'}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsComposeOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="font-semibold shadow-sm"
        >
          {language === 'am' ? 'አዲስ መልእክት ጻፍ' : 'Compose Message'}
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'all', label: language === 'am' ? 'ሁሉም መልእክቶች' : 'All Messages', badge: messages.length },
            {
              id: 'delivered',
              label: language === 'am' ? 'የደረሱ' : 'Delivered',
              badge: messages.filter((m) => m.status === 'delivered').length,
            },
            {
              id: 'failed',
              label: language === 'am' ? 'ያልተላኩ' : 'Failed',
              badge: messages.filter((m) => m.status === 'failed').length,
            },
            {
              id: 'scheduled',
              label: language === 'am' ? 'የታቀዱ' : 'Scheduled',
              badge: messages.filter((m) => m.status === 'scheduled').length,
            },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="w-full sm:w-72">
          <Input
            placeholder={language === 'am' ? 'በተቀባይ ወይም በርዕስ ፈልግ...' : 'Search by recipient, subject, payload...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-zinc-400" />}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* Messages List / Table */}
      <Card className="p-0 overflow-hidden">
        {filteredMessages.length === 0 ? (
          <EmptyState
            title={language === 'am' ? 'ምንም መልእክት አልተገኘም' : 'No messages found'}
            description={
              language === 'am'
                ? `ከመረጡት መስፈርት ("${activeTab}") ጋር የሚጣጣም መልእክት የለም።`
                : `No messages matched your current filter criteria ("${activeTab}").`
            }
            actionLabel={language === 'am' ? 'አዲስ መልእክት ጻፍ' : 'Compose New Message'}
            onAction={() => setIsComposeOpen(true)}
          />
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className="p-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-800 dark:text-zinc-200 shrink-0 text-xs border border-zinc-200/60 dark:border-zinc-700/60">
                    {msg.channel[0]}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {msg.subject}
                      </span>
                      <Badge variant="zinc">{msg.channel}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {language === 'am' ? 'ለ:' : 'To:'}{' '}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{msg.recipient}</span> — {msg.body}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div className="hidden sm:block">
                    <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(msg.sentAt)}
                    </p>
                    <p className="text-[10px] text-zinc-400">{msg.latencyMs}ms latency</p>
                  </div>

                  <Badge
                    variant={
                      msg.status === 'delivered'
                        ? 'emerald'
                        : msg.status === 'failed'
                        ? 'red'
                        : 'amber'
                    }
                    dot
                  >
                    {msg.status === 'delivered'
                      ? language === 'am'
                        ? 'ደርሷል'
                        : 'delivered'
                      : msg.status === 'failed'
                      ? language === 'am'
                        ? 'አልተላከም'
                        : 'failed'
                      : language === 'am'
                      ? 'የታቀደ'
                      : 'scheduled'}
                  </Badge>

                  <ChevronRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Message Inspection Modal */}
      <Modal
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        title={language === 'am' ? 'የመልእክት ዝርዝር መረጃ' : 'Message Payload Telemetry'}
        description={`ID: ${selectedMessage?.id}`}
        maxWidth="lg"
      >
        {selectedMessage && (
          <div className="space-y-6">
            {/* Status Header */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {language === 'am' ? 'የመላክ ሁኔታ' : 'Delivery Status'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      selectedMessage.status === 'delivered'
                        ? 'emerald'
                        : selectedMessage.status === 'failed'
                        ? 'red'
                        : 'amber'
                    }
                    dot
                  >
                    {selectedMessage.status === 'delivered'
                      ? language === 'am'
                        ? 'ደርሷል'
                        : 'delivered'
                      : selectedMessage.status === 'failed'
                      ? language === 'am'
                        ? 'አልተላከም'
                        : 'failed'
                      : language === 'am'
                      ? 'የታቀደ'
                      : 'scheduled'}
                  </Badge>
                  <span className="text-xs text-zinc-500 font-mono">
                    {selectedMessage.latencyMs}ms latency
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {language === 'am' ? 'የአገልግሎት ክፍያ' : 'Cost Charged'}
                </span>
                <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(selectedMessage.cost)}
                </p>
              </div>
            </div>

            {selectedMessage.errorReason && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {language === 'am' ? 'የስህተት ምክንያት' : 'Failure Analysis'}
                </span>
                <p>{selectedMessage.errorReason}</p>
              </div>
            )}

            {/* Recipient & Subject */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-400 font-medium">{language === 'am' ? 'የተቀባይ ስልክ/አድራሻ:' : 'Recipient Target:'}</span>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedMessage.recipient} ({selectedMessage.recipientName || (language === 'am' ? 'ተጠቃሚ' : 'External User')})
                </p>
              </div>
              <div>
                <span className="text-zinc-400 font-medium">{language === 'am' ? 'የመልእክቱ ጽሑፍ:' : 'Message Body:'}</span>
                <p className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 mt-1 leading-relaxed">
                  {selectedMessage.body}
                </p>
              </div>
            </div>

            {/* JSON Payload Inspection */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Code className="w-3.5 h-3.5" /> Raw Edge JSON Dispatch
              </span>
              <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-zinc-800">
                {JSON.stringify(selectedMessage, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleResend(selectedMessage)}
                leftIcon={<RotateCw className="w-3.5 h-3.5" />}
              >
                {language === 'am' ? 'እንደገና ላክ' : 'Re-dispatch Message'}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedMessage(null)}>
                {language === 'am' ? 'ዝጋ' : 'Close Drawer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Compose Message Modal */}
      <Modal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        title={language === 'am' ? 'አዲስ የመንፈሳዊ መልእክት መላኪያ' : 'Compose & Dispatch Message'}
        description={
          language === 'am'
            ? 'በናዛዚ በኩል አጽናኝ መልእክት እና የመጽሐፍ ቅዱስ ቃል ይላኩ'
            : 'Dispatch SMS, Email, WhatsApp, or Webhooks via Nazazi global proxies'
        }
      >
        <form onSubmit={handleComposeSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {language === 'am' ? 'የመላኪያ መንገድ' : 'Channel Type'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['SMS', 'WhatsApp', 'Email', 'Webhook'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    channel === ch
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={language === 'am' ? 'የተቀባይ ስልክ ቁጥር / ኢሜይል' : 'Recipient Address / Phone / URL'}
            placeholder={
              channel === 'SMS' || channel === 'WhatsApp'
                ? '+251 91 123 4567'
                : channel === 'Email'
                ? 'alex@acmecorp.com'
                : 'https://hooks.slack.com/services/...'
            }
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            required
          />

          <Input
            label={language === 'am' ? 'ርዕስ / የዝግጅት ስም' : 'Subject / Event Name'}
            placeholder={language === 'am' ? 'ምሳሌ፡ የጠዋት መንፈሳዊ ማነቃቂያ' : 'e.g. Authentication Security OTP'}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {language === 'am' ? 'የመልእክቱ ጽሑፍ' : 'Message Payload Body'}
            </label>
            <textarea
              rows={3}
              placeholder={
                language === 'am'
                  ? 'ለመንፈሳዊ ድካም ጊዜያት የተስፋ ብርሃን... እግዚአብሔር ብርሃኔና መድኃኒቴ ነው'
                  : 'Your Nazazi authentication code is 849-201...'
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              className="w-full p-3 text-xs rounded-xl bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsComposeOpen(false)}
            >
              {language === 'am' ? 'ሰርዝ' : 'Cancel'}
            </Button>
            <Button type="submit" size="sm" rightIcon={<Send className="w-3.5 h-3.5" />}>
              {language === 'am' ? 'አሁን ላክ' : 'Dispatch Now'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
