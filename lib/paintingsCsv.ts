const REPO = 'dn3305/ReenArt.github.io';
const BRANCH = 'main';
export const PAINTINGS_CSV_PATH = 'paintings.csv';

// Parses full CSV content into rows, respecting quoted fields that contain
// embedded commas or newlines (e.g. multi-line "additional info" text).
// Splitting on '\n' before parsing quotes corrupts any row whose quoted field
// contains a real line break.
export function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

function escapeCsvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

export function rowToLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map(rowToLine).join('\n');
}

// Reads the live file straight from the GitHub Contents API (backed directly by
// git data), not raw.githubusercontent.com, whose CDN can lag behind a commit by
// up to a minute or more and serve stale content right after a write.
export async function fetchGitHubCsv(token?: string): Promise<{ content: string; sha: string } | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${PAINTINGS_CSV_PATH}?ref=${BRANCH}`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha };
  } catch (e) {
    return null;
  }
}

export async function readCsvRowsLive(token?: string): Promise<string[][]> {
  const live = await fetchGitHubCsv(token);
  if (live !== null) return parseCsvRows(live.content);
  return [
    ['id', 'title', 'series', 'dimensions', 'medium', 'price', 'status', 'year', 'images', 'description', 'additionalInfo'],
  ];
}

export async function pushCsvToGitHub(csvContent: string, token: string, message: string, sha?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const base64Content = Buffer.from(csvContent, 'utf-8').toString('base64');
    let existingSha = sha ?? null;
    if (existingSha === undefined || existingSha === null) {
      const getRes = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${PAINTINGS_CSV_PATH}?ref=${BRANCH}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store' }
      );
      if (getRes.ok) {
        const data = await getRes.json();
        existingSha = data.sha ?? null;
      }
    }

    const body: Record<string, unknown> = {
      message,
      content: base64Content,
      branch: BRANCH,
    };
    if (existingSha) body.sha = existingSha;

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${PAINTINGS_CSV_PATH}`, {
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
    console.error('GitHub CSV push error:', err);
    return false;
  }
}

// Column order used throughout paintings.csv.
export const CSV_COLUMNS = [
  'id', 'title', 'series', 'dimensions', 'medium', 'price', 'status', 'year', 'images', 'description', 'additionalInfo',
] as const;
