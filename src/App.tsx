'use client';

import React, { useState } from 'react';
import { NavigationTab } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { PaymentProvider } from './context/PaymentContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingView } from './views/LandingView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { ErrorViews } from './views/ErrorViews';
import { SubscriptionStatusModal } from './components/SubscriptionStatusModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('landing');
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const handleNavigate = (tab: NavigationTab) => {
    if (tab === '404' || tab === '500') {
      setActiveTab(tab);
    } else if (tab === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('landing');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-zinc-50 font-sans transition-colors duration-200 selection:bg-zinc-900 selection:text-zinc-50 dark:selection:bg-zinc-100 dark:selection:text-zinc-900 flex flex-col justify-between">
      <div>
        {/* Navigation Header - Rendered only on user-facing pages, hidden in Admin Console */}
        {activeTab !== 'admin' && (
          <Navbar
            activeTab={activeTab}
            onNavigate={handleNavigate}
            onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
          />
        )}

        {/* Main Content Body */}
        <main className="w-full">
          {activeTab === 'landing' && (
            <LandingView
              onNavigate={handleNavigate}
              onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
            />
          )}
          {activeTab === 'admin' && (
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
              <AdminDashboardView onExitAdmin={() => handleNavigate('landing')} />
            </div>
          )}
          {activeTab === '404' && <ErrorViews type="404" onNavigate={handleNavigate} />}
          {activeTab === '500' && <ErrorViews type="500" onNavigate={handleNavigate} />}
        </main>
      </div>

      {/* Footer - Rendered only on user-facing pages, hidden in Admin Console */}
      {activeTab !== 'admin' && (
        <Footer onNavigate={handleNavigate} onOpenVerifyModal={() => setIsVerifyModalOpen(true)} />
      )}

      {/* Global Phone Approval Status Popup Modal */}
      <SubscriptionStatusModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <PaymentProvider>
              <MainApp />
            </PaymentProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
