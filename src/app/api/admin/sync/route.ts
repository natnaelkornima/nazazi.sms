import { NextRequest, NextResponse } from 'next/server';
import { batchSyncRegistrations, getAllRegistrations } from '@/lib/supabaseServer';
import { authorizeAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * Bulk Admin Sync Endpoint:
 * Allows any client (PC, phone, tablet) to sync local approval states into the server persistence layer.
 * Returns the merged canonical list with updated statistics.
 */
export async function POST(req: NextRequest) {
  // 1. Authorize Admin Request
  const auth = authorizeAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized admin access.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const records = body.records || body.submissions || [];

    const { updatedCount } = await batchSyncRegistrations(records);
    const { registrations, isFromSupabase } = await getAllRegistrations();

    const pendingCount = registrations.filter((r) => r.status === 'pending').length;
    const approvedCount = registrations.filter((r) => r.status === 'approved').length;
    const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;
    const totalRevenueETB = registrations
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (r.amount || 200), 0);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${updatedCount} status record(s).`,
      updatedCount,
      registrations,
      stats: {
        total: registrations.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalRevenueETB,
      },
      isFromSupabase,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to process admin sync';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
