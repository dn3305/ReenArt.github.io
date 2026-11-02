import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminGitHubToken } from '../../../../../lib/adminGitHubToken';

const REPO = 'dn3305/ReenArt.github.io';
const BRANCH = 'main';

export async function POST() {
  try {
    const token = getAdminGitHubToken();
    if (!token) return NextResponse.json({ error: 'GITHUB_TOKEN is not configured on the server.' }, { status: 503 });

    const filePath = 'paintings.csv';
    const url = `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`;
    const existing = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (existing.ok) {
      return NextResponse.json({ success: true, pushed: ['paintings.csv is already synced'] });
    }

    const localCsv = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
    const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '🎨 Initialize paintings database',
        content: Buffer.from(localCsv, 'utf-8').toString('base64'),
        branch: BRANCH,
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json({ error: `GitHub sync failed: ${JSON.stringify(error)}` }, { status: 502 });
    }
    return NextResponse.json({ success: true, pushed: ['paintings.csv'] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
