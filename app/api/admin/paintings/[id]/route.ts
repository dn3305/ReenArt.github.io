import { NextResponse } from 'next/server';
import { readCsvRowsLive, rowsToCsv, pushCsvToGitHub } from '../../../../../lib/paintingsCsv';
import { getAdminGitHubToken } from '../../../../../lib/adminGitHubToken';
import { deleteOracleImages, imagesRemovedFromCatalog } from '../../../../../lib/oracleImages';

// PUT — update a painting row by id
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const token = getAdminGitHubToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'GITHUB_TOKEN is not configured on the server.' }, { status: 503 });
    }
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

    if (!pushedToGitHub) {
      return NextResponse.json({ success: false, error: 'Could not save painting data to GitHub.' }, { status: 502 });
    }
    const previousImages = rows.find((cols) => cols[0] === id)?.[8] || '';
    const removedImages = imagesRemovedFromCatalog(previousImages, newRows.slice(1));
    const imagesDeleted = await deleteOracleImages(removedImages);
    return NextResponse.json({ success: true, pushedToGitHub, imagesDeleted, removedImageCount: removedImages.length });
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
    const token = getAdminGitHubToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'GITHUB_TOKEN is not configured on the server.' }, { status: 503 });
    }
    const rows = await readCsvRowsLive(token);
    const deletedPainting = rows.find((cols, idx) => idx > 0 && cols[0] === id);
    const newRows = rows.filter((cols, idx) => idx === 0 || cols[0] !== id);

    if (newRows.length === rows.length) {
      return NextResponse.json({ error: 'Painting not found' }, { status: 404 });
    }

    const newCsvContent = rowsToCsv(newRows);
    const pushedToGitHub = token
      ? await pushCsvToGitHub(newCsvContent, token, '🎨 Update paintings.csv via Admin Dashboard')
      : false;

    if (!pushedToGitHub) {
      return NextResponse.json({ success: false, error: 'Could not save painting data to GitHub.' }, { status: 502 });
    }
    const removedImages = imagesRemovedFromCatalog(deletedPainting?.[8] || '', newRows.slice(1));
    const imagesDeleted = await deleteOracleImages(removedImages);
    return NextResponse.json({ success: true, pushedToGitHub, imagesDeleted, removedImageCount: removedImages.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
