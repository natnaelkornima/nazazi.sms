import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/adminAuth';
import { getSmsGatewayConfig, saveSmsGatewayConfig, sendSmsBatch } from '@/lib/smsServer';

export async function GET(req: NextRequest) {
  const authCheck = authorizeAdminRequest(req);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const config = getSmsGatewayConfig();
    // Mask sensitive API key for UI display
    const maskedKey = config.apiKey
      ? config.apiKey.length > 8
        ? `${config.apiKey.substring(0, 4)}••••••••${config.apiKey.substring(config.apiKey.length - 4)}`
        : '••••••••'
      : '';

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        apiKeyMasked: maskedKey,
        hasKey: Boolean(config.apiKey),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
    const { provider, apiUrl, apiKey, senderId, authHeader, batchSize, batchDelayMs } = body;

    const patch: any = {};
    if (provider !== undefined) patch.provider = provider;
    if (apiUrl !== undefined) patch.apiUrl = apiUrl.trim();
    if (apiKey !== undefined && apiKey !== '' && !apiKey.includes('••••')) patch.apiKey = apiKey.trim();
    if (senderId !== undefined) patch.senderId = senderId.trim();
    if (authHeader !== undefined) patch.authHeader = authHeader.trim();
    if (batchSize !== undefined) patch.batchSize = Number(batchSize);
    if (batchDelayMs !== undefined) patch.batchDelayMs = Number(batchDelayMs);

    const saved = saveSmsGatewayConfig(patch);

    return NextResponse.json({
      success: true,
      message: 'SMS Gateway configuration updated successfully.',
      config: {
        ...saved,
        hasKey: Boolean(saved.apiKey),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Test Connection with single SMS
 */
export async function PUT(req: NextRequest) {
  const authCheck = authorizeAdminRequest(req);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { testPhone, testMessage } = body;

    if (!testPhone) {
      return NextResponse.json({ success: false, error: 'Test phone number is required.' }, { status: 400 });
    }

    const testRecipient = {
      name: 'Admin Test',
      phone: testPhone,
      planName: 'Test Devotional',
      amount: 200,
    };

    const result = await sendSmsBatch(
      [testRecipient],
      testMessage || 'Nazazi SMS Gateway Test: Integration verified successfully.'
    );

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      error: result.error || null,
      results: result.results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
