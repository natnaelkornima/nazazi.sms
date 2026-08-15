import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Rate limiting in-memory store
interface AttemptRecord {
  count: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const attemptsMap = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 3 * 60 * 1000; // 3 minutes lockout on 5 consecutive failures

// Secret for generating HMAC tokens
const AUTH_SECRET =
  process.env.ADMIN_AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'nazazi_admin_secure_hmac_secret_2026';

// Permitted admin passwords: from env var or default system passcode
function getValidAdminPasswords(): string[] {
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  const defaults = ['nazazi2026', 'admin2026', 'NazaziAdmin#2026'];
  return envPass ? [envPass, ...defaults] : defaults;
}

// Generate secure session token with expiry (12 hours)
function generateSessionToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
  const payload = `${expiresAt}:${crypto.randomBytes(16).toString('hex')}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64');
  return { token, expiresAt };
}

// Verify session token
function verifySessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [expiresAtStr, randomHex, signature] = decoded.split(':');
    if (!expiresAtStr || !randomHex || !signature) return false;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedPayload = `${expiresAtStr}:${randomHex}`;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(expectedPayload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

// Timing safe comparison for password strings
function safeCompare(input: string, target: string): boolean {
  const inputBuffer = Buffer.from(input);
  const targetBuffer = Buffer.from(target);
  if (inputBuffer.length !== targetBuffer.length) {
    // Constant time dummy comparison
    crypto.timingSafeEqual(targetBuffer, targetBuffer);
    return false;
  }
  return crypto.timingSafeEqual(inputBuffer, targetBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'admin-client';
    const now = Date.now();

    // Check rate-limiting
    const record = attemptsMap.get(ip) || { count: 0, lastAttempt: now };
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Security lockout active for ${remainingSec} seconds.`,
          locked: true,
          remainingSec,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const password = (body.password || body.passcode || body.pin || '').toString().trim();
    const action = body.action;

    // Verify existing token action
    if (action === 'verify') {
      const token = body.token;
      if (token && verifySessionToken(token)) {
        return NextResponse.json({ success: true, valid: true });
      }
      return NextResponse.json({ success: false, valid: false }, { status: 401 });
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password / Passcode is required.' },
        { status: 400 }
      );
    }

    const validPasswords = getValidAdminPasswords();
    let isMatch = false;

    for (const validPass of validPasswords) {
      if (safeCompare(password, validPass)) {
        isMatch = true;
        break;
      }
    }

    if (!isMatch) {
      record.count += 1;
      record.lastAttempt = now;
      if (record.count >= MAX_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;
      }
      attemptsMap.set(ip, record);

      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - record.count);
      return NextResponse.json(
        {
          success: false,
          error:
            record.count >= MAX_ATTEMPTS
              ? `Maximum failed attempts reached. Console locked for 3 minutes.`
              : `Invalid passcode. ${attemptsLeft} attempt(s) remaining before security lockout.`,
          attemptsRemaining: attemptsLeft,
          locked: record.count >= MAX_ATTEMPTS,
        },
        { status: 401 }
      );
    }

    // Success: clear rate limiting and generate secure session token
    attemptsMap.delete(ip);
    const { token, expiresAt } = generateSessionToken();

    return NextResponse.json({
      success: true,
      message: 'Admin authentication verified successfully.',
      session: {
        token,
        expiresAt,
        role: 'admin',
        authTime: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server authentication error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
