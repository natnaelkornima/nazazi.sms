import { NextRequest, NextResponse } from 'next/server';
import { uploadPaymentImageToCloudinary } from '@/lib/cloudinaryServer';
import { saveRegistrationToSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit

export async function POST(req: NextRequest) {
  try {
    let name: string | null = null;
    let phoneNumber: string | null = null;
    let paymentImage: unknown = null;
    let planName = 'Standard Plan (200 Birr)';
    let amount = 200;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      name = body.name || body.userName || body.payerName;
      phoneNumber = body.phone_number || body.phoneNumber || body.userPhone;
      paymentImage = body.payment_image || body.paymentImage || body.screenshotUrl || body.image;
      if (body.plan_name || body.planName) planName = body.plan_name || body.planName;
      if (body.amount !== undefined) {
        const num = parseFloat(body.amount);
        if (!isNaN(num)) amount = num;
      }
    } else {
      const formData = await req.formData();
      name = (formData.get('name') || formData.get('userName') || formData.get('payerName')) as string | null;
      phoneNumber = (formData.get('phone_number') || formData.get('phoneNumber') || formData.get('userPhone')) as string | null;
      paymentImage = formData.get('payment_image') || formData.get('paymentImage') || formData.get('screenshotUrl');
      const pName = formData.get('plan_name') || formData.get('planName');
      if (pName && typeof pName === 'string') planName = pName;
      const amountStr = formData.get('amount') as string | null;
      if (amountStr) {
        const num = parseFloat(amountStr);
        if (!isNaN(num)) amount = num;
      }
    }

    // 1. Validate Name
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid full name (at least 2 characters).',
        },
        { status: 400 }
      );
    }

    // 2. Validate Phone Number
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a valid phone number.',
        },
        { status: 400 }
      );
    }

    const cleanPhone = phoneNumber.trim().replace(/[\s\-\(\)\.]/g, '');
    const phoneDigitsOnly = cleanPhone.replace(/^\+/, '');

    if (phoneDigitsOnly.length < 8 || phoneDigitsOnly.length > 15 || !/^\d+$/.test(phoneDigitsOnly)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid phone format. Please enter a valid number (e.g. 0911234567 or +251911234567).',
        },
        { status: 400 }
      );
    }

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
    const { secure_url: cloudinaryImageUrl, uploadedToCloudinary } =
      await uploadPaymentImageToCloudinary(buffer, mimeType);

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

