import { NextResponse } from 'next/server';
import { getUsdToInrRate } from '../../../lib/exchangeRate';

export async function GET() {
  const rate = await getUsdToInrRate();
  return NextResponse.json({ rate, base: 'USD', quote: 'INR' });
}
