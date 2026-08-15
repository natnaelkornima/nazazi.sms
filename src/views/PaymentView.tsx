'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { GlassFolderUploader } from '../components/ui/GlassFolderUploader';
import { SubscriptionStatusModal } from '../components/SubscriptionStatusModal';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { PaymentSubmission } from '../types';
import {
  CreditCard,
  Check,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Clock,
  Search,
  Upload,
  ArrowRight,
  FileCheck,
  Building2,
  Copy,
  Info,
} from 'lucide-react';

export const PaymentView: React.FC = () => {
  const { user } = useAuth();
  const {
    submitPayment,
    getSubmissionByPhone,
    selectedPlanForCheckout,
    setSelectedPlanForCheckout,
    submissions,
  } = usePayment();
  const { success, error, info } = useToast();
  const { language, t } = useLanguage();
  const isAmharic = language === 'am';

  // Form states
  const [plan, setPlan] = useState<string>(
    selectedPlanForCheckout || (isAmharic ? 'የ6 ወር አገልግሎት (1000 ብር)' : '6 Months Access Plan (1000 Birr)')
  );
  const [payerName, setPayerName] = useState(user?.name || 'Korni Mah');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phone Lookup State
  const [phoneQuery, setPhoneQuery] = useState(user?.phone || '+251 91 123 4567');
  const [lookedUpSubmission, setLookedUpSubmission] = useState<PaymentSubmission | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  useEffect(() => {
    if (selectedPlanForCheckout) {
      setPlan(selectedPlanForCheckout);
    }
  }, [selectedPlanForCheckout]);

  const handlePhoneLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneQuery.trim()) {
      error(isAmharic ? 'እባክዎ የስልክ ቁጥር ያስገቡ' : 'Please enter a phone number', 'Type your registered phone number to check status.');
      return;
    }
    const found = getSubmissionByPhone(phoneQuery);
    setLookedUpSubmission(found || null);
    setIsStatusModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payerName.trim()) {
      error(isAmharic ? 'የከፋይ ስም ያስፈልጋል' : 'Payer name required', 'Please enter the name on the payment account.');
      return;
    }
    if (!transactionId.trim()) {
      error(isAmharic ? 'የግብይት መለያ ቁጥር ያስፈልጋል' : 'Transaction ID required', 'Please enter the receipt transaction ID / reference code.');
      return;
    }
    if (!screenshotDataUrl) {
      error(isAmharic ? 'የክፍያ ደረሰኝ ፎቶ ያስፈልጋል' : 'Payment screenshot required', 'Please upload a clear screenshot of your payment receipt.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isSixMonth = plan.includes('6 Month') || plan.includes('የ6 ወር') || plan.includes('1000');
      const isOneMonth = plan.includes('1 Month') || plan.includes('የ1 ወር') || plan.includes('200');
      const amount = isSixMonth ? 1000 : isOneMonth ? 200 : 600;
      const newSub = await submitPayment({
        userId: user?.id || 'usr_guest',
        userName: user?.name || payerName,
        userEmail: user?.email || 'member@nazazi.io',
        userPhone: user?.phone || phoneQuery || '+251 91 123 4567',
        planName: plan,
        amount: amount,
        payerName: payerName,
        transactionId: transactionId,
        screenshotUrl: screenshotDataUrl,
      });

      setSelectedPlanForCheckout(null);
      setLookedUpSubmission(newSub);
      setIsStatusModalOpen(true);
      success(isAmharic ? 'የክፍያ ደረሰኝ ተላኳል!' : 'Payment Receipt Submitted!', isAmharic ? 'የማረጋገጫ ሁኔታ፡ በማረጋገጥ ላይ' : 'Status set to Pending Approval.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    info(isAmharic ? 'ተቀድቷል' : `Copied ${title}`, text);
  };

  // Find latest user submission
  const userSubmission = user ? getSubmissionByPhone(user.phone) : undefined;

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {isAmharic ? 'የክፍያ እና ደንበኝነት ማረጋገጫ' : 'Subscription & Payment Verification'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {isAmharic ? 'የክፍያ ደረሰኝ ፎቶ ይላኩ፣ የትራንዛክሽን መለያ ያረጋግጡ እና የአገልግሎት ሁኔታን ይመልከቱ።' : 'Submit payment receipt screenshots, verify transaction IDs, and check active phone status.'}
          </p>
        </div>

        {/* Quick Phone Status Checker Widget */}
        <form onSubmit={handlePhoneLookup} className="flex items-center gap-2">
          <Input
            placeholder={isAmharic ? 'ስልክ ቁጥር ያስገቡ...' : 'Enter phone number...'}
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            leftIcon={<Smartphone className="w-3.5 h-3.5 text-zinc-400" />}
            className="w-48 sm:w-56 h-9 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" className="font-bold text-xs shrink-0">
            {isAmharic ? 'ሁኔታ አረጋግጥ' : 'Check Status'}
          </Button>
        </form>
      </div>

      {/* If user already has an approved or pending submission, highlight status banner */}
      {userSubmission && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {isAmharic ? `${userSubmission.userPhone} የኤስኤምኤስ ሁኔታ` : `Current Phone Status for ${userSubmission.userPhone}`}
                </h3>
                {userSubmission.status === 'pending' && <Badge variant="amber">{isAmharic ? 'በማረጋገጥ ላይ' : 'Pending Approval'}</Badge>}
                {userSubmission.status === 'approved' && <Badge variant="emerald">{isAmharic ? 'የተረጋገጠ እና ንቁ' : 'Approved & Active'}</Badge>}
                {userSubmission.status === 'rejected' && <Badge variant="danger">{isAmharic ? 'ተቀባይነት አላገኘም' : 'Rejected'}</Badge>}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {userSubmission.status === 'pending' && (isAmharic ? 'ክፍያዎ በአድሚን በማረጋገጥ ላይ ይገኛል።' : 'Your payment is undergoing admin verification.')}
                {userSubmission.status === 'approved' && (isAmharic ? 'የሚያጽናኑ የኤስኤምኤስ መልእክቶች በስራ ላይ ናቸው።' : 'SMS encouraging messages are active and delivering.')}
                {userSubmission.status === 'rejected' && (isAmharic ? 'የላኩት ደረሰኝ አልተቀበለም። እባክዎ እንደገና ይላኩ።' : 'Previous receipt was rejected. Please resubmit below.')}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setLookedUpSubmission(userSubmission);
              setIsStatusModalOpen(true);
            }}
            variant="outline"
            className="shrink-0 text-xs font-bold"
          >
            {isAmharic ? 'ሙሉ መረጃ ይመልከቱ' : 'View Full Status Modal'}
          </Button>
        </Card>
      )}

      {/* Main Payment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Bank Accounts & Plan Selection */}
        <div className="lg:col-span-5 space-y-6">
          {/* Plan Selector */}
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              {isAmharic ? '1. የደንበኝነት እቅድ ይምረጡ' : '1. Select Subscription Plan'}
            </h2>

            <div className="space-y-3">
              {/* 6 Months Plan */}
              <div
                onClick={() => setPlan(isAmharic ? 'የ6 ወር አገልግሎት (1000 ብር)' : '6 Months Access Plan (1000 Birr)')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  plan.includes('6 Month') || plan.includes('የ6 ወር')
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                } flex items-center justify-between`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{isAmharic ? 'የ6 ወር አገልግሎት' : '6 Months Plan'}</p>
                    <Badge variant="emerald">{isAmharic ? 'እጅግ ተመራጭ • 200 ብር ቅናሽ' : 'Best Value • Save 200'}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-zinc-400 line-through decoration-zinc-400 decoration-1">
                      1200 {isAmharic ? 'ብር' : 'ETB'}
                    </span>
                    <span className="text-xs text-zinc-500">• {isAmharic ? '1000 ብር / ለ6 ወር' : '1000 Birr total'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">1000</span>
                  <span className="text-xs text-zinc-400 ml-1">{isAmharic ? 'ብር' : 'ETB'}</span>
                </div>
              </div>

              {/* 3 Months Plan */}
              <div
                onClick={() => setPlan(isAmharic ? 'የ3 ወር አገልግሎት (600 ብር)' : '3 Months Access Plan (600 Birr)')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  (plan.includes('3 Months') || plan.includes('የ3 ወር')) && !plan.includes('6')
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                } flex items-center justify-between`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{isAmharic ? 'የ3 ወር አገልግሎት' : '3 Months Plan'}</p>
                    <Badge variant="zinc">{isAmharic ? 'ተወዳጅ አማራጭ' : 'Popular'}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{isAmharic ? '600 ብር / ለ3 ወር' : '600 Birr total / 3 Months'}</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">600</span>
                  <span className="text-xs text-zinc-400 ml-1">{isAmharic ? 'ብር' : 'ETB'}</span>
                </div>
              </div>

              {/* 1 Month Plan */}
              <div
                onClick={() => setPlan(isAmharic ? 'የ1 ወር አገልግሎት (200 ብር)' : '1 Month Access Plan (200 Birr)')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  plan.includes('1 Month') || plan.includes('የ1 ወር')
                    ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                } flex items-center justify-between`}
              >
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{isAmharic ? 'የ1 ወር አገልግሎት' : '1 Month Plan'}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{isAmharic ? '200 ብር / በወር • ተለዋዋጭ' : '200 Birr / month • Flexible'}</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">200</span>
                  <span className="text-xs text-zinc-400 ml-1">{isAmharic ? 'ብር' : 'ETB'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Bank Payment Instructions */}
          <Card className="p-6 space-y-4 bg-gradient-to-br from-zinc-900 to-zinc-950 text-white border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> 2. Official Payment Accounts
              </span>
              <Badge variant="amber">Direct Bank Transfer</Badge>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Transfer <strong className="text-white">
                {plan.includes('6 Month') || plan.includes('የ6 ወር') ? '1000 Birr' : plan.includes('1 Month') || plan.includes('የ1 ወር') ? '200 Birr' : '600 Birr'}
              </strong> to any of the official accounts below, then upload your payment screenshot:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* CBE */}
              <div className="p-3.5 rounded-lg bg-zinc-800/90 border border-zinc-700/80 space-y-1.5 shadow-2xs hover:border-zinc-600 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-amber-500" />
                    <span className="font-bold text-amber-400">CBE (ንግድ ባንክ)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('1000432169948', 'CBE Account Number')}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer"
                    title="Copy Account Number"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="font-mono text-sm font-extrabold tracking-wider text-white select-all">1000432169948</p>
                <p className="text-[11px] text-zinc-400">Account: Nazazi</p>
              </div>

              {/* Telebirr */}
              <div className="p-3.5 rounded-lg bg-zinc-800/90 border border-zinc-700/80 space-y-1.5 shadow-2xs hover:border-zinc-600 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                    <span className="font-bold text-emerald-400">Telebirr (ቴሌብር)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('0953886865', 'Telebirr Phone Number')}
                    className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors cursor-pointer"
                    title="Copy Phone Number"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="font-mono text-sm font-extrabold tracking-wider text-white select-all">0953886865</p>
                <p className="text-[11px] text-zinc-400">Account: Nazazi</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Payment Verification Upload Form */}
        <div className="lg:col-span-7">
          <Card className="p-6 sm:p-8 space-y-6 bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 shadow-xl">
            <div className="space-y-1 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" /> 3. Submit Payment Details & Screenshot
              </span>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
                Payment Verification Form
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Upload your payment receipt image and enter transaction details for admin verification.
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-5">
              {/* Payer Name */}
              <Input
                label="Payer Account Name"
                placeholder="Name as it appears on bank receipt (e.g. Korni Mah)"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
              />

              {/* Transaction ID */}
              <Input
                label="Transaction ID / Reference Number"
                placeholder="e.g. CBE-984102941 or FT260814981"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
              />

              {/* Glass Folder File Upload (Inspired by User Image) */}
              <GlassFolderUploader
                label="Upload Payment Screenshot Receipt"
                selectedImageUrl={screenshotDataUrl}
                onFileSelect={(dataUrl) => setScreenshotDataUrl(dataUrl)}
                onClear={() => setScreenshotDataUrl(null)}
              />

              {/* Notice Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="leading-relaxed">
                  Upon submission, your status will instantly change to <strong>Pending Approval</strong>. Once verified by the admin team, your status will update to <strong>Approved</strong>.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                className="w-full font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md rounded-xl py-3 text-sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Submit Payment Receipt for Approval
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Subscription Status Modal Popup */}
      <SubscriptionStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        submission={lookedUpSubmission}
        searchedPhone={phoneQuery}
      />
    </div>
  );
};
