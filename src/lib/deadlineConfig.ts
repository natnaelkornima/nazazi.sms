// Registration deadline and automatic closing configuration
// Sets the target deadline: Today night 6:00 o'clock in Ethiopian Time (ማታ 6:00 ሰዓት / Midnight 12:00 AM EAT, UTC+3)
// When this timestamp is reached, public registration automatically locks down.
// Admin access and all existing user records remain 100% untouched and accessible.

// Ethiopian night 6:00 (ማታ 6:00 ሰዓት) = 12:00 AM (midnight) East Africa Time (UTC+3, Addis Ababa)
export const DEFAULT_REGISTRATION_DEADLINE = '2026-09-07T23:59:59+03:00';

/**
 * Computes today night 6:00 o'clock in Ethiopian time (ማታ 6:00 ሰዓት).
 * In Ethiopian 12-hour clock:
 * - 12:00 evening is 6:00 PM standard
 * - 6:00 night (ማታ 6:00 ሰዓት / እኩለ ሌሊት) is 12:00 AM midnight EAT (end of the current day UTC+3)
 */
export function getTodayEthiopianNightSixDeadline(baseDate: Date = new Date()): Date {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(baseDate);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) {
      // 23:59:59 EAT (+03:00) marks the end of today at Ethiopian night 6:00 (midnight)
      const calculated = new Date(`${year}-${month}-${day}T23:59:59+03:00`);
      if (!isNaN(calculated.getTime())) {
        return calculated;
      }
    }
  } catch (e) {
    console.error('Error calculating Ethiopian night 6:00 deadline', e);
  }

  return new Date(DEFAULT_REGISTRATION_DEADLINE);
}

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
        // Clear previous 3-day test override if present so today's night 6 o'clock takes immediate effect
        if (stored.includes('2026-09-08')) {
          localStorage.removeItem('nazazi_deadline_override');
        } else {
          const parsed = new Date(stored);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }
    } catch {}
  }

  return getTodayEthiopianNightSixDeadline();
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
