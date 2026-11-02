import { NextResponse } from 'next/server';
import path from 'path';

export const runtime = 'nodejs';

function cleanSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '').replace(/^-+|-+$/g, '');
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const slug = cleanSlug(String(formData.get('slug') ?? ''));
    const position = Number(formData.get('position'));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file was provided.' }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ error: 'Enter a painting slug before uploading images.' }, { status: 400 });
    }
    if (!Number.isInteger(position) || position < 0 || position > 99) {
      return NextResponse.json({ error: 'Invalid image position.' }, { status: 400 });
    }

    const oracleUploadUrl = process.env.ORACLE_UPLOAD_URL?.trim();
    const oracleUploadToken = process.env.ORACLE_UPLOAD_TOKEN?.trim();
    if (!oracleUploadUrl || !oracleUploadToken) {
      return NextResponse.json({ error: 'Oracle image storage is not configured on the server.' }, { status: 503 });
    }

    const originalExtension = path.extname(file.name).toLowerCase();
    let buffer = Buffer.from(await file.arrayBuffer());
    let extension = originalExtension;

    if (extension === '.heic' || extension === '.heif') {
      try {
        const heicConvert = (await import('heic-convert')).default;
        const jpegBuffer = await heicConvert({ buffer, format: 'JPEG', quality: 0.92 });
        buffer = Buffer.from(jpegBuffer);
        extension = '.jpg';
      } catch (error) {
        console.error('HEIC conversion error:', error);
        return NextResponse.json({ error: 'Could not convert this HEIC image. Please try a JPG or PNG.' }, { status: 415 });
      }
    }

    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
      return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image.' }, { status: 415 });
    }

    const imageLabel = position === 0 ? 'cover_image' : `image${position + 1}`;
    const filename = `${slug}_${imageLabel}${extension === '.jpeg' ? '.jpg' : extension}`;
    const upload = new FormData();
    upload.append('file', new Blob([buffer], { type: file.type || 'application/octet-stream' }), filename);
    upload.append('filename', filename);

    const response = await fetch(oracleUploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${oracleUploadToken}` },
      body: upload,
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) {
      console.error('Oracle image upload failed:', response.status, result.error);
      return NextResponse.json({ error: result.error || 'Oracle image upload or Drive backup failed.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, filename, backup: result.backup ?? 'complete' });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
