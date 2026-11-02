import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Catalog storage now uses the Oracle server.' }, { status: 410 });
}
