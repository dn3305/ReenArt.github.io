import { NextResponse } from 'next/server';
import { readCsvRowsLive, rowsToCsv, rowToLine, pushCsvToGitHub } from '../../../../lib/paintingsCsv';
import { getAdminGitHubToken } from '../../../../lib/adminGitHubToken';

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
  };
}

// GET — return all paintings as JSON
export async function GET() {
  const rows = await readCsvRowsLive(getAdminGitHubToken());
  const header = rows.length > 0 ? rowToLine(rows[0]) : '';
  const paintings = rows.slice(1).map(paintingFromRow);
  return NextResponse.json({ header, paintings });
}

// POST — append a new painting row
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = getAdminGitHubToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'GITHUB_TOKEN is not configured on the server.' }, { status: 503 });
    }
    const rows = await readCsvRowsLive(token);
    rows.push([
      body.id, body.title, body.series, body.dimensions,
      body.medium, body.price, body.status, body.year,
      body.images, body.description, body.additionalInfo || '',
    ]);
    const newCsvContent = rowsToCsv(rows);

    const pushedToGitHub = token
      ? await pushCsvToGitHub(newCsvContent, token, '🎨 Update paintings.csv via Admin Dashboard')
      : false;

    if (!pushedToGitHub) {
      return NextResponse.json({ success: false, error: 'Could not save painting data to GitHub.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, pushedToGitHub });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
