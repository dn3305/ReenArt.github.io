import { NextResponse } from 'next/server';
import { getLivePaintings } from '../../../../lib/oracleCatalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getLivePaintings(), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('Live painting catalog read failed:', error);
    return NextResponse.json({ error: 'Painting catalog is temporarily unavailable.' }, { status: 503 });
  }
}
