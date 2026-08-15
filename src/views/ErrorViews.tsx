'use client';

import React from 'react';
import { NavigationTab } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { ArrowLeft, RefreshCw, Sparkles, Home, ShieldAlert, Bug } from 'lucide-react';

interface ErrorViewProps {
  type: '404' | '500';
  onNavigate: (tab: NavigationTab) => void;
}

export const ErrorViews: React.FC<ErrorViewProps> = ({ type, onNavigate }) => {
  if (type === '404') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 text-center">
        <Card className="max-w-md p-8 space-y-6 border-zinc-200/90 dark:border-zinc-800 shadow-xl">
          <div className="space-y-3">
            <span className="font-mono text-6xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tighter">
              404
            </span>
            <div className="flex justify-center">
              <Badge variant="amber">Route Not Found</Badge>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              This edge path does not exist.
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              The requested URL endpoint was moved, renamed, or never existed in the Nazazi edge cluster.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onNavigate('dashboard')}
              leftIcon={<Home className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto font-semibold"
            >
              Return to Dashboard
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigate('landing')}
              className="w-full sm:w-auto"
            >
              Landing Overview
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 text-center">
      <Card className="max-w-md p-8 space-y-6 border-red-200/80 dark:border-red-900/60 shadow-xl">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 flex items-center justify-center mx-auto">
            <Bug className="w-6 h-6" />
          </div>
          <span className="font-mono text-5xl font-extrabold text-red-600 dark:text-red-400 tracking-tighter block">
            500
          </span>
          <div className="flex justify-center">
            <Badge variant="red">Internal Edge Fault</Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            System exception detected.
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            An unhandled runtime error occurred on regional proxy proxy_us_east_04. Our automated failover system is restoring health.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => window.location.reload()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto font-semibold"
          >
            Retry Connection
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto"
          >
            Back to Safety
          </Button>
        </div>
      </Card>
    </div>
  );
};
