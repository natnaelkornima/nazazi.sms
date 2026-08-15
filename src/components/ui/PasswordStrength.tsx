import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password?: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  const getLabel = () => {
    if (!password) return 'Password strength';
    if (score <= 1) return 'Weak password';
    if (score === 2 || score === 3) return 'Moderate password';
    return 'Strong password';
  };

  const getColor = () => {
    if (!password) return 'bg-zinc-200 dark:bg-zinc-800';
    if (score <= 1) return 'bg-red-500';
    if (score === 2 || score === 3) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-2 mt-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        <span>{getLabel()}</span>
        <span>{score}/4</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`rounded-full transition-colors duration-300 ${
              step <= score ? getColor() : 'bg-zinc-100 dark:bg-zinc-800'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-500 pt-1">
        <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-zinc-400" />} 8+ characters
        </span>
        <span className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-zinc-400" />} One uppercase
        </span>
        <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-zinc-400" />} One number
        </span>
        <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
          {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-zinc-400" />} Special character
        </span>
      </div>
    </div>
  );
};
