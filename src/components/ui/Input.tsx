import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  isPassword?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightElement,
      isPassword = false,
      id,
      value,
      placeholder,
      onChange,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 tracking-tight"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            type={inputType}
            value={value}
            onChange={onChange}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            placeholder={placeholder}
            className={cn(
              'w-full h-11 px-3.5 text-sm rounded-[5px] bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-800 transition-all duration-200 shadow-2xs',
              'placeholder:text-zinc-400 dark:placeholder:text-zinc-600',
              'focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10',
              leftIcon && 'pl-10',
              (isPassword || rightElement || error || success) && 'pr-10',
              error && 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20',
              success && 'border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500/20',
              className
            )}
            {...props}
          />
          <div className="absolute right-3.5 flex items-center gap-1.5 text-zinc-400">
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5 rounded"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {!isPassword && error && <AlertCircle className="w-4 h-4 text-red-500" />}
            {!isPassword && success && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {rightElement}
          </div>
        </div>
        {error && <p className="text-xs text-red-500 font-medium pl-0.5">{error}</p>}
        {success && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pl-0.5">{success}</p>}
        {!error && !success && helperText && <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal pl-0.5">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
