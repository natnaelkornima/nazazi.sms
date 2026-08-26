'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PaymentSubmission, PaymentStatus } from '../types';
import { canonicalPhone, phoneMatches } from '../lib/validation';
import { normalizePlanAndAmount } from '../lib/planUtils';

export interface DatabaseConnectionInfo {
  isSupabaseConfigured: boolean;
  isFromSupabase: boolean;
  isCloudinaryConfigured: boolean;
  dbError: string | null;
}

interface PaymentContextType {
  submissions: PaymentSubmission[];
  selectedPlanForCheckout: string | null;
  isLoading: boolean;
  connectionInfo: DatabaseConnectionInfo;
  setSelectedPlanForCheckout: (plan: string | null) => void;
  fetchRegistrations: (silent?: boolean) => Promise<void>;
  submitPayment: (data: {
    id?: string;
    userName: string;
    userPhone: string;
    planName: string;
    amount: number;
    screenshotUrl: string;
    userId?: string;
    userEmail?: string;
    payerName?: string;
    transactionId?: string;
  }) => Promise<PaymentSubmission>;
  approvePayment: (id: string, phone?: string) => Promise<void>;
  rejectPayment: (id: string, phone?: string) => Promise<void>;
  updatePaymentPlan: (id: string, planName: string, amount: number, phone?: string) => Promise<void>;
  deletePayment: (id: string, phone?: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  getSubmissionByPhone: (phone: string) => PaymentSubmission | undefined;
  checkStatusLive: (phone: string) => Promise<PaymentSubmission | null>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

// Helper to attach authorization token for admin routes
function getAdminAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token =
      sessionStorage.getItem('nazazi_admin_token') ||
      localStorage.getItem('nazazi_admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-admin-token'] = token;
    }
  }
  return headers;
}

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<DatabaseConnectionInfo>({
    isSupabaseConfigured: false,
    isFromSupabase: false,
    isCloudinaryConfigured: false,
    dbError: null,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('nazazi_payment_submissions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSubmissions(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const mapRecordToSubmission = (record: {
    id: string;
    name?: string;
    userName?: string;
    phone_number?: string;
    userPhone?: string;
    payment_image_url?: string;
    screenshotUrl?: string;
    plan_name?: string;
    planName?: string;
    amount?: number;
    status?: string;
    created_at?: string;
    submittedAt?: string;
    reviewed_at?: string | null;
  }): PaymentSubmission => {
    const rawStatus = String(record.status || 'pending').toLowerCase().trim();
    const status: PaymentStatus =
      rawStatus === 'approved' ||
      rawStatus === 'active' ||
      rawStatus === 'verified' ||
      rawStatus === 'completed' ||
      rawStatus === 'success' ||
      rawStatus === 'confirmed' ||
      rawStatus === 'accepted'
        ? 'approved'
        : rawStatus === 'rejected' ||
          rawStatus === 'declined' ||
          rawStatus === 'denied' ||
          rawStatus === 'canceled' ||
          rawStatus === 'cancelled' ||
          rawStatus === 'failed'
        ? 'rejected'
        : 'pending';

    const phone = record.phone_number || record.userPhone || '';
    const name = record.name || record.userName || 'Member';
    const imageUrl = record.payment_image_url || record.screenshotUrl || '';
    const rawPlan = record.plan_name || record.planName;
    const rawAmount = record.amount;
    const { planName: plan, amount } = normalizePlanAndAmount(rawPlan, rawAmount);
    const submittedAt = record.created_at || record.submittedAt || new Date().toISOString();

    return {
      id: String(record.id),
      userId: `usr_${String(record.id).replace(/\D/g, '').slice(-6) || Math.random().toString(36).substring(2, 7)}`,
      userName: name,
      userEmail: `${phone.replace(/\D/g, '') || 'user'}@subscriber.nazazi.io`,
      userPhone: phone,
      planName: plan,
      amount,
      currency: 'ETB',
      payerName: name,
      transactionId: `TXN-${String(record.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'SUB'}`,
      screenshotUrl: imageUrl,
      status,
      submittedAt,
      reviewedAt: record.reviewed_at || undefined,
    };
  };

  const fetchRegistrations = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const headers = getAdminAuthHeaders();
      const res = await fetch('/api/admin/registrations', {
        headers,
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.registrations)) {
          const mapped = data.registrations.map(mapRecordToSubmission);

          // Deduplicate by ID and normalized Phone to prevent any duplicates
          const seenIds = new Set<string>();
          const seenPhones = new Set<string>();
          const cleanList: PaymentSubmission[] = [];

          for (const item of mapped) {
            const clean = item.userPhone.replace(/\D/g, '');
            if (seenIds.has(item.id)) continue;
            if (clean && seenPhones.has(clean)) continue;

            seenIds.add(item.id);
            if (clean) seenPhones.add(clean);
            cleanList.push(item);
          }

          setSubmissions((prev) => {
            const merged = cleanList.map((item) => {
              const clean = item.userPhone.replace(/\D/g, '');
              const prevItem = prev.find(
                (p) => p.id === item.id || (clean && p.userPhone.replace(/\D/g, '') === clean)
              );

              let effectivePlanName = item.planName;
              let effectiveAmount = item.amount;
              // If local device has an explicit plan > 200 and server returned 200, preserve local
              if (prevItem && prevItem.amount > 200 && item.amount === 200) {
                effectivePlanName = prevItem.planName;
                effectiveAmount = prevItem.amount;
              }

              // Server status from database/backend overrides map is the authoritative truth for all devices
              let effectiveStatus = item.status;
              let effectiveReviewedAt = item.reviewedAt;

              // If local device has an approved/rejected status for an item that the server returned as pending, prioritize local and queue sync
              if (prevItem && (prevItem.status === 'approved' || prevItem.status === 'rejected') && item.status === 'pending') {
                effectiveStatus = prevItem.status;
                effectiveReviewedAt = prevItem.reviewedAt || item.reviewedAt;
              }

              return {
                ...item,
                planName: effectivePlanName,
                amount: effectiveAmount,
                status: effectiveStatus,
                reviewedAt: effectiveReviewedAt,
              };
            });

            // If local device has approved/rejected submissions or customized plans, perform a fast bulk sync to cloud
            const localStatusesToSync = prev
              .filter((p) => p.status === 'approved' || p.status === 'rejected' || p.amount > 200)
              .map((p) => ({
                id: p.id,
                phone: p.userPhone,
                status: p.status,
                planName: p.planName,
                amount: p.amount,
                reviewedAt: p.reviewedAt,
              }));

            if (localStatusesToSync.length > 0) {
              const headers = getAdminAuthHeaders();
              fetch('/api/admin/sync', {
                method: 'POST',
                headers,
                body: JSON.stringify({ records: localStatusesToSync }),
              }).catch(() => {});
            }

            // Also preserve any recently added local submissions not yet present in server response
            const existingIds = new Set(cleanList.map((c) => c.id));
            const existingPhones = new Set(cleanList.map((c) => c.userPhone.replace(/\D/g, '')).filter(Boolean));

            const additionalLocal = prev.filter((p) => {
              const pPhone = p.userPhone.replace(/\D/g, '');
              return !existingIds.has(p.id) && (!pPhone || !existingPhones.has(pPhone));
            });

            const finalList = [...additionalLocal, ...merged];

            if (typeof window !== 'undefined') {
              localStorage.setItem('nazazi_payment_submissions', JSON.stringify(finalList));
            }
            return finalList;
          });
        }
        if (data.connection) {
          setConnectionInfo(data.connection);
        }
      }
    } catch (err) {
      console.warn('Live registrations fetch notice:', err);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Automatic real-time background sync every 3 seconds across all devices
  useEffect(() => {
    // Initial fetch
    fetchRegistrations(false);

    // Fast 3-second background polling
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchRegistrations(true);
    }, 3000);

    // Instant sync when tab gains focus or screen turns on
    const handleFocus = () => {
      fetchRegistrations(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      }
    };
  }, [fetchRegistrations]);

  const submitPayment = async (data: {
    id?: string;
    userName: string;
    userPhone: string;
    planName: string;
    amount: number;
    screenshotUrl: string;
    userId?: string;
    userEmail?: string;
    payerName?: string;
    transactionId?: string;
  }): Promise<PaymentSubmission> => {
    // If an authentic server record ID is already provided, use it directly
    if (data.id) {
      const realSubmission: PaymentSubmission = {
        id: String(data.id),
        userId: data.userId || `usr_${String(data.id).replace(/\D/g, '').slice(-6) || Math.random().toString(36).substring(2, 7)}`,
        userName: data.userName,
        userEmail: data.userEmail || `${data.userPhone.replace(/\D/g, '')}@subscriber.nazazi.io`,
        userPhone: data.userPhone,
        planName: data.planName,
        amount: data.amount,
        currency: 'ETB',
        payerName: data.payerName || data.userName,
        transactionId: data.transactionId || `TXN-${String(data.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'SUB'}`,
        screenshotUrl: data.screenshotUrl,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };

      setSubmissions((prev) => {
        const cleanPhone = data.userPhone.replace(/\D/g, '');
        const filtered = prev.filter(
          (s) => s.id !== data.id && (!cleanPhone || s.userPhone.replace(/\D/g, '') !== cleanPhone)
        );
        const updated = [realSubmission, ...filtered];
        if (typeof window !== 'undefined') {
          localStorage.setItem('nazazi_payment_submissions', JSON.stringify(updated));
        }
        return updated;
      });

      return realSubmission;
    }

    // Direct submit to /api/register
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.userName,
          phone_number: data.userPhone,
          payment_image: data.screenshotUrl,
          plan_name: data.planName,
          amount: data.amount,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.registration) {
          const finalSubmission = mapRecordToSubmission(resData.registration);
          setSubmissions((prev) => {
            const cleanPhone = data.userPhone.replace(/\D/g, '');
            const filtered = prev.filter(
              (s) => s.id !== finalSubmission.id && (!cleanPhone || s.userPhone.replace(/\D/g, '') !== cleanPhone)
            );
            const updated = [finalSubmission, ...filtered];
            if (typeof window !== 'undefined') {
              localStorage.setItem('nazazi_payment_submissions', JSON.stringify(updated));
            }
            return updated;
          });
          return finalSubmission;
        }
      }
    } catch (apiErr) {
      console.warn('API registration submission notice:', apiErr);
    }

    // Fallback local submission
    const fallbackId = `reg_${Date.now().toString(36)}`;
    const fallbackSubmission: PaymentSubmission = {
      id: fallbackId,
      userId: `usr_${Date.now().toString(36)}`,
      userName: data.userName,
      userEmail: `${data.userPhone.replace(/\D/g, '')}@subscriber.nazazi.io`,
      userPhone: data.userPhone,
      planName: data.planName,
      amount: data.amount,
      currency: 'ETB',
      payerName: data.payerName || data.userName,
      transactionId: `TXN-${Date.now().toString().slice(-6)}`,
      screenshotUrl: data.screenshotUrl,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    setSubmissions((prev) => [fallbackSubmission, ...prev.filter((s) => s.id !== fallbackId)]);
    return fallbackSubmission;
  };

  const approvePayment = async (id: string, phone?: string) => {
    // 1. Determine target phone before asynchronous React state updates
    const existing = submissions.find((s) => s.id === id);
    const targetPhone = phone || existing?.userPhone || '';

    setSubmissions((prev) => {
      const updated = prev.map((sub) => {
        if (sub.id === id || (targetPhone && phoneMatches(sub.userPhone, targetPhone))) {
          return { ...sub, status: 'approved' as const, reviewedAt: new Date().toISOString() };
        }
        return sub;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('nazazi_payment_submissions', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      const headers = getAdminAuthHeaders();
      await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, phone: targetPhone, status: 'approved' }),
      });
      fetchRegistrations(true);
    } catch (err) {
      console.warn('Status update notice:', err);
    }
  };

  const rejectPayment = async (id: string, phone?: string) => {
    // 1. Determine target phone before asynchronous React state updates
    const existing = submissions.find((s) => s.id === id);
    const targetPhone = phone || existing?.userPhone || '';

    setSubmissions((prev) => {
      const updated = prev.map((sub) => {
        if (sub.id === id || (targetPhone && phoneMatches(sub.userPhone, targetPhone))) {
          return { ...sub, status: 'rejected' as const, reviewedAt: new Date().toISOString() };
        }
        return sub;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('nazazi_payment_submissions', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      const headers = getAdminAuthHeaders();
      await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, phone: targetPhone, status: 'rejected' }),
      });
      fetchRegistrations(true);
    } catch (err) {
      console.warn('Status update notice:', err);
    }
  };

  const updatePaymentPlan = async (id: string, planName: string, amount: number, phone?: string) => {
    const existing = submissions.find((s) => s.id === id);
    const targetPhone = phone || existing?.userPhone || '';

    setSubmissions((prev) => {
      const updated = prev.map((sub) => {
        if (sub.id === id || (targetPhone && phoneMatches(sub.userPhone, targetPhone))) {
          return { ...sub, planName, amount };
        }
        return sub;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('nazazi_payment_submissions', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      const headers = getAdminAuthHeaders();
      await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, phone: targetPhone, planName, amount }),
      });
      fetchRegistrations(true);
    } catch (err) {
      console.warn('Plan update notice:', err);
    }
  };

  const deletePayment = async (id: string, phone?: string) => {
    const existing = submissions.find((s) => s.id === id);
    const targetPhone = phone || existing?.userPhone || '';

    setSubmissions((prev) => {
      const updated = prev.filter((sub) => {
        if (sub.id === id) return false;
        if (targetPhone && phoneMatches(sub.userPhone, targetPhone)) return false;
        return true;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('nazazi_payment_submissions', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      const headers = getAdminAuthHeaders();
      const params = new URLSearchParams();
      if (id) params.append('id', id);
      if (targetPhone) params.append('phone', targetPhone);
      await fetch(`/api/admin/registrations?${params.toString()}`, {
        method: 'DELETE',
        headers,
      });
      fetchRegistrations(true);
    } catch (err) {
      console.warn('Delete registration notice:', err);
    }
  };

  const resetAllData = async () => {
    setSubmissions([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nazazi_payment_submissions');
    }

    try {
      const headers = getAdminAuthHeaders();
      await fetch('/api/admin/registrations?action=reset', {
        method: 'DELETE',
        headers,
      });
      fetchRegistrations(true);
    } catch (err) {
      console.warn('Reset database notice:', err);
    }
  };

  const getSubmissionByPhone = useCallback((phone: string): PaymentSubmission | undefined => {
    if (!phone) return undefined;
    return submissions.find((sub) => phoneMatches(sub.userPhone, phone));
  }, [submissions]);

  /**
   * Live lookup directly against /api/registrations?phone=...
   * Ensures production users instantly get their real status (approved, pending, rejected)
   */
  const checkStatusLive = useCallback(async (phone: string): Promise<PaymentSubmission | null> => {
    const raw = (phone || '').trim();
    if (!raw) return null;

    try {
      const lookupPhone = canonicalPhone(raw) || raw;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`/api/registrations?phone=${encodeURIComponent(lookupPhone)}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.registration) {
          const freshSub = mapRecordToSubmission(data.registration);

          // Synchronize locally so state stays updated
          setSubmissions((prev) => {
            const filtered = prev.filter(
              (s) => s.id !== freshSub.id && !phoneMatches(s.userPhone, freshSub.userPhone)
            );
            const updated = [freshSub, ...filtered];
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('nazazi_payment_submissions', JSON.stringify(updated));
              } catch {
                // ignore
              }
            }
            return updated;
          });

          return freshSub;
        }
      }
    } catch (err) {
      console.warn('Live status check network notice:', err);
    }

    // Fallback to local memory / local storage
    return submissions.find((sub) => phoneMatches(sub.userPhone, raw)) || null;
  }, [submissions]);

  return (
    <PaymentContext.Provider
      value={{
        submissions,
        selectedPlanForCheckout,
        isLoading,
        connectionInfo,
        setSelectedPlanForCheckout,
        fetchRegistrations,
        submitPayment,
        approvePayment,
        rejectPayment,
        updatePaymentPlan,
        deletePayment,
        resetAllData,
        getSubmissionByPhone,
        checkStatusLive,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
