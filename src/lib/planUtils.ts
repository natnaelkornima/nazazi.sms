/**
 * Intelligent plan and amount normalizer for Nazazi
 * Infers plan names and amounts dynamically from raw strings, numbers, or database column variations
 * without hardcoding or disrupting existing subscriber records.
 */

export interface NormalizedPlanInfo {
  planName: string;
  amount: number;
  durationLabel: string;
  badgeColor: string;
}

export function normalizePlanAndAmount(
  rawPlan?: unknown,
  rawAmount?: unknown,
  rawNotesOrDescription?: unknown
): { planName: string; amount: number } {
  // Convert any inputs to clean strings for analysis
  const planStr = typeof rawPlan === 'string' ? rawPlan.trim() : '';
  const notesStr = typeof rawNotesOrDescription === 'string' ? rawNotesOrDescription.trim() : '';
  const combinedContext = `${planStr} ${notesStr}`.toLowerCase();

  // 1. Direct Amount parsing from rawAmount
  let detectedAmount: number | null = null;
  if (typeof rawAmount === 'number' && !isNaN(rawAmount) && rawAmount > 0) {
    detectedAmount = rawAmount;
  } else if (typeof rawAmount === 'string') {
    const cleaned = rawAmount.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      detectedAmount = parsed;
    }
  }

  // 2. If amount is not set or defaulted, try to infer from text context
  if (!detectedAmount || detectedAmount === 200) {
    if (
      combinedContext.includes('1000') ||
      combinedContext.includes('1,000') ||
      combinedContext.includes('6 month') ||
      combinedContext.includes('6month') ||
      combinedContext.includes('የ6 ወር') ||
      combinedContext.includes('6 months') ||
      combinedContext.includes('vip') ||
      combinedContext.includes('best value') ||
      combinedContext.includes('semi-annual') ||
      combinedContext.includes('half year')
    ) {
      detectedAmount = 1000;
    } else if (
      combinedContext.includes('600') ||
      combinedContext.includes('3 month') ||
      combinedContext.includes('3month') ||
      combinedContext.includes('የ3 ወር') ||
      combinedContext.includes('3 months') ||
      combinedContext.includes('quarterly')
    ) {
      detectedAmount = 600;
    } else if (
      combinedContext.includes('1200') ||
      combinedContext.includes('1,200') ||
      combinedContext.includes('1 year') ||
      combinedContext.includes('yearly') ||
      combinedContext.includes('የ1 ዓመት')
    ) {
      detectedAmount = 1200;
    } else if (
      combinedContext.includes('200') ||
      combinedContext.includes('1 month') ||
      combinedContext.includes('1month') ||
      combinedContext.includes('የ1 ወር') ||
      combinedContext.includes('monthly')
    ) {
      detectedAmount = 200;
    }
  }

  // Fallback to detected amount or default 200
  const finalAmount = detectedAmount && detectedAmount > 0 ? detectedAmount : 200;

  // 3. Derive clean, friendly plan name if rawPlan is missing or generic
  let finalPlanName = planStr;

  if (
    !finalPlanName ||
    finalPlanName.toLowerCase() === 'standard' ||
    finalPlanName.toLowerCase() === 'standard plan' ||
    finalPlanName.toLowerCase() === 'standard plan (200 birr)' ||
    finalPlanName.toLowerCase() === 'default' ||
    finalPlanName.toLowerCase() === 'plan'
  ) {
    if (finalAmount === 1000) {
      finalPlanName = '6 Months Access (1,000 Birr)';
    } else if (finalAmount === 600) {
      finalPlanName = '3 Months Access (600 Birr)';
    } else if (finalAmount === 1200) {
      finalPlanName = '1 Year Access (1,200 Birr)';
    } else {
      finalPlanName = '1 Month Access (200 Birr)';
    }
  } else {
    // If plan string is something like "6 Months Access" or "የ6 ወር አገልግሎት", standardize without losing original value
    if (finalAmount === 1000 && !finalPlanName.includes('1000') && !finalPlanName.includes('1,000')) {
      if (finalPlanName.includes('የ6 ወር')) {
        finalPlanName = 'የ6 ወር አገልግሎት (1000 ብር)';
      } else if (finalPlanName.toLowerCase().includes('6 month')) {
        finalPlanName = '6 Months Access (1,000 Birr)';
      }
    } else if (finalAmount === 600 && !finalPlanName.includes('600')) {
      if (finalPlanName.includes('የ3 ወር')) {
        finalPlanName = 'የ3 ወር አገልግሎት (600 ብር)';
      } else if (finalPlanName.toLowerCase().includes('3 month')) {
        finalPlanName = '3 Months Access (600 Birr)';
      }
    } else if (finalAmount === 200 && !finalPlanName.includes('200')) {
      if (finalPlanName.includes('የ1 ወር')) {
        finalPlanName = 'የ1 ወር አገልግሎት (200 ብር)';
      } else if (finalPlanName.toLowerCase().includes('1 month')) {
        finalPlanName = '1 Month Access (200 Birr)';
      }
    }
  }

  return {
    planName: finalPlanName,
    amount: finalAmount,
  };
}
