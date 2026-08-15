import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationByPhone } from '@/lib/supabaseServer';
import { canonicalPhone } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Public User Lookup Endpoint:
 * Allows a user to look up the status of their own registration using their exact phone number.
 * Returns ONLY the specific matching record, never the entire customer list.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPhone = searchParams.get('phone');

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number parameter is required for registration status verification.',
        },
        { status: 400 }
      );
    }

    const trimmed = rawPhone.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');

    if (digitsOnly.length < 8 || digitsOnly.length > 16) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid phone number format provided.',
        },
        { status: 400 }
      );
    }

    // Look up phone registration with canonical and fuzzy suffix matching
    const record = await getRegistrationByPhone(trimmed);

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: 'No registration found for the specified phone number.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      registration: {
        id: record.id,
        name: record.name,
        phone_number: record.phone_number,
        plan_name: record.plan_name,
        amount: record.amount,
        status: record.status || 'pending',
        created_at: record.created_at,
        reviewed_at: record.reviewed_at,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error checking registration status';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
