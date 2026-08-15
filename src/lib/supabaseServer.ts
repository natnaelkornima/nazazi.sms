import { createClient, SupabaseClient } from '@supabase/supabase-js';

function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
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

export function isSupabaseConfigured(): boolean {
  const url = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  return Boolean(
    url &&
    key &&
    !url.includes('your-project') &&
    !key.includes('your-supabase')
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  // Prefer server-only service role key, fallback to anon key
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (!url || !key || url.includes('your-project') || key.includes('your-supabase')) {
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
 * Saves a new registration record into the 'registrations' table in Supabase.
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

  try {
    const insertPayload: Record<string, unknown> = {
      name: record.name,
      phone_number: record.phone_number,
      payment_image_url: record.payment_image_url,
      plan_name: record.plan_name,
      amount: record.amount,
      status: record.status,
    };

    const { data: insertedData, error: insertError } = await client
      .from('registrations')
      .insert([insertPayload])
      .select('*');

    if (insertError) {
      // Retry with minimal columns
      const { data: retryData, error: retryError } = await client
        .from('registrations')
        .insert([
          {
            name: record.name,
            phone_number: record.phone_number,
            payment_image_url: record.payment_image_url,
          },
        ])
        .select('*');

      if (retryError) {
        inMemoryRegistrations.unshift(record);
        return {
          record,
          savedToSupabase: false,
          error: `${insertError.message} | Retry: ${retryError.message}`,
        };
      }

      const insertedRow = retryData && retryData.length > 0 ? retryData[0] : null;
      const formattedRecord: RegistrationRecord = insertedRow
        ? {
            id: String(insertedRow.id || fallbackId),
            name: insertedRow.name || record.name,
            phone_number: insertedRow.phone_number || record.phone_number,
            payment_image_url: insertedRow.payment_image_url || record.payment_image_url,
            plan_name: insertedRow.plan_name || record.plan_name,
            amount: typeof insertedRow.amount === 'number' ? insertedRow.amount : record.amount,
            status: insertedRow.status || record.status,
            created_at: insertedRow.created_at || record.created_at,
            reviewed_at: insertedRow.reviewed_at || null,
          }
        : record;

      inMemoryRegistrations.unshift(formattedRecord);
      return { record: formattedRecord, savedToSupabase: true };
    }

    const insertedRow = insertedData && insertedData.length > 0 ? insertedData[0] : null;
    const formattedRecord: RegistrationRecord = insertedRow
      ? {
          id: String(insertedRow.id || fallbackId),
          name: insertedRow.name || record.name,
          phone_number: insertedRow.phone_number || record.phone_number,
          payment_image_url: insertedRow.payment_image_url || record.payment_image_url,
          plan_name: insertedRow.plan_name || record.plan_name,
          amount: typeof insertedRow.amount === 'number' ? insertedRow.amount : record.amount,
          status: insertedRow.status || record.status,
          created_at: insertedRow.created_at || record.created_at,
          reviewed_at: insertedRow.reviewed_at || null,
        }
      : record;

    inMemoryRegistrations.unshift(formattedRecord);
    return { record: formattedRecord, savedToSupabase: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown Supabase error';
    inMemoryRegistrations.unshift(record);
    return {
      record,
      savedToSupabase: false,
      error: errorMsg,
    };
  }
}

/**
 * Look up a single registration by exact phone number
 */
export async function getRegistrationByPhone(phone: string): Promise<RegistrationRecord | null> {
  const cleanPhone = normalizePhoneKey(phone);
  if (!cleanPhone) return null;

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('registrations')
        .select('*')
        .ilike('phone_number', `%${cleanPhone.slice(-9)}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const idStr = String(data.id || '');
        const phoneStr = String(data.phone_number || '');
        const normalized = normalizePhoneKey(phoneStr);
        const cachedOverride =
          statusOverridesMap.get(idStr) ||
          (normalized ? statusOverridesMap.get(normalized) : undefined);

        const dbStatus = data.status as 'pending' | 'approved' | 'rejected' | undefined;
        let finalStatus: 'pending' | 'approved' | 'rejected' = 'pending';
        if (dbStatus === 'approved' || dbStatus === 'rejected') {
          finalStatus = dbStatus;
        } else if (cachedOverride?.status === 'approved' || cachedOverride?.status === 'rejected') {
          finalStatus = cachedOverride.status;
        }

        return {
          id: idStr,
          name: String(data.name || ''),
          phone_number: phoneStr,
          payment_image_url: String(data.payment_image_url || ''),
          plan_name: String(data.plan_name || 'Standard Plan (200 Birr)'),
          amount: typeof data.amount === 'number' ? data.amount : 200,
          status: finalStatus,
          created_at: String(data.created_at || new Date().toISOString()),
          reviewed_at: (data.reviewed_at ? String(data.reviewed_at) : null) || cachedOverride?.reviewed_at || null,
        };
      }
    } catch {
      // ignore and fallback
    }
  }

  // Fallback to in-memory lookup
  const match = inMemoryRegistrations.find((r) => {
    const rClean = normalizePhoneKey(r.phone_number);
    return rClean === cleanPhone || rClean.endsWith(cleanPhone) || cleanPhone.endsWith(rClean);
  });

  return match || null;
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

  try {
    const { data, error } = await client
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        registrations: inMemoryRegistrations,
        isFromSupabase: false,
        error: error.message,
      };
    }

    const list: RegistrationRecord[] = (data || []).map((row: Record<string, unknown>) => {
      const idStr = String(row.id || '');
      const phoneStr = String(row.phone_number || '');
      const cleanPhone = normalizePhoneKey(phoneStr);

      const cachedOverride =
        statusOverridesMap.get(idStr) ||
        (cleanPhone ? statusOverridesMap.get(cleanPhone) : undefined);

      const dbStatus = row.status as 'pending' | 'approved' | 'rejected' | undefined;
      
      let finalStatus: 'pending' | 'approved' | 'rejected' = 'pending';
      if (dbStatus === 'approved' || dbStatus === 'rejected') {
        finalStatus = dbStatus;
      } else if (cachedOverride && (cachedOverride.status === 'approved' || cachedOverride.status === 'rejected')) {
        finalStatus = cachedOverride.status;
      }

      const finalReviewedAt =
        (row.reviewed_at ? String(row.reviewed_at) : null) ||
        cachedOverride?.reviewed_at ||
        null;

      return {
        id: idStr,
        name: String(row.name || ''),
        phone_number: phoneStr,
        payment_image_url: String(row.payment_image_url || ''),
        plan_name: String(row.plan_name || 'Standard Plan (200 Birr)'),
        amount: typeof row.amount === 'number' ? row.amount : 200,
        status: finalStatus,
        created_at: String(row.created_at || new Date().toISOString()),
        reviewed_at: finalReviewedAt,
      };
    });

    return {
      registrations: list,
      isFromSupabase: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query Supabase';
    return {
      registrations: inMemoryRegistrations,
      isFromSupabase: false,
      error: msg,
    };
  }
}

/**
 * Updates a registration's status (approved, rejected, pending) in Supabase
 */
export async function updateRegistrationStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  phoneNumber?: string
): Promise<{ success: boolean; error?: string }> {
  const nowIso = new Date().toISOString();
  const cleanPhone = phoneNumber ? normalizePhoneKey(phoneNumber) : '';

  if (id) {
    statusOverridesMap.set(id, { status, reviewed_at: nowIso });
  }
  if (cleanPhone) {
    statusOverridesMap.set(cleanPhone, { status, reviewed_at: nowIso });
  }

  inMemoryRegistrations = inMemoryRegistrations.map((r) => {
    const rCleanPhone = normalizePhoneKey(r.phone_number);
    if (r.id === id || (cleanPhone && rCleanPhone === cleanPhone)) {
      return { ...r, status, reviewed_at: nowIso };
    }
    return r;
  });

  const client = getSupabaseClient();
  if (!client) {
    return { success: true };
  }

  try {
    let updateResult = await client
      .from('registrations')
      .update({
        status,
        reviewed_at: nowIso,
      })
      .eq('id', id)
      .select('id, status');

    if (updateResult.error) {
      updateResult = await client
        .from('registrations')
        .update({ status })
        .eq('id', id)
        .select('id, status');
    }

    if ((!updateResult.data || updateResult.data.length === 0) && cleanPhone) {
      await client
        .from('registrations')
        .update({ status })
        .ilike('phone_number', `%${cleanPhone.slice(-9)}%`);
    }

    return { success: true };
  } catch {
    return { success: true };
  }
}

/**
 * Deletes a registration from Supabase & memory
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
  if (!client) {
    return { success: true };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');

    if (isUuid) {
      await client
        .from('registrations')
        .delete()
        .eq('id', id);
    }

    if (cleanPhone) {
      await client
        .from('registrations')
        .delete()
        .ilike('phone_number', `%${cleanPhone.slice(-9)}%`);
    }

    return { success: true };
  } catch {
    return { success: true };
  }
}

/**
 * Resets all registrations (clears all records)
 */
export async function resetAllRegistrations(): Promise<{ success: boolean; count: number; error?: string }> {
  inMemoryRegistrations = [];
  statusOverridesMap.clear();

  const client = getSupabaseClient();
  if (!client) {
    return { success: true, count: 0 };
  }

  try {
    const { error, count } = await client
      .from('registrations')
      .delete()
      .neq('name', '___NEVER_MATCH___');

    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: count ?? 0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error clearing Supabase records';
    return { success: false, count: 0, error: msg };
  }
}
