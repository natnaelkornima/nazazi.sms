'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthMode, NavigationTab } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../context/PaymentContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowRight,
  Mail,
  Lock,
  User as UserIcon,
  KeyRound,
  Sparkles,
  Smartphone,
  ShieldAlert,
  Sun,
  HeartHandshake,
} from 'lucide-react';

interface AuthViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onNavigate }) => {
  const [mode, setMode] = useState<AuthMode>('register');
  const [email, setEmail] = useState('kornimah@gmail.com');
  const [password, setPassword] = useState('SuperSecret2026!');
  const [name, setName] = useState('Korni Mah');
  const [phone, setPhone] = useState('+251 91 123 4567');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error, info } = useToast();
  const { login } = useAuth();
  const { selectedPlanForCheckout } = usePayment();
  const { language, t } = useLanguage();
  const isAmharic = language === 'am';

  const handleLoginUser = (role: 'user' | 'admin' = 'user') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      login(email, password, role, name, phone);
      if (role === 'admin') {
        success(isAmharic ? 'እንደ አስተዳዳሪ ገብተዋል' : 'Authenticated as Administrator', 'Accessing Admin Console');
        onNavigate('admin');
      } else if (selectedPlanForCheckout) {
        success(isAmharic ? 'መለያዎ ዝግጁ ነው!' : 'Account Ready!', 'Proceed to upload payment screenshot for your plan.');
        onNavigate('payments');
      } else {
        success(isAmharic ? 'እንኳን ወደ ናዛዚ በደህና መጡ!' : 'Welcome to Nazazi!', `SMS encouragement will be delivered to ${phone}`);
        onNavigate('payments');
      }
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      const isAdminEmail = email.toLowerCase().includes('admin');
      handleLoginUser(isAdminEmail ? 'admin' : 'user');
    } else if (mode === 'register') {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        success(isAmharic ? 'መለያ ተፈጥሯል!' : 'Account Created!', isAmharic ? 'የማረጋገጫ ኮድ ተልኳል።' : 'Verification code sent.');
        setMode('verify');
      }, 600);
    } else if (mode === 'forgot') {
      info(isAmharic ? 'የይለፍ ቃል ማደሻ ተልኳል' : 'Password reset link sent', `Sent instructions to ${email}`);
      setMode('login');
    } else if (mode === 'verify') {
      if (verificationCode.length >= 4) {
        login(email, password, 'user', name, phone);
        success(isAmharic ? 'ስልክዎ ተረጋግጧል!' : 'Email & Phone Verified!', isAmharic ? 'ወደ ክፍያ ማረጋገጫ ይለፉ' : 'Proceeding to payment screenshot upload');
        onNavigate('payments');
      } else {
        error(isAmharic ? 'የተሳሳተ የማረጋገጫ ኮድ' : 'Invalid verification code', isAmharic ? 'እባክዎ ትክክለኛ ኮድ ያስገቡ' : 'Please enter a valid 6-digit code.');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4 py-8">
      {/* Main Authentication Card with Sleek Shadow */}
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-zinc-200/80 dark:border-zinc-800/90 shadow-2xl shadow-zinc-300/40 dark:shadow-black/50 min-h-[580px]">
        
        {/* Left Column: Visual Brand Banner */}
        <div className="lg:col-span-5 bg-zinc-950 p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden text-white rounded-[1.5rem] m-2 min-h-[280px] lg:min-h-[540px]">
            {/* Glowing Amber Light Effect */}
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-300 opacity-40 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute top-1/2 -right-20 w-60 h-60 bg-gradient-to-br from-orange-600 via-amber-500 to-amber-700 opacity-25 blur-2xl rounded-full pointer-events-none" />

            {/* Top Brand Tag */}
            <div className="relative z-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm">
                N
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">NAZAZI SMS</span>
            </div>

            {/* Main Display Headline */}
            <div className="relative z-10 space-y-4 my-auto py-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.15] text-zinc-50">
                {isAmharic ? 'መንፈስዎን የሚያነቁ አጽናኝ የSMS መልእክቶች።' : 'Transform your heart with comforting spiritual SMS.'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm">
                {isAmharic
                  ? 'ለነፍስ እረፍት የሚሆኑ የመጽሐፍ ቅዱስ ቃላት እና የሚያበረታቱ ጥቅሶች በየቀኑ በስልክዎ ይደርስዎታል።'
                  : 'Receive scheduled encouragement, scriptures, and uplifting messages delivered straight to your mobile device.'}
              </p>
            </div>

            {/* Bottom Status / Badge */}
            <div className="relative z-10 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Smartphone className="w-3.5 h-3.5" /> {isAmharic ? 'ቀጥታ ወደ ሞባይል የሚላክ' : 'Direct Mobile Delivery'}
              </span>
              <span>{isAmharic ? 'የ24/7 ማበረታቻ' : '24/7 Encouragement'}</span>
            </div>
          </div>

          {/* Right Column: Form Area */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-6">
              
              {/* Header Icon & Title */}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Sun className="w-5 h-5 animate-pulse" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {mode === 'login' && (isAmharic ? 'እንኳን ደህና መጡ' : 'Welcome Back')}
                  {mode === 'register' && (isAmharic ? 'ይመዝገቡ' : 'Get Started')}
                  {mode === 'forgot' && (isAmharic ? 'የይለፍ ቃል ቀይር' : 'Reset Password')}
                  {mode === 'verify' && (isAmharic ? 'ስልክ እና ኢሜይል አረጋግጥ' : 'Verify Phone & Email')}
                </h2>
                
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  {mode === 'login' && (isAmharic ? 'ወደ መለያዎ ይግቡ' : "Welcome to Nazazi — Let's sign into your account")}
                  {mode === 'register' && (isAmharic ? 'አዲስ የመተግበሪያ መለያ ይክፈቱ' : "Welcome to Nazazi — Let's get started with your account")}
                  {mode === 'forgot' && (isAmharic ? 'የይለፍ ቃል መመሪያ እንዲላክሎት ኢሜይልዎን ያስገቡ' : 'Enter your email address to receive password instructions')}
                  {mode === 'verify' && (isAmharic ? `ወደ ${phone} የተላከውን የማረጋገጫ ኮድ ያስገቡ` : `Enter the verification code sent to ${phone}`)}
                </p>
              </div>

              {/* Main Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {/* Register Fields: Full Name & Phone Number */}
                  {mode === 'register' && (
                    <motion.div
                      key="reg-fields"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                          {isAmharic ? 'ሙሉ ስም' : 'Full Name'}
                        </label>
                        <Input
                          placeholder={isAmharic ? 'ምሳሌ፡ ኤፍሬም ተክሌ' : 'e.g. Korni Mah'}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          leftIcon={<UserIcon className="w-4 h-4 text-zinc-400" />}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                          {isAmharic ? 'የኤስኤምኤስ ስልክ ቁጥር' : 'Phone Number for SMS'}
                        </label>
                        <Input
                          placeholder="e.g. +251 91 123 4567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          leftIcon={<Smartphone className="w-4 h-4 text-zinc-400" />}
                          helperText={isAmharic ? 'አጽናኝ ኤስኤምኤስ ወደዚህ ስልክ ቁጥር ይላካል።' : 'Comforting SMS messages will be dispatched to this number.'}
                          required
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Email Field */}
                  {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                    <motion.div key="email-field" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                        {isAmharic ? 'ኢሜይል አድራሻ' : 'Your Email'}
                      </label>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail className="w-4 h-4 text-zinc-400" />}
                        required
                      />
                    </motion.div>
                  )}

                  {/* Password Field */}
                  {(mode === 'login' || mode === 'register') && (
                    <motion.div key="pass-field" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                        {mode === 'register' ? (isAmharic ? 'አዲስ የይለፍ ቃል ፍጠር' : 'Create new password') : (isAmharic ? 'የይለፍ ቃል' : 'Password')}
                      </label>
                      <Input
                        isPassword
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        leftIcon={<Lock className="w-4 h-4 text-zinc-400" />}
                        required
                      />
                      {mode === 'login' && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setMode('forgot')}
                            className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                          >
                            {isAmharic ? 'የይለፍ ቃል ረስተዋል?' : 'Forgot password?'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Verification Code Input */}
                  {mode === 'verify' && (
                    <motion.div
                      key="verify-code"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-3"
                    >
                      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        {isAmharic ? 'የ 6 አሃዝ ማረጋገጫ ኮድ ያስገቡ' : 'Enter 6-Digit Code'}
                      </label>
                      <Input
                        placeholder="e.g. 849201"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        leftIcon={<KeyRound className="w-4 h-4 text-zinc-400" />}
                        maxLength={6}
                        required
                      />
                      <p className="text-[11px] text-zinc-400">
                        {isAmharic ? 'ኮዱ አልደረሰዎትም?' : "Didn't receive code?"}{' '}
                        <button
                          type="button"
                          onClick={() => success(isAmharic ? `አዲስ ኮድ ወደ ${phone} ተልኳል` : 'New code sent to ' + phone)}
                          className="text-orange-600 dark:text-orange-400 underline font-semibold cursor-pointer"
                        >
                          {isAmharic ? 'የኤስኤምኤስ ኮድ እንደገና ላክ' : 'Resend SMS Code'}
                        </button>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Action Button */}
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md rounded-xl mt-2 py-3"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {mode === 'login' && (isAmharic ? 'ወደ ናዛዚ ይግቡ' : 'Sign in to Nazazi')}
                  {mode === 'register' && (isAmharic ? 'አዲስ መለያ ፍጠር' : 'Create new account')}
                  {mode === 'forgot' && (isAmharic ? 'የማደሻ ሊንክ ላክ' : 'Send Reset Link')}
                  {mode === 'verify' && (isAmharic ? 'አረጋግጥ እና ጀምር' : 'Verify & Activate')}
                </Button>
              </form>

              {/* Quick Demo Login Option */}
              {mode === 'login' && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                    <span>{isAmharic ? 'የሙከራ መለያዎች' : 'Quick Demo Login'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoginUser('user')}
                      className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 text-center cursor-pointer"
                    >
                      {isAmharic ? 'የአባላት መለያ' : 'Member Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoginUser('admin')}
                      className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/30 hover:bg-red-100/60 text-xs font-bold text-red-700 dark:text-red-300 text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> {isAmharic ? 'የአድሚን ኮንሶል' : 'Admin Panel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Mode Switch Footer */}
              <div className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {mode === 'login' && (
                  <p>
                    {isAmharic ? 'መለያ የለዎትም?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      {isAmharic ? 'አዲስ መለያ ተመዝገብ' : 'Create new account'}
                    </button>
                  </p>
                )}
                {mode === 'register' && (
                  <p>
                    {isAmharic ? 'መለያ አለዎት?' : 'Already have an account?'}{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      {isAmharic ? 'ይግቡ' : 'Login'}
                    </button>
                  </p>
                )}
                {(mode === 'forgot' || mode === 'verify') && (
                  <p>
                    {isAmharic ? 'ወደ ' : 'Back to '}{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      {isAmharic ? 'የመግቢያ ገጽ ተመለስ' : 'Sign in page'}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

