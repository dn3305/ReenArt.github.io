import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ valid: false, error: 'GitHub catalog sync has been retired.' }, { status: 410 });
}
