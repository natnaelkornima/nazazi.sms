'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Command, ArrowRight, LayoutDashboard, MessageSquare, CreditCard, User, Settings, ShieldCheck, Sun, Moon, Key, FileText, Sparkles, X } from 'lucide-react';
import { NavigationTab } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { success } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      group: 'Navigation',
      items: [
        { id: 'nav-dash', label: 'Go to User Dashboard', icon: LayoutDashboard, action: () => { onNavigate('dashboard'); onClose(); } },
        { id: 'nav-admin', label: 'Go to Admin Console (SMS & Payments)', icon: ShieldCheck, action: () => { onNavigate('admin'); onClose(); } },
        { id: 'nav-msg', label: 'Go to Message Inbox', icon: MessageSquare, action: () => { onNavigate('messages'); onClose(); } },
        { id: 'nav-pay', label: 'Go to Payments & Subscriptions', icon: CreditCard, action: () => { onNavigate('payments'); onClose(); } },
        { id: 'nav-prof', label: 'Go to Profile & Security', icon: User, action: () => { onNavigate('profile'); onClose(); } },
        { id: 'nav-set', label: 'Go to Platform Settings', icon: Settings, action: () => { onNavigate('settings'); onClose(); } },
        { id: 'nav-landing', label: 'View Product Landing Page', icon: Sparkles, action: () => { onNavigate('landing'); onClose(); } },
      ],
    },
    {
      group: 'Quick Actions',
      items: [
        {
          id: 'act-theme',
          label: `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`,
          icon: theme === 'light' ? Moon : Sun,
          action: () => {
            toggleTheme();
            success(`Switched to ${theme === 'light' ? 'Dark' : 'Light'} Mode`);
            onClose();
          },
        },
        {
          id: 'act-apikey',
          label: 'Copy Production API Key',
          icon: Key,
          action: () => {
            navigator.clipboard.writeText('nz_live_9a8b7c6d5e4f3a2b1c');
            success('Copied API key to clipboard');
            onClose();
          },
        },
        {
          id: 'act-receipt',
          label: 'Download Latest Invoice PDF',
          icon: FileText,
          action: () => {
            success('Invoice #INV-2026-007 downloaded');
            onClose();
          },
        },
        {
          id: 'act-404',
          label: 'Test 404 Error Page',
          icon: X,
          action: () => {
            onNavigate('404');
            onClose();
          },
        },
      ],
    },
  ];

  const filteredGroups = actions
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/70 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 text-zinc-900 dark:text-zinc-100"
        >
          {/* Search Header */}
          <div className="flex items-center px-4 border-b border-zinc-100 dark:border-zinc-800/80 gap-3">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-13 text-sm bg-transparent outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {filteredGroups.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                No matching actions found for &quot;{query}&quot;
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.group} className="space-y-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {group.group}
                  </p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-zinc-700 dark:text-zinc-200 group text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-100 transition-colors" />
                          <span>{item.label}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3" /> Navigation & Control Palette
            </span>
            <span className="hidden sm:inline">Use ↑↓ to navigate</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
