import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/adminAuth';
import { sendSmsBatch, BatchRecipient } from '@/lib/smsServer';

export async function POST(req: NextRequest) {
  const authCheck = authorizeAdminRequest(req);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { recipients, message, batchIndex = 1, totalBatches = 1, gatewayConfig } = body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipients list is required and must not be empty.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'SMS message text is required.' },
        { status: 400 }
      );
    }

    const typedRecipients: BatchRecipient[] = recipients.map((r: any) => ({
      name: typeof r?.name === 'string' ? r.name : 'Member',
      phone: typeof r?.phone === 'string' ? r.phone : (r?.userPhone || r?.phone_number || ''),
      planName: r?.planName || r?.plan_name,
      amount: r?.amount,
    }));

    const result = await sendSmsBatch(typedRecipients, message.trim(), gatewayConfig);

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      batchIndex,
      totalBatches,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      results: result.results,
      error: result.error || null,
    });
  } catch (error: unknown) {
    console.error('API /api/admin/sms/send error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
