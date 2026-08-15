'use client';

import React from 'react';
import { NavigationTab } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  ShieldCheck,
  MessageSquare,
  CreditCard,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const userMenuGroups = [
    {
      title: t('nav.profile'),
      items: [
        { id: 'profile' as NavigationTab, label: t('nav.profile'), icon: User, badge: 'Active', shortcut: '⌘1' },
        { id: 'payments' as NavigationTab, label: t('nav.payments'), icon: CreditCard, badge: null, shortcut: '⌘2' },
      ],
    },
  ];

  const adminMenuGroups = [
    {
      title: t('nav.admin'),
      items: [
        { id: 'admin' as NavigationTab, label: t('nav.admin'), icon: ShieldCheck, badge: 'SMS & Payments', shortcut: '⌘1' },
      ],
    },
  ];

  const menuGroups = user?.role === 'admin' ? adminMenuGroups : userMenuGroups;

  return (
    <aside
      className={cn(
        'sticky top-15 h-[calc(100vh-3.75rem)] bg-white dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-300 flex flex-col justify-between shrink-0 z-30 select-none hidden md:flex',
        collapsed ? 'w-16 p-2' : 'w-64 p-4'
      )}
    >
      {/* Top Menu Items */}
      <div className="space-y-6 overflow-y-auto no-scrollbar">
        {/* Toggle Button */}
        {onToggleCollapse && (
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-2')}>
            {!collapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Workspace
              </span>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Groups */}
        {menuGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer group',
                    isActive
                      ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-900'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-zinc-50 dark:text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200')} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && (
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.2 text-[10px] font-bold rounded-full',
                            isActive
                              ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-300 dark:text-zinc-900'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.shortcut && !item.badge && (
                        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-500">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Footer Section */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
        <button
          onClick={() => {
            logout();
            onNavigate('landing');
          }}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
