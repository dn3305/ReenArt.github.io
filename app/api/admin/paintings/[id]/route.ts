import { NextResponse } from 'next/server';
import { readCsvRowsLive, rowsToCsv, pushCsvToGitHub } from '../../../../../lib/paintingsCsv';

// PUT — update a painting row by id
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const token = req.headers.get('x-github-token') || body.token || '';
    const rows = await readCsvRowsLive(token);
    let updated = false;

    const newRows = rows.map((cols, idx) => {
      if (idx === 0) return cols;
      if (cols[0] === id) {
        updated = true;
        return [
          body.id ?? cols[0],
          body.title ?? cols[1],
          body.series ?? cols[2],
          body.dimensions ?? cols[3],
          body.medium ?? cols[4],
          body.price ?? cols[5],
          body.status ?? cols[6],
          body.year ?? cols[7],
          body.images ?? cols[8],
          body.description ?? cols[9],
          body.additionalInfo ?? cols[10] ?? '',
        ];
      }
      return cols;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Painting not found' }, { status: 404 });
    }

    const newCsvContent = rowsToCsv(newRows);
    const pushedToGitHub = token
      ? await pushCsvToGitHub(newCsvContent, token, '🎨 Update paintings.csv via Admin Dashboard')
      : false;

    return NextResponse.json({ success: true, pushedToGitHub });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — remove a painting row by id
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('x-github-token') || '';
    const rows = await readCsvRowsLive(token);
    const newRows = rows.filter((cols, idx) => idx === 0 || cols[0] !== id);

    if (newRows.length === rows.length) {
      return NextResponse.json({ error: 'Painting not found' }, { status: 404 });
    }

    const newCsvContent = rowsToCsv(newRows);
    const pushedToGitHub = token
      ? await pushCsvToGitHub(newCsvContent, token, '🎨 Update paintings.csv via Admin Dashboard')
      : false;

    return NextResponse.json({ success: true, pushedToGitHub });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
