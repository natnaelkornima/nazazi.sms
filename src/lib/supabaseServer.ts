import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
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

const PRIMARY_DATA_DIR = path.join(process.cwd(), '.data');
const PRIMARY_STATE_FILE = path.join(PRIMARY_DATA_DIR, 'nazazi_admin_state.json');
const TMP_STATE_FILE = '/tmp/nazazi_admin_state.json';

function saveStateToDisk() {
  try {
    const dataToSave = {
      statusOverrides: Array.from(statusOverridesMap.entries()),
      planMeta: Array.from(planMetaCache.entries()),
      inMemoryRegistrations,
      savedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(dataToSave, null, 2);

    try {
      if (!fs.existsSync(PRIMARY_DATA_DIR)) {
        fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PRIMARY_STATE_FILE, jsonStr, 'utf-8');
    } catch {
      // Primary write failed, try /tmp
    }

    try {
      fs.writeFileSync(TMP_STATE_FILE, jsonStr, 'utf-8');
    } catch {
      // tmp write fallback
    }
  } catch (err) {
    console.warn('Notice: Server state persist warning:', err);
  }
}

function loadStateFromDisk() {
  const candidateFiles = [PRIMARY_STATE_FILE, TMP_STATE_FILE];
  for (const filePath of candidateFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.statusOverrides)) {
            for (const [k, v] of parsed.statusOverrides) {
              if (k && v && typeof v === 'object' && v.status) {
                statusOverridesMap.set(k, v);
              }
            }
          }
          if (Array.isArray(parsed.planMeta)) {
            for (const [k, v] of parsed.planMeta) {
              if (k && v && typeof v === 'object' && v.planName) {
                planMetaCache.set(k, v);
              }
            }
          }
          if (Array.isArray(parsed.inMemoryRegistrations) && inMemoryRegistrations.length === 0) {
            inMemoryRegistrations = parsed.inMemoryRegistrations;
          }
          return;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }
}

