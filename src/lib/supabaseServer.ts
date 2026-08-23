import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { canonicalPhone, phoneMatches } from './validation';
import { normalizePlanAndAmount } from './planUtils';

function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^['"]|['"]$/g, '');
  url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function sanitizeKey(rawKey: string): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/^['"]|['"]$/g, '');
}

export interface RegistrationRecord {
  id: string;
  name: string;
  phone_number: string;
  payment_image_url: string;
  plan_name?: string;
  amount?: number;
  status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string | null;
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseCredentials() {
  const url = sanitizeSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    ''
  );

  const key = sanitizeKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  );

  const isConfigured = Boolean(
    url &&
    key &&
    !url.toLowerCase().includes('your-project') &&
    !key.toLowerCase().includes('your-supabase') &&
    !url.toLowerCase().includes('placeholder')
  );

  return { url, key, isConfigured };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseCredentials().isConfigured;
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedUrl = url;
    cachedKey = key;
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export const supabaseServer = getSupabaseClient();

// Global in-memory persistence stores (active during server lifetime for zero downtime/development)
let inMemoryRegistrations: RegistrationRecord[] = [];

// Persistent status override cache keyed by both ID and normalized phone numbers
const statusOverridesMap = new Map<string, { status: 'pending' | 'approved' | 'rejected'; reviewed_at: string }>();

function normalizePhoneKey(phone: string): string {
  return (phone || '').trim().replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
}

// Persistent map to track registered plans & amounts even if Supabase schema lacks plan columns
const planMetaCache = new Map<string, { planName: string; amount: number }>();

function recordPlanMeta(id: string | undefined, phone: string | undefined, planName: string, amount: number) {
  if (id) {
    planMetaCache.set(id, { planName, amount });
  }
  const cleanPhone = normalizePhoneKey(phone);
  if (cleanPhone) {
    planMetaCache.set(cleanPhone, { planName, amount });
    const last8 = cleanPhone.slice(-8);
    if (last8.length >= 7) {
      planMetaCache.set(last8, { planName, amount });
    }
  }
}

/**
 * Extracts normalized row data from any Supabase table column naming convention
 */
function extractRowData(row: Record<string, unknown>, fallbackId?: string): RegistrationRecord {
  const idStr = String(row.id || row.uuid || fallbackId || `reg_${Date.now()}`);

  const nameStr = String(
    row.name ||
    row.full_name ||
    row.fullname ||
    row.user_name ||
    row.username ||
    row.payer_name ||
    row.customer_name ||
    row.client_name ||
    ''
  ).trim();

  const phoneStr = String(
    row.phone_number ||
    row.phone ||
    row.user_phone ||
    row.mobile ||
    row.telephone ||
    ''
  ).trim();

  const imageStr = String(
    row.payment_image_url ||
    row.image_url ||
    row.screenshot_url ||
    row.receipt_url ||
    row.payment_image ||
    row.screenshot ||
    row.receipt ||
    row.file_url ||
    row.url ||
    ''
  ).trim();

  const rawPlanValue =
    row.plan_name ||
    row.plan ||
    row.subscription_plan ||
    row.package ||
    row.tier ||
    row.selected_plan ||
    row.plan_type ||
    row.pricing_plan ||
    row.membership ||
    '';

  const rawAmountValue =
    row.amount !== undefined
      ? row.amount
      : row.price !== undefined
      ? row.price
      : row.fee !== undefined
      ? row.fee
      : row.cost !== undefined
      ? row.cost
      : undefined;

  const rawNotesValue =
    row.notes ||
    row.description ||
    row.remark ||
    row.comment ||
    row.details ||
    '';

  let { planName: planStr, amount: amountVal } = normalizePlanAndAmount(
    rawPlanValue,
    rawAmountValue,
    rawNotesValue
  );

  // Check if we have cached plan metadata for this phone / ID (e.g. user registered for 600 or 1000)
  const cleanPhone = normalizePhoneKey(phoneStr);
  const cachedPlan =
    planMetaCache.get(idStr) ||
    (cleanPhone ? planMetaCache.get(cleanPhone) : undefined) ||
    (cleanPhone && cleanPhone.length >= 8 ? planMetaCache.get(cleanPhone.slice(-8)) : undefined);

  if (cachedPlan && (cachedPlan.amount > 200 || !rawPlanValue || amountVal === 200)) {
    planStr = cachedPlan.planName;
    amountVal = cachedPlan.amount;
  }

  const rawStatus = String(row.status || 'pending').toLowerCase();
  const status: 'pending' | 'approved' | 'rejected' =
    rawStatus === 'approved' || rawStatus === 'rejected' ? (rawStatus as 'approved' | 'rejected') : 'pending';

  return {
    id: idStr,
    name: nameStr,
    phone_number: phoneStr,
    payment_image_url: imageStr,
    plan_name: planStr,
    amount: amountVal,
    status,
    created_at: String(row.created_at || new Date().toISOString()),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

// Cached detected table and columns to avoid schema mismatch errors on subsequent requests
let detectedTableCache: { tableName: string; columns: Set<string> } | null = null;

async function discoverTableInfo(client: SupabaseClient): Promise<{ tableName: string; columns: Set<string> } | null> {
  if (detectedTableCache) {
    return detectedTableCache;
  }

  const candidateTables = [
    'registrations',
    'payments',
    'subscriptions',
    'subscribers',
    'users',
    'registration',
    'payment',
    'subscription',
    'members',
    'profiles',
  ];

  for (const tableName of candidateTables) {
    try {
      const { data, error } = await client.from(tableName).select('*').limit(5);
      if (!error && Array.isArray(data)) {
        const columns = new Set<string>();
        if (data.length > 0) {
          data.forEach((row: Record<string, unknown>) => {
            Object.keys(row || {}).forEach((k) => columns.add(k.toLowerCase()));
          });
        }
        detectedTableCache = { tableName, columns };
        return detectedTableCache;
      }
    } catch {
      // Continue to next table
    }
  }

  return null;
}

/**
 * Saves a new registration record into Supabase with adaptive column discovery and fallback.
 */
export async function saveRegistrationToSupabase(data: {
  name: string;
  phone_number: string;
  payment_image_url: string;
  plan_name?: string;
  amount?: number;
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<{ record: RegistrationRecord; savedToSupabase: boolean; error?: string }> {
  const fallbackId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const { planName: normalizedPlanName, amount: normalizedAmount } = normalizePlanAndAmount(
    data.plan_name,
    data.amount
  );

  const record: RegistrationRecord = {
    id: fallbackId,
    name: data.name.trim(),
    phone_number: data.phone_number.trim(),
    payment_image_url: data.payment_image_url,
    plan_name: normalizedPlanName,
    amount: normalizedAmount,
    status: data.status || 'pending',
    created_at: nowIso,
  };

  // Record plan metadata in memory cache
  recordPlanMeta(fallbackId, record.phone_number, record.plan_name, record.amount);

  // Always keep in-memory cache updated immediately
  inMemoryRegistrations.unshift(record);

  const client = getSupabaseClient();
  if (!client) {
    return {
      record,
      savedToSupabase: false,
      error: 'Supabase credentials not configured in environment variables.',
    };
  }

  // 1. Try autodiscovering the existing table and its exact schema
  try {
    const tableInfo = await discoverTableInfo(client);
    const targetTable = tableInfo?.tableName || 'registrations';
    const knownCols = tableInfo?.columns || new Set<string>();

    // Construct tailored payload matching known column names
    const smartPayload: Record<string, unknown> = {};

    // Name column mapping
    if (knownCols.has('name')) {
      smartPayload.name = record.name;
    } else if (knownCols.has('full_name')) {
      smartPayload.full_name = record.name;
    } else if (knownCols.has('fullname')) {
      smartPayload.fullname = record.name;
    } else if (knownCols.has('user_name')) {
      smartPayload.user_name = record.name;
    } else if (knownCols.has('payer_name')) {
      smartPayload.payer_name = record.name;
    } else {
      smartPayload.name = record.name;
    }

    // Phone column mapping
    if (knownCols.has('phone_number')) {
      smartPayload.phone_number = record.phone_number;
    } else if (knownCols.has('phone')) {
      smartPayload.phone = record.phone_number;
    } else if (knownCols.has('user_phone')) {
      smartPayload.user_phone = record.phone_number;
    } else if (knownCols.has('mobile')) {
      smartPayload.mobile = record.phone_number;
    } else {
      smartPayload.phone_number = record.phone_number;
    }

    // Payment image column mapping
    if (knownCols.has('payment_image_url')) {
      smartPayload.payment_image_url = record.payment_image_url;
    } else if (knownCols.has('image_url')) {
      smartPayload.image_url = record.payment_image_url;
    } else if (knownCols.has('screenshot_url')) {
      smartPayload.screenshot_url = record.payment_image_url;
    } else if (knownCols.has('receipt_url')) {
      smartPayload.receipt_url = record.payment_image_url;
    } else if (knownCols.has('payment_image')) {
      smartPayload.payment_image = record.payment_image_url;
    } else if (knownCols.has('file_url')) {
      smartPayload.file_url = record.payment_image_url;
    } else {
      smartPayload.payment_image_url = record.payment_image_url;
    }

    // Plan column mapping (only include if table supports it or schema unknown)
    if (knownCols.size === 0 || knownCols.has('plan_name')) {
      smartPayload.plan_name = record.plan_name;
    } else if (knownCols.has('plan')) {
      smartPayload.plan = record.plan_name;
    } else if (knownCols.has('subscription_plan')) {
      smartPayload.subscription_plan = record.plan_name;
    } else if (knownCols.has('tier')) {
      smartPayload.tier = record.plan_name;
    } else if (knownCols.has('package')) {
      smartPayload.package = record.plan_name;
    }

    // Amount column mapping (only include if table supports it or schema unknown)
    if (knownCols.size === 0 || knownCols.has('amount')) {
      smartPayload.amount = record.amount;
    } else if (knownCols.has('price')) {
      smartPayload.price = record.amount;
    } else if (knownCols.has('fee')) {
      smartPayload.fee = record.amount;
    }

    // Status column
    if (knownCols.size === 0 || knownCols.has('status')) {
      smartPayload.status = record.status;
    }

    // Try inserting tailored payload
    const { data: insertedData, error: insertError } = await client
      .from(targetTable)
      .insert([smartPayload])
      .select('*');

    if (!insertError && insertedData && insertedData.length > 0) {
      const insertedRecord = extractRowData(insertedData[0] as Record<string, unknown>, fallbackId);
      if (!insertedRecord.name) insertedRecord.name = record.name;
      if (!insertedRecord.phone_number) insertedRecord.phone_number = record.phone_number;
      if (!insertedRecord.payment_image_url) insertedRecord.payment_image_url = record.payment_image_url;
      // Always retain authentic chosen plan and amount
      insertedRecord.plan_name = record.plan_name;
      insertedRecord.amount = record.amount;

      recordPlanMeta(insertedRecord.id, insertedRecord.phone_number, record.plan_name, record.amount);

      // Update in-memory cache with the server ID
      inMemoryRegistrations = inMemoryRegistrations.map((r) => (r.id === fallbackId ? insertedRecord : r));
      return { record: insertedRecord, savedToSupabase: true };
    }

    // Try inserting without .select('*') in case of RLS select restriction
    if (insertError) {
      const { error: blindInsertError } = await client.from(targetTable).insert([smartPayload]);
      if (!blindInsertError) {
        return { record, savedToSupabase: true };
      }
    }
  } catch (err) {
    console.warn('Smart payload insertion attempt error:', err);
  }

  // 2. Comprehensive Multi-Candidate Fallback Matrix
  const candidateTables = ['registrations', 'payments', 'subscriptions', 'subscribers', 'users', 'members'];
  const candidatePayloads = [
    // Variant 1: standard names
    {
      name: record.name,
      phone_number: record.phone_number,
      payment_image_url: record.payment_image_url,
      plan_name: record.plan_name,
      amount: record.amount,
      status: record.status,
    },
    // Variant 2: standard without plan/amount (for basic schema)
    {
      name: record.name,
      phone_number: record.phone_number,
      payment_image_url: record.payment_image_url,
      status: record.status,
    },
    // Variant 3: full_name / phone / image_url / plan / amount
    {
      full_name: record.name,
      phone: record.phone_number,
      image_url: record.payment_image_url,
      plan: record.plan_name,
      price: record.amount,
      status: record.status,
    },
    // Variant 4: full_name / phone / image_url / status
    {
      full_name: record.name,
      phone: record.phone_number,
      image_url: record.payment_image_url,
      status: record.status,
    },
    // Variant 5: full_name / phone / screenshot_url
    {
      full_name: record.name,
      phone: record.phone_number,
      screenshot_url: record.payment_image_url,
      status: record.status,
    },
    // Variant 6: name / phone / receipt_url
    {
      name: record.name,
      phone: record.phone_number,
      receipt_url: record.payment_image_url,
      status: record.status,
    },
    // Variant 7: minimal core
    {
      name: record.name,
      phone_number: record.phone_number,
      payment_image_url: record.payment_image_url,
    },
    // Variant 8: minimal full_name
    {
      full_name: record.name,
      phone: record.phone_number,
      image_url: record.payment_image_url,
    },
  ];

  for (const tableName of candidateTables) {
    for (const payload of candidatePayloads) {
      try {
        const { data: insertedData, error: insertError } = await client
          .from(tableName)
          .insert([payload])
          .select('*');

        if (!insertError && insertedData && insertedData.length > 0) {
          const insertedRecord = extractRowData(insertedData[0] as Record<string, unknown>, fallbackId);
          if (!insertedRecord.name) insertedRecord.name = record.name;
          if (!insertedRecord.phone_number) insertedRecord.phone_number = record.phone_number;
          if (!insertedRecord.payment_image_url) insertedRecord.payment_image_url = record.payment_image_url;
          // Always retain authentic chosen plan and amount
          insertedRecord.plan_name = record.plan_name;
          insertedRecord.amount = record.amount;

          recordPlanMeta(insertedRecord.id, insertedRecord.phone_number, record.plan_name, record.amount);

          inMemoryRegistrations = inMemoryRegistrations.map((r) => (r.id === fallbackId ? insertedRecord : r));
          return { record: insertedRecord, savedToSupabase: true };
        }

        // Try blind insert without select
        const { error: blindErr } = await client.from(tableName).insert([payload]);
        if (!blindErr) {
          return { record, savedToSupabase: true };
        }
      } catch {
        continue;
      }
    }
  }

  return {
    record,
    savedToSupabase: false,
    error: 'Inserted into in-memory state. Supabase database schema did not accept candidate payloads.',
  };
}

/**
 * Look up a single registration by exact or formatted phone number
 */
export async function getRegistrationByPhone(phone: string): Promise<RegistrationRecord | null> {
  const rawInput = (phone || '').trim();
  if (!rawInput) return null;

  const canonical = canonicalPhone(rawInput);
  const cleanDigits = rawInput.replace(/\D/g, '');
  const last8 = cleanDigits.slice(-8);

  const overrideKey =
    statusOverridesMap.get(rawInput) ||
    statusOverridesMap.get(canonical) ||
    (cleanDigits ? statusOverridesMap.get(cleanDigits) : undefined) ||
    (last8 ? statusOverridesMap.get(last8) : undefined);

  const client = getSupabaseClient();
  if (client) {
    const candidateTables = ['registrations', 'payments', 'subscriptions'];

    for (const tableName of candidateTables) {
      try {
        let matchedData: Record<string, unknown> | null = null;

        if (last8 && last8.length >= 7) {
          for (const colName of ['phone_number', 'phone', 'user_phone', 'mobile']) {
            const { data, error } = await client
              .from(tableName)
              .select('*')
              .ilike(colName, `%${last8}%`)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!error && data) {
              matchedData = data as Record<string, unknown>;
              break;
            }
          }
        }

        if (!matchedData) {
          const { data: recentRows, error: listErr } = await client
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

          if (!listErr && Array.isArray(recentRows)) {
            const found = recentRows.find((row: Record<string, unknown>) => {
              const rowPhone = String(row.phone_number || row.phone || row.user_phone || row.mobile || '');
              return phoneMatches(rowPhone, rawInput);
            });
            if (found) {
              matchedData = found as Record<string, unknown>;
            }
          }
        }

        if (matchedData) {
          const parsed = extractRowData(matchedData);
          const phoneStr = parsed.phone_number;
          const normalized = canonicalPhone(phoneStr);
          const rowLast8 = phoneStr.replace(/\D/g, '').slice(-8);

          const cachedOverride =
            statusOverridesMap.get(parsed.id) ||
            statusOverridesMap.get(phoneStr) ||
            statusOverridesMap.get(normalized) ||
            (rowLast8 ? statusOverridesMap.get(rowLast8) : undefined) ||
            overrideKey;

          let finalStatus = parsed.status;
          if (cachedOverride?.status === 'approved' || cachedOverride?.status === 'rejected') {
            finalStatus = cachedOverride.status;
          }

          return {
            ...parsed,
            status: finalStatus,
            reviewed_at: parsed.reviewed_at || cachedOverride?.reviewed_at || null,
          };
        }
      } catch (dbErr) {
        console.warn(`Supabase lookup warning on ${tableName}:`, dbErr);
      }
    }
  }

  const match = inMemoryRegistrations.find((r) => phoneMatches(r.phone_number, rawInput));

  if (match) {
    const idStr = match.id;
    const phoneStr = match.phone_number;
    const cachedOverride =
      statusOverridesMap.get(idStr) ||
      statusOverridesMap.get(phoneStr) ||
      statusOverridesMap.get(canonicalPhone(phoneStr)) ||
      overrideKey;

    let finalStatus = match.status;
    if (cachedOverride?.status) {
      finalStatus = cachedOverride.status;
    }

    return {
      ...match,
      status: finalStatus,
      reviewed_at: cachedOverride?.reviewed_at || match.reviewed_at || null,
    };
  }

  return null;
}

/**
 * Fetches all registrations from Supabase, or in-memory fallback (Admin authorized)
 */
export async function getAllRegistrations(): Promise<{
  registrations: RegistrationRecord[];
  isFromSupabase: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();

  if (!client) {
    return {
      registrations: inMemoryRegistrations,
      isFromSupabase: false,
      error: 'Supabase credentials are not configured in environment variables.',
    };
  }

  const candidateTables = [
    'registrations',
    'payments',
    'subscriptions',
    'subscribers',
    'users',
    'registration',
    'payment',
    'subscription',
    'members',
    'profiles',
  ];

  for (const tableName of candidateTables) {
    try {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        continue;
      }

      const list: RegistrationRecord[] = (data || []).map((row: Record<string, unknown>) => {
        const parsed = extractRowData(row);
        const cleanPhone = normalizePhoneKey(parsed.phone_number);

        // Check if there is an in-memory or cached plan metadata that has authentic amount (e.g. 600 or 1000)
        const memMatch = inMemoryRegistrations.find(
          (m) => m.id === parsed.id || (cleanPhone && phoneMatches(m.phone_number, cleanPhone))
        );
        let finalPlanName = parsed.plan_name;
        let finalAmount = parsed.amount;

        if (memMatch && memMatch.amount > 200 && finalAmount === 200) {
          finalPlanName = memMatch.plan_name;
          finalAmount = memMatch.amount;
        }

        const cachedOverride =
          statusOverridesMap.get(parsed.id) ||
          (cleanPhone ? statusOverridesMap.get(cleanPhone) : undefined);

        let finalStatus = parsed.status;
        if (cachedOverride && (cachedOverride.status === 'approved' || cachedOverride.status === 'rejected')) {
          finalStatus = cachedOverride.status;
        }

        return {
          ...parsed,
          plan_name: finalPlanName,
          amount: finalAmount,
          status: finalStatus,
          reviewed_at: parsed.reviewed_at || cachedOverride?.reviewed_at || null,
        };
      });

      // Merge any pending/recent in-memory registrations that aren't in Supabase yet
      const combined = [...list];
      const seenIds = new Set(list.map((r) => r.id));
      const seenPhones = new Set(list.map((r) => normalizePhoneKey(r.phone_number)).filter(Boolean));

      for (const mem of inMemoryRegistrations) {
        const memPhone = normalizePhoneKey(mem.phone_number);
        if (!seenIds.has(mem.id) && (!memPhone || !seenPhones.has(memPhone))) {
          seenIds.add(mem.id);
          if (memPhone) seenPhones.add(memPhone);
          combined.unshift(mem);
        }
      }

      return {
        registrations: combined,
        isFromSupabase: true,
      };
    } catch (err) {
      console.warn(`Error querying table ${tableName}:`, err);
    }
  }

  return {
    registrations: inMemoryRegistrations,
    isFromSupabase: false,
    error: 'Could not retrieve rows from database tables.',
  };
}

/**
 * Updates a registration's plan and amount in Supabase and in-memory cache
 */
export async function updateRegistrationPlan(
  id: string,
  planName: string,
  amount: number,
  phoneNumber?: string
): Promise<{ success: boolean; error?: string }> {
  const rawPhone = (phoneNumber || '').trim();
  recordPlanMeta(id, rawPhone, planName, amount);

  inMemoryRegistrations = inMemoryRegistrations.map((r) => {
    if (r.id === id || (rawPhone && phoneMatches(r.phone_number, rawPhone))) {
      return { ...r, plan_name: planName, amount };
    }
    return r;
  });

  const client = getSupabaseClient();
  if (!client) {
    return { success: true };
  }

  const candidateTables = ['registrations', 'payments', 'subscriptions'];
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const last8 = cleanDigits.slice(-8);

  for (const tableName of candidateTables) {
    try {
      const payloads = [
        { plan_name: planName, amount: amount },
        { plan: planName, amount: amount },
        { plan_name: planName, price: amount },
        { plan_name: planName },
        { amount: amount },
      ];

      for (const p of payloads) {
        if (id && !id.startsWith('reg_')) {
          const { error } = await client.from(tableName).update(p).eq('id', id);
          if (!error) break;
        } else if (last8 && last8.length >= 7) {
          for (const phoneCol of ['phone_number', 'phone', 'user_phone', 'mobile']) {
            const { error } = await client.from(tableName).update(p).ilike(phoneCol, `%${last8}%`);
            if (!error) break;
          }
        }
      }
    } catch (err) {
      console.warn(`Plan update notice for ${tableName}:`, err);
    }
  }

  return { success: true };
}

/**
 * Updates a registration's approval status in Supabase and in-memory cache
 */
export async function updateRegistrationStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  phoneNumber?: string
): Promise<{ success: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const rawPhone = (phoneNumber || '').trim();
  const canonical = canonicalPhone(rawPhone);
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const last8 = cleanDigits.slice(-8);

  if (id) {
    statusOverridesMap.set(id, { status, reviewed_at: nowIso });
  }
  if (rawPhone) {
    statusOverridesMap.set(rawPhone, { status, reviewed_at: nowIso });
  }
  if (canonical) {
    statusOverridesMap.set(canonical, { status, reviewed_at: nowIso });
  }
  if (cleanDigits) {
    statusOverridesMap.set(cleanDigits, { status, reviewed_at: nowIso });
  }
  if (last8 && last8.length >= 7) {
    statusOverridesMap.set(last8, { status, reviewed_at: nowIso });
  }

  inMemoryRegistrations = inMemoryRegistrations.map((r) => {
    if (r.id === id || (rawPhone && phoneMatches(r.phone_number, rawPhone))) {
      return { ...r, status, reviewed_at: nowIso };
    }
    return r;
  });

  const client = getSupabaseClient();
  if (!client) {
    return { success: true };
  }

  const candidateTables = ['registrations', 'payments', 'subscriptions'];

  for (const tableName of candidateTables) {
    try {
      if (id && !id.startsWith('reg_')) {
        const { error } = await client
          .from(tableName)
          .update({ status, reviewed_at: nowIso })
          .eq('id', id);

        if (error) {
          await client.from(tableName).update({ status }).eq('id', id);
        }
      }

      if (last8 && last8.length >= 7) {
        for (const phoneCol of ['phone_number', 'phone', 'user_phone', 'mobile']) {
          const { error } = await client
            .from(tableName)
            .update({ status, reviewed_at: nowIso })
            .ilike(phoneCol, `%${last8}%`);

          if (error) {
            await client.from(tableName).update({ status }).ilike(phoneCol, `%${last8}%`);
          }
        }
      }
    } catch (err) {
      console.warn(`Update notice for ${tableName}:`, err);
    }
  }

  return { success: true };
}

/**
 * Deletes a registration record
 */
export async function deleteRegistration(
  id: string,
  phoneNumber?: string
): Promise<{ success: boolean; error?: string }> {
  if (id) {
    statusOverridesMap.delete(id);
  }
  const cleanPhone = phoneNumber ? normalizePhoneKey(phoneNumber) : '';
  if (cleanPhone) {
    statusOverridesMap.delete(cleanPhone);
  }

  inMemoryRegistrations = inMemoryRegistrations.filter((r) => {
    if (id && r.id === id) return false;
    if (cleanPhone && normalizePhoneKey(r.phone_number) === cleanPhone) return false;
    return true;
  });

  const client = getSupabaseClient();
  if (!client) return { success: true };

  const candidateTables = ['registrations', 'payments', 'subscriptions'];
  for (const tableName of candidateTables) {
    try {
      if (id && !id.startsWith('reg_')) {
        await client.from(tableName).delete().eq('id', id);
      }
      if (phoneNumber) {
        const last8 = phoneNumber.replace(/\D/g, '').slice(-8);
        if (last8 && last8.length >= 7) {
          for (const col of ['phone_number', 'phone', 'user_phone']) {
            await client.from(tableName).delete().ilike(col, `%${last8}%`);
          }
        }
      }
    } catch {
      // Ignore deletion errors
    }
  }

  return { success: true };
}

/**
 * Reset all registrations (Dev / Admin cleanup)
 */
export async function resetAllRegistrations(): Promise<{ success: boolean; count: number; error?: string }> {
  inMemoryRegistrations = [];
  statusOverridesMap.clear();

  const client = getSupabaseClient();
  if (!client) return { success: true, count: 0 };

  const candidateTables = ['registrations', 'payments', 'subscriptions'];
  for (const tableName of candidateTables) {
    try {
      await client.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {
      // Ignore
    }
  }

  return { success: true, count: 0 };
}
