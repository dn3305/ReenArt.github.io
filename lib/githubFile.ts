const REPO = 'dn3305/ReenArt.github.io';
const BRANCH = 'main';

// Reads a file straight from the GitHub Contents API (backed directly by git
// data), not raw.githubusercontent.com, whose CDN can lag behind a commit by
// up to a minute or more and serve stale content right after a write.
export async function fetchGitHubFile(path: string, token?: string): Promise<{ content: string; sha: string } | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha };
  } catch (e) {
    return null;
  }
}

export async function pushFileToGitHub(
  path: string,
  content: string,
  token: string,
  message: string,
  sha?: string | null
): Promise<boolean> {
  if (!token) return false;
  try {
    const base64Content = Buffer.from(content, 'utf-8').toString('base64');
    let existingSha = sha;
    if (existingSha === undefined) {
      const existing = await fetchGitHubFile(path, token);
      existingSha = existing?.sha ?? null;
    }

    const body: Record<string, unknown> = { message, content: base64Content, branch: BRANCH };
    if (existingSha) body.sha = existingSha;

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
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
    console.error(`GitHub push error for ${path}:`, err);
    return false;
  }
}
