// Registration deadline and automatic closing configuration
// Sets a target date and time (3 days from launch: September 8, 2026, 11:59:59 PM EAT)
// When this timestamp is reached, public registration automatically locks down.
// Admin access and all existing 700+ user records remain 100% untouched and accessible.

// Default: 3 days from launch (September 8, 2026 at 11:59:59 PM East Africa Time UTC+3)
export const DEFAULT_REGISTRATION_DEADLINE = '2026-09-08T23:59:59+03:00';

export function getRegistrationDeadline(): Date {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_REGISTRATION_DEADLINE) {
    const parsed = new Date(process.env.NEXT_PUBLIC_REGISTRATION_DEADLINE);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Allow optional browser localStorage override for admin testing/previewing
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('nazazi_deadline_override');
      if (stored) {
        const parsed = new Date(stored);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    } catch {}
  }

  return new Date(DEFAULT_REGISTRATION_DEADLINE);
}

export interface TimeRemaining {
  totalMs: number;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isClosed: boolean;
  deadlineDate: Date;
}

export function getTimeRemaining(customDeadline?: Date): TimeRemaining {
  const deadline = customDeadline || getRegistrationDeadline();
  const now = new Date();
  const totalMs = deadline.getTime() - now.getTime();
  const isClosed = totalMs <= 0;

  if (isClosed) {
    return {
      totalMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isClosed: true,
      deadlineDate: deadline,
    };
  }

  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);

  return {
    totalMs,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    isClosed: false,
    deadlineDate: deadline,
  };
}

export function isRegistrationClosed(): boolean {
  return getTimeRemaining().isClosed;
}
