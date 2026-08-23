import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REPO = 'dn3305/ReenArt.github.io';
const BRANCH = 'main';

async function pushToGitHub(filename: string, buffer: Buffer, token?: string) {
  if (!token) return false;
  try {
    const base64Content = buffer.toString('base64');
    const filePath = `public/images/${filename}`;

    // Get SHA if exists
    let sha: string | null = null;
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha ?? null;
    }

    const body: Record<string, unknown> = {
      message: `🖼️ Upload image: ${filename}`,
      content: base64Content,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return putRes.ok;
  } catch (err) {
    console.error('GitHub push error:', err);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const token = req.headers.get('x-github-token') || (formData.get('token') as string) || '';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();
    let buffer = Buffer.from(await file.arrayBuffer());
    let savedName = originalName;

    // Handle HEIC / HEIF conversion
    if (ext === '.heic' || ext === '.heif') {
      try {
        const heicConvert = (await import('heic-convert')).default;
        const jpegBuffer = await heicConvert({
          buffer,
          format: 'JPEG',
          quality: 0.92,
        });
        buffer = Buffer.from(jpegBuffer);
        savedName = originalName.replace(/\.(heic|heif)$/i, '.jpg');
      } catch (heicErr) {
        console.error('HEIC conversion error:', heicErr);
      }
    }

    // Sanitize filename to avoid weird URL characters
    savedName = savedName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // 1. Try local disk save (works on local dev machine)
    let savedOnDisk = false;
    try {
      const imagesDir = path.join(process.cwd(), 'public', 'images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }
      fs.writeFileSync(path.join(imagesDir, savedName), buffer);
      savedOnDisk = true;
    } catch (diskErr) {
      // EROFS on serverless environment (Vercel) - expected & handled!
      console.log('Serverless environment detected (read-only filesystem)');
    }

    // 2. If GitHub token present, push to GitHub repository so Vercel deploys it
    let pushedToGitHub = false;
    if (token) {
      pushedToGitHub = await pushToGitHub(savedName, buffer, token);
    }

    return NextResponse.json({
      success: true,
      filename: savedName,
      pushedToGitHub,
      savedOnDisk,
      // Return Data URI so the image displays immediately in the UI even before Vercel rebuilds!
      dataUri: `data:image/jpeg;base64,${buffer.toString('base64')}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
