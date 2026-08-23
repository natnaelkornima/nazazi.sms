import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { canonicalPhone, phoneMatches } from './validation';

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

  const planStr = String(
    row.plan_name ||
    row.plan ||
    row.subscription_plan ||
    'Standard Plan (200 Birr)'
  );

  const amountVal =
    typeof row.amount === 'number'
      ? row.amount
      : typeof row.price === 'number'
      ? row.price
      : 200;

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

/**
 * Saves a new registration record into Supabase with adaptive column stripping and table fallback.
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

  const record: RegistrationRecord = {
    id: fallbackId,
    name: data.name.trim(),
    phone_number: data.phone_number.trim(),
    payment_image_url: data.payment_image_url,
    plan_name: data.plan_name || 'Standard Plan (200 Birr)',
    amount: data.amount ?? 200,
    status: data.status || 'pending',
    created_at: nowIso,
  };

  const client = getSupabaseClient();

  if (!client) {
    inMemoryRegistrations.unshift(record);
    return {
      record,
      savedToSupabase: false,
      error: 'Supabase credentials not configured in environment variables. Falling back to memory state.',
    };
  }

  const candidateTables = ['registrations', 'payments', 'subscriptions'];

  for (const tableName of candidateTables) {
    const payload: Record<string, unknown> = {
      name: record.name,
      phone_number: record.phone_number,
      payment_image_url: record.payment_image_url,
      plan_name: record.plan_name,
      amount: record.amount,
      status: record.status,
    };

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const { data: insertedData, error: insertError } = await client
          .from(tableName)
          .insert([payload])
          .select('*');

        if (!insertError) {
          const insertedRow = insertedData && insertedData.length > 0 ? insertedData[0] : null;
          const formattedRecord = insertedRow
            ? extractRowData(insertedRow as Record<string, unknown>, fallbackId)
            : record;

          if (!formattedRecord.name) formattedRecord.name = record.name;
          if (!formattedRecord.phone_number) formattedRecord.phone_number = record.phone_number;
          if (!formattedRecord.payment_image_url) formattedRecord.payment_image_url = record.payment_image_url;

          inMemoryRegistrations.unshift(formattedRecord);
          return { record: formattedRecord, savedToSupabase: true };
        }

        const errMsg = insertError.message || '';

        // Check if table relation does not exist
        if (insertError.code === '42P01' || errMsg.includes('relation') || errMsg.includes('does not exist')) {
          break;
        }

        // Dynamically strip or remap unknown column
        const missingColMatch = errMsg.match(/column ['"]?([a-zA-Z0-9_]+)['"]? of relation|Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i);
        const missingCol = missingColMatch ? (missingColMatch[1] || missingColMatch[2]) : null;

        if (missingCol && missingCol in payload) {
          if (missingCol === 'name') {
            delete payload.name;
            payload.full_name = record.name;
          } else if (missingCol === 'full_name') {
            delete payload.full_name;
            payload.user_name = record.name;
          } else if (missingCol === 'phone_number') {
            delete payload.phone_number;
            payload.phone = record.phone_number;
          } else if (missingCol === 'phone') {
            delete payload.phone;
            payload.user_phone = record.phone_number;
          } else if (missingCol === 'payment_image_url') {
            delete payload.payment_image_url;
            payload.image_url = record.payment_image_url;
          } else if (missingCol === 'image_url') {
            delete payload.image_url;
            payload.screenshot_url = record.payment_image_url;
          } else if (missingCol === 'screenshot_url') {
            delete payload.screenshot_url;
            payload.receipt_url = record.payment_image_url;
          } else {
            delete payload[missingCol];
          }
          continue;
        }

        // Try minimal core columns
        if (attempt === 2) {
          const minimalPayload: Record<string, unknown> = {
            name: record.name,
            phone_number: record.phone_number,
            payment_image_url: record.payment_image_url,
          };
          const { data: minData, error: minErr } = await client
            .from(tableName)
            .insert([minimalPayload])
            .select('*');

          if (!minErr && minData && minData.length > 0) {
            const row = extractRowData(minData[0] as Record<string, unknown>, fallbackId);
            if (!row.name) row.name = record.name;
            inMemoryRegistrations.unshift(row);
            return { record: row, savedToSupabase: true };
          }
        }

        if (attempt === 3) {
          const altPayload: Record<string, unknown> = {
            full_name: record.name,
            phone: record.phone_number,
            image_url: record.payment_image_url,
          };
          const { data: altData, error: altErr } = await client
            .from(tableName)
            .insert([altPayload])
            .select('*');

          if (!altErr && altData && altData.length > 0) {
            const row = extractRowData(altData[0] as Record<string, unknown>, fallbackId);
            if (!row.name) row.name = record.name;
            inMemoryRegistrations.unshift(row);
            return { record: row, savedToSupabase: true };
          }
        }
      } catch {
        break;
      }
    }
  }

  inMemoryRegistrations.unshift(record);
  return {
    record,
    savedToSupabase: false,
    error: 'Could not insert into Supabase database (data preserved in memory).',
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

  const candidateTables = ['registrations', 'payments', 'subscriptions'];

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

        const cachedOverride =
          statusOverridesMap.get(parsed.id) ||
          (cleanPhone ? statusOverridesMap.get(cleanPhone) : undefined);

        let finalStatus = parsed.status;
        if (cachedOverride && (cachedOverride.status === 'approved' || cachedOverride.status === 'rejected')) {
          finalStatus = cachedOverride.status;
        }

        return {
          ...parsed,
          status: finalStatus,
          reviewed_at: parsed.reviewed_at || cachedOverride?.reviewed_at || null,
        };
      });

      return {
        registrations: list,
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
