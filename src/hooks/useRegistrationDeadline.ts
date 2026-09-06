'use client';

import { useState, useEffect } from 'react';
import { getTimeRemaining, TimeRemaining, isRegistrationClosed } from '../lib/deadlineConfig';

/**
 * React hook to track real-time registration countdown every second
 */
export function useRegistrationDeadline() {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => getTimeRemaining());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initial sync
    setTimeRemaining(getTimeRemaining());

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...timeRemaining,
    mounted,
  };
}

export { isRegistrationClosed };