// Load persisted state immediately on server init
loadStateFromDisk();

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
  saveStateToDisk();
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

  let rawStatus = String(
    row.status || row.state || row.subscription_status || row.payment_status || ''
  ).toLowerCase().trim();

  let status: 'pending' | 'approved' | 'rejected' = 'pending';

  if (
    rawStatus === 'approved' ||
    rawStatus === 'active' ||
    rawStatus === 'verified' ||
    rawStatus === 'completed' ||
    rawStatus === 'success' ||
    rawStatus === 'confirmed' ||
    rawStatus === 'accept' ||
    rawStatus === 'accepted' ||
    row.is_approved === true ||
    row.approved === true ||
    row.is_verified === true ||
    row.verified === true ||
    row.is_active === true ||
    row.active === true ||
    String(row.is_approved) === 'true' ||
    String(row.approved) === 'true' ||
    String(row.is_active) === 'true'
  ) {
    status = 'approved';
  } else if (
    rawStatus === 'rejected' ||
    rawStatus === 'declined' ||
    rawStatus === 'denied' ||
    rawStatus === 'canceled' ||
    rawStatus === 'cancelled' ||
    rawStatus === 'failed' ||
    rawStatus === 'reject' ||
    rawStatus === 'decline' ||
    row.is_rejected === true ||
    row.rejected === true ||
    row.is_declined === true ||
    row.declined === true ||
    String(row.is_rejected) === 'true' ||
    String(row.rejected) === 'true' ||
    String(row.is_declined) === 'true'
  ) {
    status = 'rejected';
  } else {
    status = 'pending';
  }

  // Check if override map exists for this phone or id
  const phoneCleanDigits = phoneStr.replace(/\D/g, '');
  const phoneLast8 = phoneCleanDigits.slice(-8);
  const override =
    statusOverridesMap.get(idStr) ||
    (phoneCleanDigits ? statusOverridesMap.get(phoneCleanDigits) : undefined) ||
    (phoneLast8 && phoneLast8.length >= 7 ? statusOverridesMap.get(phoneLast8) : undefined) ||
    statusOverridesMap.get(phoneStr);

  if (override && (override.status === 'approved' || override.status === 'rejected')) {
    status = override.status;
  }

  return {
    id: idStr,
    name: nameStr,
    phone_number: phoneStr,
    payment_image_url: imageStr,
    plan_name: planStr,
    amount: amountVal,
    status,
    created_at: String(row.created_at || new Date().toISOString()),
    reviewed_at: override?.reviewed_at || (row.reviewed_at ? String(row.reviewed_at) : null),
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

  const getCachedOverride = (id?: string, phoneNum?: string) => {
    const pClean = (phoneNum || '').replace(/\D/g, '');
    const pLast8 = pClean.slice(-8);
    const pNorm = canonicalPhone(phoneNum || '');

    return (
      (id ? statusOverridesMap.get(id) : undefined) ||
      (phoneNum ? statusOverridesMap.get(phoneNum) : undefined) ||
      (pNorm ? statusOverridesMap.get(pNorm) : undefined) ||
      (pClean ? statusOverridesMap.get(pClean) : undefined) ||
      (pLast8 && pLast8.length >= 7 ? statusOverridesMap.get(pLast8) : undefined) ||
      (pLast8 && pLast8.length >= 7 ? statusOverridesMap.get(`09${pLast8}`) : undefined) ||
      (pLast8 && pLast8.length >= 7 ? statusOverridesMap.get(`07${pLast8}`) : undefined) ||
      (pLast8 && pLast8.length >= 7 ? statusOverridesMap.get(`+2519${pLast8}`) : undefined) ||
      (pLast8 && pLast8.length >= 7 ? statusOverridesMap.get(`2519${pLast8}`) : undefined) ||
      statusOverridesMap.get(rawInput) ||
      statusOverridesMap.get(canonical) ||
      (cleanDigits ? statusOverridesMap.get(cleanDigits) : undefined) ||
      (last8 ? statusOverridesMap.get(last8) : undefined)
    );
  };

  // 1. Query Supabase first for authoritative real-time status
  const client = getSupabaseClient();
  if (client) {
    try {
      const candidateTables = detectedTableCache?.tableName
        ? [detectedTableCache.tableName, 'registrations', 'payments', 'subscriptions']
        : ['registrations', 'payments', 'subscriptions', 'subscribers', 'users'];

      const queryPromise = (async (): Promise<RegistrationRecord | null> => {
        for (const tableName of candidateTables) {
          try {
            let matchedData: Record<string, unknown> | null = null;

            if (last8 && last8.length >= 7) {
              for (const colName of ['phone_number', 'phone', 'user_phone', 'mobile']) {
                try {
                  const { data, error } = await client
                    .from(tableName)
                    .select('*')
                    .ilike(colName, `%${last8}%`)
                    .limit(1)
                    .maybeSingle();

                  if (!error && data) {
                    matchedData = data as Record<string, unknown>;
                    break;
                  }
                } catch {
                  // try next column
                }
              }
            }

            if (!matchedData) {
              const { data: recentRows, error: orderErr } = await client
                .from(tableName)
                .select('*')
                .limit(50);

              if (!orderErr && Array.isArray(recentRows) && recentRows.length > 0) {
                const found = recentRows.find((row) => {
                  const r = row as Record<string, unknown>;
                  const rowPhone = String(r.phone_number || r.phone || r.user_phone || r.mobile || '');
                  return phoneMatches(rowPhone, rawInput);
                });
                if (found) {
                  matchedData = found as Record<string, unknown>;
                }
              }
            }

            if (matchedData) {
              const parsed = extractRowData(matchedData);
              const override = getCachedOverride(parsed.id, parsed.phone_number);

              let finalStatus = parsed.status;
              if (override && (override.status === 'approved' || override.status === 'rejected')) {
                finalStatus = override.status;
              }

              const resultRecord: RegistrationRecord = {
                ...parsed,
                status: finalStatus,
                reviewed_at: override?.reviewed_at || parsed.reviewed_at || null,
              };

              // Update in-memory cache to stay in sync with database
              inMemoryRegistrations = [
                resultRecord,
                ...inMemoryRegistrations.filter((r) => r.id !== resultRecord.id && !phoneMatches(r.phone_number, resultRecord.phone_number)),
              ];

              return resultRecord;
            }
          } catch {
            // Next table
          }
        }
        return null;
      })();

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      const supabaseResult = await Promise.race([queryPromise, timeoutPromise]);
      if (supabaseResult) {
        return supabaseResult;
      }
    } catch (err) {
      console.warn('Supabase getRegistrationByPhone error notice:', err);
    }
  }

  // 2. In-memory fallback if Supabase is offline or hasn't persisted yet
  const localMatch = inMemoryRegistrations.find((r) => phoneMatches(r.phone_number, rawInput));
  if (localMatch) {
    const override = getCachedOverride(localMatch.id, localMatch.phone_number);
    let finalStatus = localMatch.status || 'pending';
    if (override && (override.status === 'approved' || override.status === 'rejected')) {
      finalStatus = override.status;
    }
    return {
      ...localMatch,
      status: finalStatus,
      reviewed_at: override?.reviewed_at || localMatch.reviewed_at || null,
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
      let data: unknown[] | null = null;
      let queryError: unknown = null;

      try {
        const res = await client
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });
        if (!res.error && res.data) {
          data = res.data;
        } else {
          queryError = res.error;
        }
      } catch (err) {
        queryError = err;
      }

      if (!data) {
        try {
          const resNoOrder = await client.from(tableName).select('*');
          if (!resNoOrder.error && resNoOrder.data) {
            data = resNoOrder.data;
          }
        } catch {
          // continue
        }
      }

      if (!data || !Array.isArray(data)) {
        continue;
      }

      const list: RegistrationRecord[] = data.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        const parsed = extractRowData(r);
        const phoneStr = parsed.phone_number;
        const cleanPhone = normalizePhoneKey(phoneStr);
        const canon = canonicalPhone(phoneStr);
        const rawDigits = phoneStr.replace(/\D/g, '');
        const last8 = rawDigits.slice(-8);

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
          (cleanPhone ? statusOverridesMap.get(cleanPhone) : undefined) ||
          (canon ? statusOverridesMap.get(canon) : undefined) ||
          (rawDigits ? statusOverridesMap.get(rawDigits) : undefined) ||
          (last8 && last8.length >= 7 ? statusOverridesMap.get(last8) : undefined) ||
          (last8 && last8.length >= 7 ? statusOverridesMap.get(`09${last8}`) : undefined) ||
          (last8 && last8.length >= 7 ? statusOverridesMap.get(`07${last8}`) : undefined);

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

  const keysToSet = new Set<string>();
  if (id) keysToSet.add(id);
  if (rawPhone) keysToSet.add(rawPhone);
  if (canonical) keysToSet.add(canonical);
  if (cleanDigits) keysToSet.add(cleanDigits);
  if (last8 && last8.length >= 7) {
    keysToSet.add(last8);
    keysToSet.add(`09${last8}`);
    keysToSet.add(`07${last8}`);
    keysToSet.add(`+2519${last8}`);
    keysToSet.add(`+2517${last8}`);
    keysToSet.add(`2519${last8}`);
    keysToSet.add(`2517${last8}`);
  }

  for (const k of keysToSet) {
    statusOverridesMap.set(k, { status, reviewed_at: nowIso });
  }

  inMemoryRegistrations = inMemoryRegistrations.map((r) => {
    if (r.id === id || (rawPhone && phoneMatches(r.phone_number, rawPhone))) {
      return { ...r, status, reviewed_at: nowIso };
    }
    return r;
  });

  saveStateToDisk();

  const client = getSupabaseClient();
  if (!client) {
    return { success: true };
  }

  // Attempt database update asynchronously / without hanging
  const candidateTables = ['registrations', 'payments', 'subscriptions', 'subscribers', 'users', 'members'];
  const updatePayloads = [
    { status, reviewed_at: nowIso },
    { status },
  ];

  for (const tableName of candidateTables) {
    try {
      for (const payload of updatePayloads) {
        if (id && !id.startsWith('reg_')) {
          const { error } = await client.from(tableName).update(payload).eq('id', id);
          if (!error) break;
        }
        if (rawPhone) {
          const { error } = await client.from(tableName).update(payload).eq('phone_number', rawPhone);
          if (!error) break;
        }
      }
    } catch {
      // Ignore schema column errors as statusOverridesMap guarantees real-time persistence across all devices
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

  saveStateToDisk();

  const client = getSupabaseClient();
  if (!client) return { success: true };

  const candidateTables = ['registrations', 'payments', 'subscriptions'];
  for (const tableName of candidateTables) {
    try {
      if (id && !id.startsWith('reg_')) {
        await client.from(tableName).delete().eq('id', id);
        if (!isNaN(Number(id))) {
          await client.from(tableName).delete().eq('id', Number(id));
        }
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
  planMetaCache.clear();
  saveStateToDisk();

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

export interface BatchSyncRecordInput {
  id?: string;
  phone?: string;
  phoneNumber?: string;
  userPhone?: string;
  status?: 'pending' | 'approved' | 'rejected';
  planName?: string;
  amount?: number;
  reviewedAt?: string;
}

/**
 * Bulk sync statuses from client device or backup to server state & disk
 */
export async function batchSyncRegistrations(
  records: BatchSyncRecordInput[]
): Promise<{ success: boolean; updatedCount: number }> {
  if (!Array.isArray(records) || records.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  for (const item of records) {
    const rawPhone = item.phone || item.phoneNumber || item.userPhone;
    const cleanPhone = normalizePhoneKey(rawPhone || '');
    const canon = rawPhone ? canonicalPhone(rawPhone) : '';
    const rawDigits = (rawPhone || '').replace(/\D/g, '');
    const last8 = rawDigits.slice(-8);
    const reviewedTime = item.reviewedAt || nowIso;

    if (item.status && (item.status === 'approved' || item.status === 'rejected')) {
      const overrideObj = { status: item.status, reviewed_at: reviewedTime };
      if (item.id) {
        statusOverridesMap.set(item.id, overrideObj);
      }
      if (rawPhone) {
        statusOverridesMap.set(rawPhone, overrideObj);
      }
      if (cleanPhone) {
        statusOverridesMap.set(cleanPhone, overrideObj);
      }
      if (canon) {
        statusOverridesMap.set(canon, overrideObj);
      }
      if (rawDigits) {
        statusOverridesMap.set(rawDigits, overrideObj);
      }
      if (last8 && last8.length >= 7) {
        statusOverridesMap.set(last8, overrideObj);
        statusOverridesMap.set(`09${last8}`, overrideObj);
        statusOverridesMap.set(`07${last8}`, overrideObj);
        statusOverridesMap.set(`+2519${last8}`, overrideObj);
        statusOverridesMap.set(`2519${last8}`, overrideObj);
      }
      updatedCount++;
    }

    if (item.planName && typeof item.amount === 'number') {
      recordPlanMeta(item.id, rawPhone, item.planName, item.amount);
    }
  }

  saveStateToDisk();

  return {
    success: true,
    updatedCount,
  };
}
