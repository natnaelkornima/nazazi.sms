'use client';

import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  User,
  Smartphone,
  Mail,
  HeartHandshake,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Edit2,
  Check,
  LogOut,
  Bell,
  Lock,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, updateUserPhone, logout } = useAuth();
  const { success, info } = useToast();
  const { t, language } = useLanguage();

  const [name, setName] = useState(user?.name || 'Korni Mah');
  const [phone, setPhone] = useState(user?.phone || '+251 91 123 4567');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserPhone(phone);
    setIsEditingPhone(false);
    success(
      language === 'am' ? 'የስልክ ቁጥር ተቀይሯል!' : 'Phone Number Updated!',
      language === 'am'
        ? `የወደፊት መንፈሳዊ SMS መልእክቶች ወደ ${phone} ይላካሉ`
        : `Future spiritual SMS messages will be sent to ${phone}`
    );
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingName(false);
    success(
      language === 'am' ? 'ስም ተቀይሯል' : 'Name Updated',
      language === 'am' ? 'የመገለጫ ስምዎ በተሳካ ሁኔታ ተዘምኗል።' : 'Your profile name has been updated.'
    );
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Sleek Thank You Banner */}
      <Card className="p-8 space-y-6 bg-gradient-to-br from-white via-zinc-50/80 to-emerald-50/20 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-emerald-950/20 border-zinc-200/90 dark:border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <HeartHandshake className="w-48 h-48 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="emerald" dot>
                  {language === 'am' ? 'ምዝገባው ተጠናቋል' : 'Registration Complete'}
                </Badge>
                <span className="text-[11px] font-semibold text-zinc-400 font-mono">
                  {language === 'am' ? 'የአባልነት መታወቂያ:' : 'Member ID:'} {user?.id || 'usr_01'}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
                {language === 'am' ? 'ስለተመዘገቡ እናመሰግናለን!' : 'Thank You for Registering with Nazazi!'}
              </h1>
            </div>
          </div>
        </div>

        {/* Highlighted SMS Notice Box */}
        <div className="p-5 rounded-2xl bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 shadow-md space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 dark:text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>{language === 'am' ? 'የSMS መንፈሳዊ አገልግሎት ተነቅቷል' : 'SMS Encouragement Enrollment Active'}</span>
          </div>
          <p className="text-sm sm:text-base font-semibold leading-relaxed">
            {language === 'am'
              ? 'አጽናኝ መንፈሳዊ መልእክቶችን፣ የሚያነቃቁ የመጽሐፍ ቅዱስ ቃላትን በተመዘገቡት ስልክ ቁጥር በቀጥታ ያገኛሉ:'
              : 'You will receive spiritual encouragement SMS messages directly at the phone number you registered:'}
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 text-emerald-300 dark:text-emerald-800 font-mono text-base font-bold tracking-wide mt-1">
            <Smartphone className="w-4 h-4" />
            <span>{user?.phone || phone}</span>
          </div>
        </div>
      </Card>

      {/* Member Login Information & Contact Details */}
      <Card className="p-6 space-y-6 border-zinc-200/90 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {language === 'am' ? 'የአባልነት መገለጫ እና የመግቢያ መረጃ' : 'Member Profile & Login Information'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {language === 'am'
                ? 'ለSMS አገልግሎት የተመዘገቡበት የስልክ ቁጥር እና የግል መረጃዎ'
                : 'Your registered account credentials and contact details for SMS delivery'}
            </p>
          </div>
          <Badge variant="zinc">{language === 'am' ? 'የተመዘገበ አባል' : 'Registered Member'}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Member Name */}
          <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{language === 'am' ? 'ሙሉ ስም' : 'Full Name'}</span>
              {!isEditingName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> {language === 'am' ? 'ቀይር' : 'Edit'}
                </button>
              )}
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
                <Button type="submit" size="sm" className="shrink-0">
                  {language === 'am' ? 'ስም አስቀምጥ' : 'Save'}
                </Button>
              </form>
            ) : (
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" />
                {user?.name || name}
              </p>
            )}
          </div>

          {/* Login Email */}
          <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
            <span className="text-xs font-medium text-zinc-500">{language === 'am' ? 'የመግቢያ ኢሜይል' : 'Login Email Address'}</span>
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-400" />
              {user?.email || 'kornimah@gmail.com'}
            </p>
          </div>

          {/* Registered Phone Number for SMS */}
          <div className="p-4 rounded-xl border border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {language === 'am' ? 'የተመዘገበ የስልክ ቁጥር (SMS የሚቀበልበት)' : 'Registered Phone Number (SMS Receiver)'}
              </span>
              {!isEditingPhone && (
                <button
                  onClick={() => setIsEditingPhone(true)}
                  className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> {language === 'am' ? 'ቁጥር ቀይር' : 'Change Phone Number'}
                </button>
              )}
            </div>

            {isEditingPhone ? (
              <form onSubmit={handleSavePhone} className="flex flex-col sm:flex-row gap-2 pt-1">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +251 91 123 4567"
                  className="text-xs font-mono"
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="shrink-0 font-bold">
                    {language === 'am' ? 'ቁጥር አስቀምጥ' : 'Save Number'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditingPhone(false)}
                    className="shrink-0"
                  >
                    {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 font-mono tracking-wide">
                    {user?.phone || phone}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {language === 'am'
                      ? 'የመንፈሳዊ ማነቃቂያ SMS መልእክቶች በቀጥታ ወደዚህ ስልክ ይላካሉ።'
                      : 'Your spiritual SMS messages are dispatched directly to this phone line.'}
                  </p>
                </div>
                <Badge variant="emerald">
                  <Check className="w-3 h-3 mr-1" /> {language === 'am' ? 'የተረጋገጠ ቁጥር' : 'Verified Phone'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Subscription & Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4 border-zinc-200/90 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-500" />
              {language === 'am' ? 'የክፍያ/የአባልነት ሁኔታ' : 'Subscription Status'}
            </h3>
            <Badge variant="emerald">
              {user?.plan || (language === 'am' ? 'የ3 ወር አባልነት' : '3 Months Access Plan')}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {language === 'am'
              ? 'ዕለታዊ እና ሳምንታዊ መንፈሳዊ ማነቃቂያዎችን በSMS የሚያገኙበት ንቁ የአባልነት ዕቅድ።'
              : 'Active membership providing continuous daily and weekly spiritual encouragement broadcasts straight to your mobile device.'}
          </p>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>{language === 'am' ? 'የሚታደስበት ቀን:' : 'Next Renewal:'}</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">August 01, 2026</span>
          </div>
        </Card>

        <Card className="p-6 space-y-4 border-zinc-200/90 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-500" />
              {language === 'am' ? 'የአካውንት ደህንነት' : 'Account Security'}
            </h3>
            <Badge variant="zinc">{language === 'am' ? 'የተጠበቀ' : 'Protected'}</Badge>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {language === 'am'
              ? 'የመግቢያ ኢሜይልዎ እና የስልክ ቁጥርዎ በደህንነት የተጠበቁ ናቸው። በፈለጉት ጊዜ ቁጥርዎን መቀየር ይችላሉ።'
              : 'Your login email and phone number are securely stored. You can update your phone number at any time to adjust where you receive SMS messages.'}
          </p>
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-zinc-500" />}
            >
              {language === 'am' ? 'ውጣ (Sign Out)' : 'Sign Out'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
