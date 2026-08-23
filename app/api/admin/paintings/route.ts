import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'paintings.csv');
const REPO = 'dn3305/ReenArt.github.io';
const BRANCH = 'main';

async function pushCsvToGitHub(csvContent: string, token: string) {
  if (!token) return false;
  try {
    const base64Content = Buffer.from(csvContent, 'utf-8').toString('base64');
    let sha: string | null = null;
    const getRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/paintings.csv?ref=${BRANCH}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
    );
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha ?? null;
    }

    const body: Record<string, unknown> = {
      message: '🎨 Update paintings.csv via Admin Dashboard',
      content: base64Content,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/paintings.csv`, {
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

// --- CSV helpers ---

// Reads the live file straight from the GitHub Contents API (backed directly by
// git data), not raw.githubusercontent.com, whose CDN can lag behind a commit by
// up to a minute or more and serve stale content right after a write.
async function fetchGitHubCsv(token?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/contents/paintings.csv?ref=${BRANCH}`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (e) {}
  return null;
}

// Parses full CSV content into rows, respecting quoted fields that contain
// embedded commas or newlines (e.g. multi-line "additional info" text).
// Splitting on '\n' before parsing quotes — as this file used to do — corrupts
// any row whose quoted field contains a real line break.
function parseCsvRows(content: string): string[][] {
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

async function readCsvRowsLive(token?: string): Promise<string[][]> {
  const liveCsv = await fetchGitHubCsv(token);
  if (liveCsv !== null) return parseCsvRows(liveCsv);
  try {
    const raw = fs.readFileSync(CSV_PATH, 'utf-8');
    return parseCsvRows(raw);
  } catch (e) {
    return [];
  }
}

function escapeCsvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function rowToLine(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

function paintingFromRow(cols: string[]) {
  return {
    id: cols[0] || '',
    title: cols[1] || '',
    series: cols[2] || '',
    dimensions: cols[3] || '',
    medium: cols[4] || '',
    price: cols[5] || '',
    status: cols[6] || '',
    year: cols[7] || '',
    images: cols[8] || '',
    description: cols[9] || '',
    additionalInfo: cols[10] || '',
  };
}

// GET — return all paintings as JSON
export async function GET() {
  const rows = await readCsvRowsLive();
  const header = rows.length > 0 ? rowToLine(rows[0]) : '';
  const paintings = rows.slice(1).map(paintingFromRow);
  return NextResponse.json({ header, paintings });
}

// POST — append a new painting row
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = req.headers.get('x-github-token') || body.token || '';
    const rows = await readCsvRowsLive(token);
    rows.push([
      body.id, body.title, body.series, body.dimensions,
      body.medium, body.price, body.status, body.year,
      body.images, body.description, body.additionalInfo || '',
    ]);
    const newCsvContent = rows.map(rowToLine).join('\n');

    let savedOnDisk = false;
    try {
      fs.writeFileSync(CSV_PATH, newCsvContent, 'utf-8');
      savedOnDisk = true;
    } catch (diskErr) {
      console.log('Serverless environment (read-only filesystem)');
    }

    let pushedToGitHub = false;
    if (token) {
      pushedToGitHub = await pushCsvToGitHub(newCsvContent, token);
    }

    return NextResponse.json({ success: true, savedOnDisk, pushedToGitHub });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
