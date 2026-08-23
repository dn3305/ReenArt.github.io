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

async function fetchGitHubCsv(): Promise<string | null> {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/paintings.csv?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (res.ok) return await res.text();
  } catch (e) {}
  return null;
}

function readCsvLinesLocal(): string[] {
  try {
    const raw = fs.readFileSync(CSV_PATH, 'utf-8');
    return raw.split('\n');
  } catch (e) {
    return [];
  }
}

function parseCsvRow(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
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
  let rawCsv = await fetchGitHubCsv();
  if (!rawCsv) {
    try {
      rawCsv = fs.readFileSync(CSV_PATH, 'utf-8');
    } catch (e) {
      rawCsv = '';
    }
  }
  const lines = rawCsv.split('\n');
  const header = lines[0];
  const paintings = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => paintingFromRow(parseCsvRow(l)));
  return NextResponse.json({ header, paintings });
}

// POST — append a new painting row
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = req.headers.get('x-github-token') || body.token || '';
    const lines = readCsvLines();
    const newRow = rowToLine([
      body.id, body.title, body.series, body.dimensions,
      body.medium, body.price, body.status, body.year,
      body.images, body.description, body.additionalInfo || '',
    ]);
    lines.push(newRow);
    const newCsvContent = lines.join('\n');

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
