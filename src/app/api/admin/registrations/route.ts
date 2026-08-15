import { NextRequest, NextResponse } from 'next/server';
import {
  getAllRegistrations,
  updateRegistrationStatus,
  deleteRegistration,
  resetAllRegistrations,
  isSupabaseConfigured,
} from '@/lib/supabaseServer';
import { isCloudinaryConfigured } from '@/lib/cloudinaryServer';
import { authorizeAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Authorize Admin Request
  const auth = authorizeAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized admin access.' },
      { status: 401 }
    );
  }

  try {
    const { registrations, isFromSupabase, error } = await getAllRegistrations();

    const pendingCount = registrations.filter((r) => r.status === 'pending').length;
    const approvedCount = registrations.filter((r) => r.status === 'approved').length;
    const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;
    const totalRevenueETB = registrations
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + (r.amount || 200), 0);

    return NextResponse.json({
      success: true,
      registrations,
      stats: {
        total: registrations.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalRevenueETB,
      },
      connection: {
        isSupabaseConfigured: isSupabaseConfigured(),
        isFromSupabase,
        isCloudinaryConfigured,
        dbError: error || null,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch admin registrations';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const { id, status, phone, phoneNumber, userPhone } = body;
    const phoneToMatch = phone || phoneNumber || userPhone;

    if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters. Valid status is pending, approved, or rejected.' },
        { status: 400 }
      );
    }

    const result = await updateRegistrationStatus(id, status, phoneToMatch);
    if (!result.success) {
      console.warn('Supabase status update notice:', result.error);
    }

    return NextResponse.json({
      success: true,
      message: `Registration status updated to ${status}.`,
      id,
      status,
      error: result.error || null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error updating registration';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // 1. Authorize Admin Request
  const auth = authorizeAdminRequest(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized admin access.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    let id = searchParams.get('id');
    let phone = searchParams.get('phone');

    if (!id && !action) {
      try {
        const body = await req.json();
        if (body.action) id = body.action === 'reset' ? null : id;
        if (body.id) id = body.id;
        if (body.phone || body.phoneNumber || body.userPhone) {
          phone = body.phone || body.phoneNumber || body.userPhone;
        }
      } catch {
        // body is optional in DELETE
      }
    }

    if (action === 'reset') {
      const resetResult = await resetAllRegistrations();
      return NextResponse.json({
        success: true,
        message: 'All registrations cleared successfully.',
        clearedCount: resetResult.count,
      });
    }

    if (id || phone) {
      const deleteResult = await deleteRegistration(id || '', phone || undefined);
      if (!deleteResult.success) {
        return NextResponse.json(
          { success: false, error: deleteResult.error || 'Failed to delete record' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Registration deleted successfully.`,
        id,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide either id, phone, or ?action=reset parameter' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error deleting registration';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
