import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseServer';
import { isCloudinaryConfigured } from '@/lib/cloudinaryServer';
import { authorizeAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authorize Admin Request
  const auth = authorizeAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized access to admin diagnostics.' },
      { status: 401 }
    );
  }

  let supabaseTableStatus = 'not_checked';
  let supabaseError: string | null = null;
  let tableRowCount = 0;
  let canInsert = false;
  const insertError: string | null = null;
  let clientInitialized = false;

  const client = getSupabaseClient();

  if (client) {
    clientInitialized = true;
    try {
      // Test Select / Count with service client
      const { data, error, count } = await client
        .from('registrations')
        .select('*', { count: 'exact' })
        .limit(5);

      if (error) {
        supabaseTableStatus = 'table_error';
        supabaseError = `${error.message} (Code: ${error.code || 'N/A'})`;
      } else {
        supabaseTableStatus = 'connected_ready';
        tableRowCount = count ?? (data?.length || 0);
        canInsert = true;
      }
    } catch (err: unknown) {
      supabaseTableStatus = 'connection_failed';
      supabaseError = err instanceof Error ? err.message : 'Unknown exception connecting to Supabase';
    }
  } else {
    supabaseTableStatus = 'unconfigured';
    supabaseError = 'Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are missing.';
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const maskedKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? `***...${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-6)}`
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? `***...${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-6)}`
    : 'none';

  return NextResponse.json({
    success: true,
    diagnostics: {
      isConfigured: isSupabaseConfigured(),
      clientInitialized,
      supabaseUrl: rawUrl,
      keyConfigured: maskedKey !== 'none',
      status: supabaseTableStatus,
      rowCount: tableRowCount,
      readError: supabaseError,
      writeError: insertError,
      canInsert,
    },
    cloudinary: {
      isConfigured: isCloudinaryConfigured,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    },
  });
}
