import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REPO = 'dn3305/ReenArt.github.io';
const BRANCH = 'main';

async function getFileSha(token: string, filePath: string): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha ?? null;
}

async function pushFile(
  token: string,
  filePath: string,
  content: string,
  message: string
) {
  const sha = await getFileSha(token, filePath);
  const body: Record<string, unknown> = {
    message,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to push ${filePath}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  try {
    const { token, pushImages } = await req.json();
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 400 });

    const results: string[] = [];

    // 1. Push paintings.csv
    const csvPath = path.join(process.cwd(), 'paintings.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64');
    await pushFile(token, 'paintings.csv', csvBase64, '🎨 Update paintings database');
    results.push('paintings.csv pushed');

    // 2. Push images (optional, only new ones specified by caller)
    if (Array.isArray(pushImages) && pushImages.length > 0) {
      const imagesDir = path.join(process.cwd(), 'public', 'images');
      for (const imgName of pushImages) {
        const imgPath = path.join(imagesDir, imgName);
        if (!fs.existsSync(imgPath)) continue;
        const imgBuffer = fs.readFileSync(imgPath);
        const imgBase64 = imgBuffer.toString('base64');
        await pushFile(token, `public/images/${imgName}`, imgBase64, `🖼️ Add image: ${imgName}`);
        results.push(`${imgName} pushed`);
      }
    }

    return NextResponse.json({ success: true, pushed: results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
