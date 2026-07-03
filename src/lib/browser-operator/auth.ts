import 'server-only';

import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const API_KEY_HEADER = 'x-browser-operator-key';

function safeEqual(a: string, b: string): boolean {
  const supplied = Buffer.from(a);
  const expected = Buffer.from(b);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function validateBrowserOperatorApiKey(request: NextRequest): boolean {
  const requiredKey = process.env.BROWSER_OPERATOR_API_KEY?.trim();
  if (!requiredKey) {
    return process.env.NODE_ENV !== 'production';
  }

  const providedKey = request.headers.get(API_KEY_HEADER)?.trim();
  if (!providedKey) return false;

  return safeEqual(providedKey, requiredKey);
}

export function browserOperatorUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
