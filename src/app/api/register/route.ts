import { NextRequest, NextResponse } from 'next/server';
import { uploadPaymentImageToCloudinary } from '@/lib/cloudinaryServer';
import { saveRegistrationToSupabase } from '@/lib/supabaseServer';
import { validateFullName, validateEthiopianPhone } from '@/lib/validation';
import { normalizePlanAndAmount } from '@/lib/planUtils';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit

export async function POST(req: NextRequest) {
  try {
    let name: string | null = null;
    let phoneNumber: string | null = null;
    let paymentImage: unknown = null;
    
    // Extract plan & amount hints from query parameters & headers (crucial for Instagram WebViews)
    const { searchParams } = new URL(req.url);
    const queryPlan = searchParams.get('plan_name') || searchParams.get('plan') || searchParams.get('planName') || searchParams.get('tier');
    const queryAmount = searchParams.get('amount') || searchParams.get('price');
    const queryPlanId = searchParams.get('plan_id') || searchParams.get('planId');

    const headerPlan = req.headers.get('x-plan-name') ? decodeURIComponent(req.headers.get('x-plan-name') || '') : null;
    const headerAmount = req.headers.get('x-plan-amount') || req.headers.get('x-amount');
    const headerPlanId = req.headers.get('x-plan-id');

    let rawPlanName: string | null = queryPlan || headerPlan || null;
    let rawAmount: string | number | null = queryAmount || headerAmount || null;

    if (!rawPlanName && (queryPlanId === '6m' || headerPlanId === '6m')) {
      rawPlanName = '6 Months Access (1,000 Birr)';
      rawAmount = 1000;
    } else if (!rawPlanName && (queryPlanId === '3m' || headerPlanId === '3m')) {
      rawPlanName = '3 Months Access (600 Birr)';
      rawAmount = 600;
    } else if (!rawPlanName && (queryPlanId === '1m' || headerPlanId === '1m')) {
      rawPlanName = '1 Month Access (200 Birr)';
      rawAmount = 200;
    }

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      name = body.name || body.userName || body.payerName;
      phoneNumber = body.phone_number || body.phoneNumber || body.userPhone;
      paymentImage = body.payment_image || body.paymentImage || body.screenshotUrl || body.image;
      if (body.plan_name || body.planName) rawPlanName = body.plan_name || body.planName;
      if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
        rawAmount = body.amount;
      }
    } else {
      const formData = await req.formData();
      name = (formData.get('name') || formData.get('userName') || formData.get('payerName')) as string | null;
      phoneNumber = (formData.get('phone_number') || formData.get('phoneNumber') || formData.get('userPhone')) as string | null;
      paymentImage = formData.get('payment_image') || formData.get('paymentImage') || formData.get('screenshotUrl');
      const pName = formData.get('plan_name') || formData.get('planName');
      if (pName && typeof pName === 'string' && pName.trim()) {
        rawPlanName = pName.trim();
      }
      const amountStr = formData.get('amount') as string | null;
      if (amountStr && amountStr.trim()) {
        rawAmount = amountStr.trim();
      }
    }

    // Intelligently normalize the plan and amount (prevents dropping 600 / 1000 to 200)
    const { planName, amount } = normalizePlanAndAmount(rawPlanName, rawAmount);

    // 1. Validate Name
    const nameValidation = validateFullName(name || '');
    if (!nameValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: nameValidation.error || 'Please enter a valid full name (e.g. Abebe Kebede).',
        },
        { status: 400 }
      );
    }

    // 2. Validate Phone Number (Must start with 09 or +2519)
    const phoneValidation = validateEthiopianPhone(phoneNumber || '');
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: phoneValidation.error || 'Phone number must start with 09 or +2519 (e.g. 0911234567 or +251911234567).',
        },
        { status: 400 }
      );
    }

    const cleanPhone = phoneValidation.cleanPhone;

    // 3. Process & Validate Payment Image
    let buffer: Buffer;
    let mimeType = 'image/jpeg';

    if (!paymentImage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment image / receipt screenshot is required.',
        },
        { status: 400 }
      );
    }

    if (typeof paymentImage === 'string') {
      if (paymentImage.startsWith('data:')) {
        const matches = paymentImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          const parts = paymentImage.split(',');
          buffer = Buffer.from(parts[1] || parts[0], 'base64');
        }
      } else {
        buffer = Buffer.from(paymentImage, 'base64');
      }
    } else if (paymentImage instanceof Blob) {
      if (paymentImage.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payment image exceeds the maximum limit of 10 MB.',
          },
          { status: 400 }
        );
      }
      mimeType = paymentImage.type || 'image/jpeg';
      const arrayBuffer = await paymentImage.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid image file format provided.',
        },
        { status: 400 }
      );
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment image is empty. Please select a valid screenshot.',
        },
        { status: 400 }
      );
    }

    // 4. Upload Payment Image to Cloudinary (Server-Side)
    const {
      secure_url: cloudinaryImageUrl,
      uploadedToCloudinary,
      error: uploadError,
      cloudName,
    } = await uploadPaymentImageToCloudinary(buffer, mimeType);

    // 5. Store in Supabase
    const { record, savedToSupabase, error: dbError } = await saveRegistrationToSupabase({
      name: name.trim(),
      phone_number: cleanPhone,
      payment_image_url: cloudinaryImageUrl,
      plan_name: planName,
      amount: isNaN(amount) ? 200 : amount,
      status: 'pending',
    });

    return NextResponse.json(
      {
        success: true,
        message: savedToSupabase
          ? 'Registration stored in Supabase database successfully.'
          : 'Registration processed locally.',
        savedToSupabase,
        uploadedToCloudinary,
        cloudinaryError: uploadError || null,
        cloudName: cloudName || null,
        dbError: dbError || null,
        registration: record,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration processing error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

