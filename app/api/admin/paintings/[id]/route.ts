import { NextResponse } from 'next/server';
import { readCsvRowsLive, rowsToCsv, savePaintingsCsv } from '../../../../../lib/paintingsCsv';
import { deleteOracleImages, imagesRemovedFromCatalog } from '../../../../../lib/oracleImages';

// PUT — update a painting row by id
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const rows = await readCsvRowsLive();
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
          body.frameCharge ?? cols[11] ?? '0',
        ];
      }
      return cols;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Painting not found' }, { status: 404 });
    }

    const newCsvContent = rowsToCsv(newRows);
    const savedToOracle = await savePaintingsCsv(newCsvContent);

    if (!savedToOracle) {
      return NextResponse.json({ success: false, error: 'Could not save painting data to Oracle and Drive.' }, { status: 502 });
    }
    const previousImages = rows.find((cols) => cols[0] === id)?.[8] || '';
    const removedImages = imagesRemovedFromCatalog(previousImages, newRows.slice(1));
    const imagesDeleted = await deleteOracleImages(removedImages);
    return NextResponse.json({ success: true, savedToOracle, imagesDeleted, removedImageCount: removedImages.length });
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
    const rows = await readCsvRowsLive();
    const deletedPainting = rows.find((cols, idx) => idx > 0 && cols[0] === id);
    const newRows = rows.filter((cols, idx) => idx === 0 || cols[0] !== id);

    if (newRows.length === rows.length) {
      return NextResponse.json({ error: 'Painting not found' }, { status: 404 });
    }

    const newCsvContent = rowsToCsv(newRows);
    const savedToOracle = await savePaintingsCsv(newCsvContent);

    if (!savedToOracle) {
      return NextResponse.json({ success: false, error: 'Could not save painting data to Oracle and Drive.' }, { status: 502 });
    }
    const removedImages = imagesRemovedFromCatalog(deletedPainting?.[8] || '', newRows.slice(1));
    const imagesDeleted = await deleteOracleImages(removedImages);
    return NextResponse.json({ success: true, savedToOracle, imagesDeleted, removedImageCount: removedImages.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
