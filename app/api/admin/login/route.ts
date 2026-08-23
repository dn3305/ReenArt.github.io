import { NextResponse } from 'next/server';
import { verifyCredentials, SESSION_COOKIE, SESSION_TOKEN } from '@/lib/adminAuth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    if (!(await verifyCredentials(email, password))) {
      // Small delay to prevent brute-force timing attacks
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, SESSION_TOKEN, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
