import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/adminAuth';
import {
  getScheduledCampaigns,
  createScheduledCampaign,
  updateScheduledCampaign,
  deleteScheduledCampaign,
} from '@/lib/smsServer';
import { SmsTargetPlan, SmsScheduleDuration } from '@/types';

export async function GET(req: NextRequest) {
  const authCheck = authorizeAdminRequest(req);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const campaigns = getScheduledCampaigns();
    return NextResponse.json({
      success: true,
      campaigns,
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
    const {
      title,
      targetPlan = 'all',
      targetCount = 0,
      duration = '1_month',
      dailyTime = '07:00',
      startDate,
      messageTemplate,
    } = body;

    if (!messageTemplate || !messageTemplate.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message template is required for scheduled campaigns.' },
        { status: 400 }
      );
    }

    const campaign = createScheduledCampaign({
      title: (title || '').trim(),
      targetPlan: targetPlan as SmsTargetPlan,
      targetCount: Number(targetCount) || 0,
      duration: duration as SmsScheduleDuration,
      dailyTime,
      startDate,
      messageTemplate: messageTemplate.trim(),
    });

    return NextResponse.json({
      success: true,
      campaign,
      message: `Campaign "${campaign.title}" successfully scheduled for ${campaign.totalRuns} days at ${campaign.dailyTime} daily.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authCheck = authorizeAdminRequest(req);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, status, runNow } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign ID is required.' }, { status: 400 });
    }

    const campaigns = getScheduledCampaigns();
    const existing = campaigns.find((c) => c.id === id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Campaign not found.' }, { status: 404 });
    }

    const patch: any = {};
    if (status && (status === 'active' || status === 'paused' || status === 'completed')) {
      patch.status = status;
    }
    if (runNow) {
      patch.lastRunAt = new Date().toISOString();
      patch.runsCompleted = Math.min(existing.totalRuns, (existing.runsCompleted || 0) + 1);
      if (patch.runsCompleted >= existing.totalRuns) {
        patch.status = 'completed';
      }
    }

    const updated = updateScheduledCampaign(id, patch);

    return NextResponse.json({
      success: true,
      campaign: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authCheck = authorizeAdminRequest(req);
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error || 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign ID parameter is required.' }, { status: 400 });
    }

    const deleted = deleteScheduledCampaign(id);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Scheduled campaign removed.' : 'Campaign not found.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
