'use client';

import React, { useState } from 'react';
import { ApiKey } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { MOCK_API_KEYS } from '../mockData';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Settings,
  Key,
  Copy,
  Plus,
  Trash2,
  Bell,
  Sun,
  Moon,
  Shield,
  Globe,
  Sliders,
  CheckCircle2,
  Terminal,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('api');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'production' | 'test'>('production');

  // Webhook Tester State
  const [webhookUrl, setWebhookUrl] = useState('https://api.acme.com/v2/nazazi-receiver');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [webhookAlerts, setWebhookAlerts] = useState(true);

  const { theme, setTheme } = useTheme();
  const { success, info } = useToast();

  const handleCopyKey = (prefix: string) => {
    navigator.clipboard.writeText(`${prefix}998877665544332211`);
    success(language === 'am' ? 'የኤፒአይ ቁልፍ ተቀድቷል' : 'API Key copied to clipboard');
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    const newKey: ApiKey = {
      id: `key_${Date.now().toString(36)}`,
      name: newKeyName || (language === 'am' ? 'አዲስ ኤፒአይ ቁልፍ' : 'New API Key'),
      keyPrefix: `nz_${newKeyEnv}_${Math.random().toString(36).substring(2, 10)}...`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: language === 'am' ? 'እስካሁን አልተጠቀመም' : 'Never',
      environment: newKeyEnv,
      scopes: ['messages:write', 'messages:read'],
    };

    setApiKeys((prev) => [newKey, ...prev]);
    setIsNewKeyModalOpen(false);
    setNewKeyName('');
    success(language === 'am' ? 'አዲስ ኤፒአይ ቁልፍ ተፈጥሯል' : `Generated new ${newKeyEnv} API secret key`);
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    info(language === 'am' ? 'የኤፒአይ ቁልፍ ተሰርዟል' : 'API Key revoked');
  };

  const handleTestWebhook = () => {
    setIsTestingWebhook(true);
    setWebhookResult(null);
    setTimeout(() => {
      setIsTestingWebhook(false);
      setWebhookResult(
        JSON.stringify(
          {
            status: 200,
            event: 'webhook.ping',
            message: 'Endpoint verified successfully. Latency 42ms.',
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );
      success(language === 'am' ? 'ዌብሁክ በተሳካ ሁኔታ ተፈትኗል' : 'Webhook endpoint responded with HTTP 200 OK');
    }, 800);
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Platform Settings
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Configure API secret keys, appearance themes, notification routes, and webhook telemetry.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'api', label: 'API Keys & Secrets', icon: <Key className="w-3.5 h-3.5" /> },
          { id: 'appearance', label: 'Appearance', icon: <Sun className="w-3.5 h-3.5" /> },
          { id: 'webhooks', label: 'Webhooks & Endpoints', icon: <Terminal className="w-3.5 h-3.5" /> },
          { id: 'notifications', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
          { id: 'general', label: 'General & Region', icon: <Globe className="w-3.5 h-3.5" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: API Keys */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  Secret API Keys
                </h3>
                <p className="text-xs text-zinc-500">
                  Secret keys grant full administrative API access. Keep them private and secure.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsNewKeyModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Create Secret Key
              </Button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-4 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{k.name}</span>
                      <Badge variant={k.environment === 'production' ? 'emerald' : 'amber'}>
                        {k.environment}
                      </Badge>
                    </div>
                    <p className="font-mono text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50 inline-block">
                      {k.keyPrefix}
                    </p>
                    <p className="text-[10px] text-zinc-400">Created {k.created} • Last used {k.lastUsed}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyKey(k.keyPrefix)}
                      leftIcon={<Copy className="w-3.5 h-3.5" />}
                    >
                      Copy Secret
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteKey(k.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Appearance */}
      {activeTab === 'appearance' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Interface Theme</h3>
            <p className="text-xs text-zinc-500">Choose between pristine light mode and deep quiet luxury dark mode.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`p-5 rounded-2xl border-2 text-left space-y-3 cursor-pointer transition-all ${
                theme === 'light'
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" /> Soft White (#FAFAFA)
                </span>
                {theme === 'light' && <Badge variant="emerald">Active</Badge>}
              </div>
              <p className="text-xs text-zinc-500">
                Pristine off-white canvas with near-black typography and subtle borders.
              </p>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-2xl border-2 text-left space-y-3 cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" /> Quiet Dark (#09090B)
                </span>
                {theme === 'dark' && <Badge variant="emerald">Active</Badge>}
              </div>
              <p className="text-xs text-zinc-500">
                Zinc dark canvas with soft glowing accents, zero harsh contrasts, and high legibility.
              </p>
            </button>
          </div>
        </Card>
      )}

      {/* Tab 3: Webhooks */}
      {activeTab === 'webhooks' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Webhook Endpoint Testing</h3>
            <p className="text-xs text-zinc-500">Test payload delivery to your external HTTP receiver</p>
          </div>

          <div className="space-y-4">
            <Input
              label="Receiver Endpoint URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/webhook"
            />

            <Button
              size="sm"
              isLoading={isTestingWebhook}
              onClick={handleTestWebhook}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Test Ping Event
            </Button>

            {webhookResult && (
              <div className="space-y-1 pt-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Response Log Output
                </span>
                <pre className="p-4 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-xs border border-zinc-800">
                  {webhookResult}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Notification Preferences</h3>
            <p className="text-xs text-zinc-500">Configure delivery channels for system alerts</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Email Alerts</p>
                <p className="text-[11px] text-zinc-500">Receive weekly telemetry summaries and billing invoices</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded text-zinc-900 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Webhook Pager Alerts</p>
                <p className="text-[11px] text-zinc-500">Post delivery failures directly to Slack or Discord webhooks</p>
              </div>
              <input
                type="checkbox"
                checked={webhookAlerts}
                onChange={(e) => setWebhookAlerts(e.target.checked)}
                className="rounded text-zinc-900 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Create New Key Modal */}
      <Modal
        isOpen={isNewKeyModalOpen}
        onClose={() => setIsNewKeyModalOpen(false)}
        title="Generate New Secret Key"
        description="Select the environment scope for this API credential"
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          <Input
            label="Key Name / Identifier"
            placeholder="e.g. Staging Integration Key"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Environment Target
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewKeyEnv('production')}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  newKeyEnv === 'production'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                Production (nz_live)
              </button>
              <button
                type="button"
                onClick={() => setNewKeyEnv('test')}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  newKeyEnv === 'test'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                Test Staging (nz_test)
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsNewKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Generate Key
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
