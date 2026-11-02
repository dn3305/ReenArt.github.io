import { NextResponse } from 'next/server';
import { getAdminGitHubToken } from '../../../../../lib/adminGitHubToken';

const REPO = 'dn3305/ReenArt.github.io';

export async function GET() {
  try {
    const token = getAdminGitHubToken();
    if (!token) return NextResponse.json({ valid: false, error: 'GITHUB_TOKEN is not configured on the server.' }, { status: 503 });

    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ valid: false, error: 'Token invalid or no access to repo' }, { status: 200 });
    }

    const data = await res.json();
    const hasWrite = data.permissions?.push === true;

    return NextResponse.json({
      valid: hasWrite,
      username: data.owner?.login ?? 'unknown',
      repoName: data.full_name,
      message: hasWrite ? 'Token is valid with write access ✓' : 'Token valid but no write access',
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
