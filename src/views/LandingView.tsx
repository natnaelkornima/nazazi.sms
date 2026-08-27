'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { NavigationTab, PaymentSubmission } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SubscribeModal } from '../components/SubscribeModal';
import { SubscriptionStatusModal } from '../components/SubscriptionStatusModal';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Quote,
  Smartphone,
} from 'lucide-react';

interface LandingViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenVerifyModal?: (submission?: PaymentSubmission | null) => void;
  isVerifyModalOpen?: boolean;
  onCloseVerifyModal?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  onOpenVerifyModal,
  isVerifyModalOpen = false,
  onCloseVerifyModal,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { language, t } = useLanguage();
  const isAmharic = language === 'am';

  // Modal states
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [selectedPlanForSubscribe, setSelectedPlanForSubscribe] = useState<string>('');

  // Internal verify status modal state if opened locally without parent prop
  const [localVerifyModalOpen, setLocalVerifyModalOpen] = useState(false);
  const [verifySubmission, setVerifySubmission] = useState<PaymentSubmission | null>(null);

  // Check URL query params for direct Instagram campaigns (e.g. ?plan=3m, ?plan=6m, ?subscribe=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const planParam = params.get('plan') || params.get('plan_name') || params.get('tier');
        const subscribeParam = params.get('subscribe') || params.get('register');

        if (planParam) {
          const lower = planParam.toLowerCase();
          if (lower.includes('1m') || lower.includes('200')) {
            sessionStorage.setItem('nazazi_selected_plan_id', '1m');
            localStorage.setItem('nazazi_selected_plan_id', '1m');
            setSelectedPlanForSubscribe('1 Month Access (200 Birr)');
          } else if (lower.includes('3m') || lower.includes('600')) {
            sessionStorage.setItem('nazazi_selected_plan_id', '3m');
            localStorage.setItem('nazazi_selected_plan_id', '3m');
            setSelectedPlanForSubscribe('3 Months Access (600 Birr)');
          } else if (lower.includes('6m') || lower.includes('1000') || lower.includes('1,000')) {
            sessionStorage.setItem('nazazi_selected_plan_id', '6m');
            localStorage.setItem('nazazi_selected_plan_id', '6m');
            setSelectedPlanForSubscribe('6 Months Access (1,000 Birr)');
          }
        }

        if (subscribeParam === 'true' || subscribeParam === '1') {
          setIsSubscribeModalOpen(true);
        }
      } catch {}
    }
  }, []);

  const handleOpenSubscribe = (planName?: string, price?: string | number) => {
    if (planName && price) {
      const planStr = `${planName} (${price} Birr)`;
      setSelectedPlanForSubscribe(planStr);
      const lower = String(price).toLowerCase();
      if (typeof window !== 'undefined') {
        const planId = lower.includes('600') ? '3m' : lower.includes('1000') || lower.includes('1,000') ? '6m' : '1m';
        try {
          sessionStorage.setItem('nazazi_selected_plan_id', planId);
          localStorage.setItem('nazazi_selected_plan_id', planId);
        } catch {}
      }
    } else {
      setSelectedPlanForSubscribe('');
    }
    setIsSubscribeModalOpen(true);
  };

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      handleOpenSubscribe();
    }
  };

  const handleTriggerVerifyModal = (sub?: PaymentSubmission | null) => {
    if (onOpenVerifyModal) {
      onOpenVerifyModal(sub || null);
    } else {
      setVerifySubmission(sub || null);
      setLocalVerifyModalOpen(true);
    }
  };

  const handleCloseVerify = () => {
    if (onCloseVerifyModal) {
      onCloseVerifyModal();
    }
    setLocalVerifyModalOpen(false);
    setVerifySubmission(null);
  };

  const activeVerifyOpen = isVerifyModalOpen || localVerifyModalOpen;

  const pricingPlans = isAmharic
    ? [
      {
        name: 'የ6 ወር አገልግሎት',
        originalPrice: '1200',
        price: '1000',
        period: 'ለ6 ወር',
        badge: 'እጅግ ተመራጭ',
        savingsBadge: '200 ብር ቅናሽ',
        popular: true,
        cta: 'ለ6 ወር ተመዝገብ',
        ctaVariant: 'primary' as const,
        features: [
          'የየዕለቱ የሚያጽናና SMS እንልካለን',
          'ያለማቋረጥ ለ6 ወራት የሚላክ',
          'ልዩ VIP ቅድሚያ SMS እንልካለን እና ድጋፍ',
        ],
      },
      {
        name: 'የ3 ወር አገልግሎት',
        price: '600',
        period: 'ለ3 ወር',
        badge: 'ተወዳጅ አማራጭ',
        popular: false,
        cta: 'ለ3 ወር ተመዝገብ',
        ctaVariant: 'secondary' as const,
        features: [
          'የየዕለቱ የሚያጽናና SMS እንልካለን',
          'ያለማቋረጥ ለ3 ወራት የሚላክ',
          'ቅድሚያ የሚሰጠው SMS እንልካለን',
        ],
      },
      {
        name: 'የ1 ወር አገልግሎት',
        price: '200',
        period: 'ለ1 ወር',
        badge: 'ተለዋዋጭ',
        popular: false,
        cta: 'ለ1 ወር ተመዝገብ',
        ctaVariant: 'secondary' as const,
        features: [
          'የየዕለቱ የሚያጽናና SMS እንልካለን',
          'ያለማቋረጥ ለ1 ወራት የሚላክ',
          'ቀጥታ ወደ ሞባይል ስልክ የሚላክ',
        ],
      },
    ]
    : [
      {
        name: '6 Months Access',
        originalPrice: '1200',
        price: '1000',
        period: '6 Months',
        badge: 'Best Value',
        savingsBadge: 'Save 200 Birr',
        popular: true,
        cta: 'Register for 6 Months',
        ctaVariant: 'primary' as const,
        features: [
          'Daily spiritual SMS broadcasts',
          '6 months continuous delivery',
          'VIP Priority dispatch & support',
        ],
      },
      {
        name: '3 Months Access',
        price: '600',
        period: '3 Months',
        badge: 'Popular',
        popular: false,
        cta: 'Register for 3 Months',
        ctaVariant: 'secondary' as const,
        features: [
          'Daily spiritual SMS broadcasts',
          '3 months continuous delivery',
          'Priority SMS dispatch',
        ],
      },
      {
        name: '1 Month Access',
        price: '200',
        period: '1 Month',
        badge: 'Flexible',
        popular: false,
        cta: 'Register for 1 Month',
        ctaVariant: 'secondary' as const,
        features: [
          'Daily spiritual SMS broadcasts',
          'Direct mobile phone delivery',
          'Instant phone verification',
        ],
      },
    ];

  const faqs = isAmharic
    ? [
      {
        question: 'ናዛዚ ማለት ምን ማለት ነው? ተልዕኮውስ ምንድን ነው?',
        answer: 'ናዛዚ ማለት "አጽናኝ/ተስፋ" ማለት ነው። እርሶን ለማበረታታት እና ለማፅናናት የሚያነቃቁ መንፈሳዊ መልእክቶችን እና ጥቅሶችን በSMS እናደርሳለን።',
      },
      {
        question: 'ለመመዝገብ መለያ (Account) መክፈት ወይም ኢሜይል ያስፈልጋል?',
        answer: 'አይ! ምንም መለያ ወይም ኢሜይል መክፈት አይጠበቅብዎትም። በስምዎ፣ በስልክ ቁጥርዎ እና በክፍያ ደረሰኝ ፎቶ (Screenshot) በቀጥታ ይመዘገባሉ።',
      },
      {
        question: 'የተላከውን ክፍያ ማረጋገጫ (Approval) እንዴት ማወቅ እችላለሁ?',
        answer: 'በአሰሳ አሞሌው (Navbar) ላይ ማስተካከያዎችን (Settings Icon) በመጫን "የአባልነት ማረጋገጫ" የሚለውን በመምረጥ የስልክ ቁጥርዎን በማስገባት የተከፈለው ክፍያ በአድሚን መረጋገጡን ወዲያውኑ ማየት ይችላሉ።',
      },
      {
        question: 'የስልክ ቁጥሬ በጥንቃቄ የተጠበቀ እና ምስጢራዊ ነው?',
        answer: 'አዎ። የአባላት መረጃ በጥብቅ የተጠበቀ ሲሆን ለተመረጠው የSMS አገልግሎት ብቻ ይውላል።',
      },
    ]
    : [
      {
        question: 'What is Nazazi SMS and how does it work?',
        answer: 'Nazazi means "Comforter/Encourager". We send uplifting, comforting spiritual messages and scriptures directly to your phone via SMS daily.',
      },
      {
        question: 'Do I need to create an account or provide an email?',
        answer: 'No! No user login or registration account is required. Simply provide your name, phone number, and a screenshot of your bank payment transfer.',
      },
      {
        question: 'How do I check if my payment has been approved?',
        answer: 'You can verify anytime by clicking "Verify Approval Status" or the Settings icon in the header and entering your registered phone number.',
      },
      {
        question: 'Is my phone number kept safe and private?',
        answer: 'Yes. All subscriber contact details are securely managed and exclusively used for the Nazazi spiritual encouragement SMS delivery.',
      },
    ];

  return (
    <div className="space-y-16 sm:space-y-28 lg:space-y-36 pb-20 sm:pb-28 overflow-hidden">
      {/* Hero Section Container: Full-screen on mobile (taking 4rem header into account) */}
      <div className="relative min-h-[calc(100svh-4rem)] flex flex-col justify-center items-center bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b40_1px,transparent_1px),linear-gradient(to_bottom,#1e293b40_1px,transparent_1px)] bg-[size:36px_36px] py-10 sm:py-16">
        {/* Soft radial mask to fade grid edges */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_30%,white_90%] dark:bg-radial-[circle_at_center,transparent_30%,#09090B_90%] pointer-events-none" />

        {/* Hero Content */}
        <section className="relative text-center max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 flex flex-col justify-center items-center z-10 w-full my-auto">
          {/* Top Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-xs"
          >
            <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[10px] font-black uppercase tracking-wider shadow-2xs">
              {isAmharic ? 'አዲስ' : 'New'}
            </span>
            <span>{isAmharic ? 'ለነፍስ የቀረቡ መልዕክቶች' : 'Meet Nazazi SMS'}</span>
          </motion.div>

          {/* Main Large Brand Title with Smooth Animated Gradient Text */}
          <div className="relative flex justify-center items-center my-1 sm:my-2">
            {/* Subtle live glowing aura behind Nazazi */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-zinc-300/30 via-zinc-400/40 to-zinc-300/30 dark:from-zinc-700/30 dark:via-zinc-600/40 dark:to-zinc-700/30 rounded-full blur-3xl -z-10 pointer-events-none"
              animate={{ 
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{ 
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <h1 className="text-7xl sm:text-8xl lg:text-9xl xl:text-[115px] font-black tracking-tight leading-none select-none drop-shadow-md">
              <motion.span
                className={`bg-gradient-to-r from-zinc-950 via-zinc-500 to-zinc-950 dark:from-white dark:via-zinc-300 dark:to-white bg-[length:200%_100%] bg-clip-text text-transparent inline-block pb-1 ${
                  isAmharic ? 'font-nazazi' : ''
                }`}
                animate={{
                  backgroundPosition: ['0% 50%', '200% 50%']
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                {t('header.title')}
              </motion.span>
            </h1>
          </div>

          {/* Subtitle Text */}
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200 leading-snug max-w-2xl mx-auto"
          >
            {isAmharic ? (
              <>
                <span className="font-nazazi font-bold">ናዛዚ</span> የሚያጽናኑ የሚያበረቱ ለልብ የሆኑ የእግዚአብሔር ቃላት
              </>
            ) : (
              t('landing.heroTitle')
            )}
          </motion.h2>

          {/* Clean High-Contrast Action Buttons with Fixed Compact Padding & 5px Radius */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 sm:gap-3 pt-2 sm:pt-4 w-auto mx-auto"
          >
            {/* Subscribe Now Button */}
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98, y: 0 }}
              onClick={scrollToPricing}
              className="group relative w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-[5px] font-bold text-xs sm:text-sm text-white bg-zinc-950 hover:bg-zinc-900 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 shadow-[0_4px_14px_rgba(0,0,0,0.2)] dark:shadow-[0_4px_14px_rgba(255,255,255,0.12)] transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 border border-zinc-800/80 dark:border-zinc-200 ring-1 ring-white/15 dark:ring-black/10 overflow-hidden shrink-0"
            >
              {/* Animated Light Sweep Reflection */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent pointer-events-none" />

              <span className="relative z-10 tracking-tight whitespace-nowrap">{isAmharic ? 'ይመዝገቡ' : 'Subscribe Now'}</span>
              <ArrowRight className="relative z-10 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-300 dark:text-zinc-700 transition-transform duration-200 group-hover:translate-x-1 shrink-0" />
            </motion.button>

            {/* Verify Approval Status Button */}
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98, y: 0 }}
              onClick={() => handleTriggerVerifyModal()}
              className="group relative w-auto px-3.5 py-2 sm:px-4.5 sm:py-2.5 rounded-[5px] font-semibold text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-900 backdrop-blur-md border border-zinc-300/80 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)] hover:shadow-md transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
            >
              {/* Subtle Live Pulse Beacon on Smartphone Icon */}
              <div className="relative flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-700 dark:text-zinc-300 transition-transform duration-200 group-hover:scale-110" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              </div>
              <span className="tracking-tight whitespace-nowrap">{isAmharic ? 'የአባልነት ማረጋገጫ በስልክ ቁጥር' : 'Verify Approval Status'}</span>
            </motion.button>
          </motion.div>
        </section>

        {/* Subtle scroll down indicator on mobile/desktop */}
        <div className="pt-6 pb-2 text-center text-zinc-400 dark:text-zinc-600 hidden sm:block">
          <button
            onClick={scrollToPricing}
            className="inline-flex flex-col items-center gap-1 text-[11px] font-semibold hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <span>{isAmharic ? 'ወደ ዋጋ ዝርዝር' : 'Explore Plans'}</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
          </button>
        </div>
      </div>

      {/* Pricing Cards Section: Screen-spaced and scroll-anchored */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14 scroll-mt-20 sm:scroll-mt-24 min-h-[calc(100svh-4rem)] sm:min-h-0 flex flex-col justify-center py-6 sm:py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative text-center space-y-4 max-w-2xl mx-auto px-2"
        >
          {/* Subtle glowing backdrop behind section title */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-36 bg-zinc-300/30 dark:bg-zinc-700/20 blur-3xl rounded-full pointer-events-none -z-10" />

          {/* Sleek Floating Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-200/90 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-xs">
            <span className="text-xs font-bold tracking-wide uppercase text-zinc-800 dark:text-zinc-200">
              {t('landing.pricingHeaderTitle')}
            </span>
          </div>

          {/* Sleek Gradient Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
            <span className="bg-gradient-to-r from-zinc-950 via-zinc-600 to-zinc-950 dark:from-white dark:via-zinc-300 dark:to-white bg-[length:200%_100%] bg-clip-text text-transparent inline-block">
              {t('landing.pricingHeaderSubtitle')}
            </span>
          </h2>

          {/* Sleek Subtitle Text */}
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto font-normal leading-relaxed">
            {t('landing.pricingSubText')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto items-stretch">
          {pricingPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="h-full"
            >
              <Card
                className={`relative h-full flex flex-col justify-between p-5 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-300 ${plan.popular
                  ? 'border-2 border-zinc-900 dark:border-zinc-100 shadow-xl ring-2 ring-zinc-900/10 dark:ring-zinc-100/15 bg-white dark:bg-zinc-900 hover:scale-[1.015]'
                  : 'border border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-white/95 dark:bg-zinc-900/80 shadow-xs hover:shadow-md'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-md flex items-center gap-1 border border-zinc-700 dark:border-zinc-300">
                      {isAmharic ? 'እጅግ ተመራጭ' : 'Best Value'}
                    </span>
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* Top Header with Name & Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                      {plan.name}
                    </h3>
                    <Badge variant={plan.popular ? 'emerald' : 'zinc'} className="text-[10px] py-0.5 px-2 font-bold">
                      {plan.badge}
                    </Badge>
                  </div>

                  {/* Compact Pricing Section */}
                  <div className="pt-1">
                    {plan.originalPrice ? (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs sm:text-sm font-bold text-zinc-400 dark:text-zinc-500 line-through decoration-zinc-400 dark:decoration-zinc-500 decoration-1.5">
                          {plan.originalPrice} {isAmharic ? 'ብር' : 'Birr'}
                        </span>
                        {plan.savingsBadge && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {plan.savingsBadge}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-4.5 sm:h-5" />
                    )}

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-3.5xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {isAmharic ? 'ብር' : 'Birr'} / {plan.period}
                      </span>
                    </div>
                  </div>

                  {/* 3 Compact Feature Bullets */}
                  <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <div className="w-4 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                          <Check className="w-2.5 h-2.5 text-zinc-900 dark:text-zinc-100 stroke-[3]" />
                        </div>
                        <span className="font-medium truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Snug Action Button */}
                <div className="pt-4 mt-2">
                  <Button
                    variant={plan.ctaVariant}
                    className={`w-full font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all ${
                      plan.popular ? 'shadow-md hover:shadow-lg' : ''
                    }`}
                    onClick={() => handleOpenSubscribe(plan.name, plan.price)}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonial Section: Cleanly spaced */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-[50svh] sm:min-h-0 flex flex-col justify-center">
        <div className="bg-zinc-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden border border-zinc-800">
          <Quote className="w-8 h-8 text-zinc-400 dark:text-zinc-500 mx-auto" />
          <blockquote className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto">
            {t('landing.testimonialQuote')}
          </blockquote>
          <div>
            <p className="font-bold text-sm text-white">{t('landing.testimonialAuthor')}</p>
            <p className="text-xs text-zinc-400">{t('landing.testimonialRole')}</p>
          </div>
        </div>
      </section>

      {/* FAQ Section: Cleanly spaced */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-6 sm:py-12 min-h-[60svh] sm:min-h-0 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <Badge variant="zinc">FAQ</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t('landing.faqTitle')}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                      }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <motion.section
        initial={{ opacity: 0, y: 50, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-5xl mx-auto px-4 py-6 sm:py-10 min-h-[45svh] sm:min-h-0 flex flex-col justify-center"
      >
        <div className="p-8 sm:p-10 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAmharic ? 'ተስፋን እና መንፈሳዊ ህዳሴን ይቀበሉ' : 'Receive Hope & Spiritual Renewal'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-600 leading-relaxed">
              {isAmharic
                ? 'የሚያጽናኑ የSMS መልእክቶችን ለማግኘት ስምዎን እና ስልክ ቁጥርዎን ያስገቡ።'
                : 'Submit your Name and Phone number to receive comforting spiritual SMS messages.'}
            </p>
          </div>

          <div className="flex flex-row flex-wrap sm:flex-nowrap items-center justify-center gap-2.5 sm:gap-3">
            <Button
              size="md"
              onClick={scrollToPricing}
              className="w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-[5px] text-xs sm:text-sm bg-white text-zinc-950 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 font-extrabold shadow-md shrink-0"
            >
              {isAmharic ? 'አሁኑኑ ተመዝገቡ' : 'Subscribe Now'}
            </Button>
            <Button
              size="md"
              variant="outline"
              onClick={() => handleTriggerVerifyModal(null)}
              className="w-auto px-3.5 py-2 sm:px-4.5 sm:py-2.5 rounded-[5px] text-xs sm:text-sm border-zinc-700 dark:border-zinc-300 text-zinc-200 dark:text-zinc-800 font-bold shrink-0"
            >
              {isAmharic ? 'የአባልነት ማረጋገጫ በስልክ ቁጥር' : 'Verify Approval Status'}
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Subscribe Modal Triggered Direct */}
      <SubscribeModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        initialPlan={selectedPlanForSubscribe}
        onSuccess={(sub) => {
          if (onOpenVerifyModal) {
            onOpenVerifyModal(sub);
          } else {
            setVerifySubmission(sub);
            setLocalVerifyModalOpen(true);
          }
        }}
      />

      {/* Phone Number Verification Status Popup Modal (Fallback for isolated renders) */}
      {!onOpenVerifyModal && (
        <SubscriptionStatusModal
          isOpen={localVerifyModalOpen}
          onClose={handleCloseVerify}
          submission={verifySubmission}
          onResubmit={() => setIsSubscribeModalOpen(true)}
        />
      )}
    </div>
  );
};
