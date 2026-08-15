/**
 * Shared validation utilities for Nazazi Platform
 * Enforces Ethiopian phone number format (09... or +2519...) and full name constraints.
 */

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface PhoneValidationResult extends ValidationResult {
  cleanPhone: string;
  normalizedPhone: string;
}

/**
 * Validates full name:
 * - At least 2 characters long (trimmed)
 * - Cannot be purely digits or special symbols
 * - Supports English, Amharic (Ethiopic Fidel), spaces, hyphens, dots, apostrophes
 */
export function validateFullName(name: string, isAmharic = false): ValidationResult & { formattedName: string } {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: isAmharic ? 'እባክዎ ሙሉ ስምዎን ያስገቡ።' : 'Please enter your full name.',
      formattedName: '',
    };
  }

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: isAmharic ? 'ስም ቢያንስ 2 ፊደላት መሆን አለበት።' : 'Name must be at least 2 characters.',
      formattedName: trimmed,
    };
  }

  // Must not be purely numbers or special punctuation characters
  if (/^[\d!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?`~-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: isAmharic
        ? 'እባክዎ ትክክለኛ ስም ያስገቡ (ምሳሌ፡ አበበ ከበደ ወይም Abebe Kebede)።'
        : 'Please enter a valid full name (e.g. Abebe Kebede or አበበ ከበደ).',
      formattedName: trimmed,
    };
  }

  return {
    isValid: true,
    error: null,
    formattedName: trimmed,
  };
}

/**
 * Validates Ethiopian phone numbers:
 * - Must start with 09 (10 digits total: e.g. 0911234567)
 * - OR start with +2519 (13 chars total: e.g. +251911234567)
 * - OR start with 2519 (12 digits total: e.g. 251911234567)
 * - Also supports 07 / +2517 / 2517 series (10 / 13 / 12 digits)
 */
export function validateEthiopianPhone(phone: string, isAmharic = false): PhoneValidationResult {
  const raw = (phone || '').trim();
  const cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned) {
    return {
      isValid: false,
      error: isAmharic ? 'እባክዎ የስልክ ቁጥር ያስገቡ።' : 'Phone number is required.',
      cleanPhone: '',
      normalizedPhone: '',
    };
  }

  // Check 09 or +2519 or 2519 or 07 or +2517 or 2517
  const is09 = /^09\d{8}$/.test(cleaned);
  const isPlus2519 = /^\+2519\d{8}$/.test(cleaned);
  const is2519 = /^2519\d{8}$/.test(cleaned);
  const is07 = /^07\d{8}$/.test(cleaned);
  const isPlus2517 = /^\+2517\d{8}$/.test(cleaned);
  const is2517 = /^2517\d{8}$/.test(cleaned);

  if (!is09 && !isPlus2519 && !is2519 && !is07 && !isPlus2517 && !is2517) {
    return {
      isValid: false,
      error: isAmharic
        ? 'የስልክ ቁጥር በ 09 ወይም +2519 መጀመር አለበት (ምሳሌ፡ 0911234567 ወይም +251911234567)።'
        : 'Phone number must start with 09 or +2519 (e.g. 0911234567 or +251911234567).',
      cleanPhone: cleaned,
      normalizedPhone: '',
    };
  }

  // Standardize normalized format to 09... (or 07...)
  let normalizedPhone = cleaned;
  if (isPlus2519 || is2519) {
    normalizedPhone = '09' + cleaned.slice(-8);
  } else if (isPlus2517 || is2517) {
    normalizedPhone = '07' + cleaned.slice(-8);
  }

  return {
    isValid: true,
    error: null,
    cleanPhone: cleaned,
    normalizedPhone,
  };
}
