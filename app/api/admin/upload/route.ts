import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();

    // Read uploaded file into a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Make sure the images directory exists
    const imagesDir = path.join(process.cwd(), 'public', 'images');

    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    let savedName = originalName;

    // Handle HEIC / HEIF files
    if (ext === '.heic' || ext === '.heif') {
      const heicConvert = (await import('heic-convert')).default;

      const jpegBuffer = await heicConvert({
        buffer,
        format: 'JPEG',
        quality: 0.92,
      });

      savedName = originalName.replace(
        /\.(heic|heif)$/i,
        '.jpg'
      );

      const outputPath = path.join(imagesDir, savedName);

      fs.writeFileSync(
        outputPath,
        Buffer.from(jpegBuffer)
      );
    } else {
      // Save normal image files directly
      const outputPath = path.join(imagesDir, originalName);

      fs.writeFileSync(outputPath, buffer);
    }

    return NextResponse.json({
      success: true,
      filename: savedName,
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}``
