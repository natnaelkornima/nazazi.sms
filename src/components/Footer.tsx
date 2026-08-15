import React from 'react';
import { NavigationTab } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: NavigationTab) => void;
  onOpenVerifyModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenVerifyModal }) => {
  const { language, t } = useLanguage();
  const isAmharic = language === 'am';

  const handleVerifyClick = () => {
    if (onOpenVerifyModal) {
      onOpenVerifyModal();
    } else {
      onNavigate('landing');
    }
  };

  return (
    <footer className="w-full bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200/80 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-xs py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-950 font-black text-xs shadow-sm">
                N
              </div>
              <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                {t('header.title')}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
              {isAmharic
                ? 'የሚያበረታቱ መንፈሳዊ ጥቅሶች፣ የመጽሐፍ ቅዱስ ቃላቶች እና ኤስኤምኤስ በቀጥታ በስልክዎ ይደርስዎታል። ምንም መለያ መክፈት አይጠበቅብዎትም።'
                : 'Spiritual encouragement, uplifting Bible verses, and inspirational SMS delivered directly to your mobile phone. No account required.'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <p className="font-bold uppercase tracking-wider text-[10px] text-zinc-900 dark:text-zinc-200">
              {isAmharic ? 'ፈጣን አገልግሎት' : 'Quick Actions'}
            </p>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onNavigate('landing')} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer">
                  {isAmharic ? 'የ1 ወር እና የ3 ወር አገልግሎቶች' : 'Subscription Plans'}
                </button>
              </li>
              <li>
                <button onClick={handleVerifyClick} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer">
                  {isAmharic ? 'የአባልነት ማረጋገጫ በስልክ' : 'Verify Approval Status'}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('admin')} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  {isAmharic ? 'የአድሚን SMS ኮንሶል' : 'Admin SMS Console'}
                </button>
              </li>
            </ul>
          </div>

          {/* Community & Legal */}
          <div className="space-y-3">
            <p className="font-bold uppercase tracking-wider text-[10px] text-zinc-900 dark:text-zinc-200">
              {isAmharic ? 'ግንኙነት' : 'Connect'}
            </p>
            <ul className="space-y-2">
              <li>
                <a href="#" className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  {isAmharic ? 'ቴሌግራም ቻናል' : 'Telegram Channel'} <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  {isAmharic ? 'ድጋፍ እና እውቂያ' : 'Support & Contact'} <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};
