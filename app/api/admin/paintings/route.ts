import { NextResponse } from 'next/server';
import { readCsvRowsLive, rowsToCsv, rowToLine, savePaintingsCsv } from '../../../../lib/paintingsCsv';

function paintingFromRow(cols: string[]) {
  return {
    id: cols[0] || '',
    title: cols[1] || '',
    series: cols[2] || '',
    dimensions: cols[3] || '',
    medium: cols[4] || '',
    price: cols[5] || '',
    status: cols[6] || '',
    year: cols[7] || '',
    images: cols[8] || '',
    description: cols[9] || '',
    additionalInfo: cols[10] || '',
    frameCharge: cols[11] || '0',
  };
}

// GET — return all paintings as JSON
export async function GET() {
  try {
    const rows = await readCsvRowsLive();
    const header = rows.length > 0 ? rowToLine(rows[0]) : '';
    const paintings = rows.slice(1).map(paintingFromRow);
    return NextResponse.json({ header, paintings });
  } catch (e) {
    return NextResponse.json({ error: 'Could not load the Oracle painting catalog.' }, { status: 503 });
  }
}

// POST — append a new painting row
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = await readCsvRowsLive();
    rows.push([
      body.id, body.title, body.series, body.dimensions,
      body.medium, body.price, body.status, body.year,
      body.images, body.description, body.additionalInfo || '', body.frameCharge || '0',
    ]);
    const newCsvContent = rowsToCsv(rows);

    const savedToOracle = await savePaintingsCsv(newCsvContent);

    if (!savedToOracle) {
      return NextResponse.json({ success: false, error: 'Could not save painting data to Oracle and Drive.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, savedToOracle });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
