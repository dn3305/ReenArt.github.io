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

async function fetchGitHubCsv(): Promise<string | null> {
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/paintings.csv?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (res.ok) return await res.text();
  } catch (e) {}
  return null;
}

async function readCsvLines(): Promise<string[]> {
  const liveCsv = await fetchGitHubCsv();
  if (liveCsv !== null) return liveCsv.split('\n');
  try {
    return fs.readFileSync(CSV_PATH, 'utf-8').split('\n');
  } catch (e) {
    return [
      'id,title,series,dimensions,medium,price,status,year,images,description,additionalInfo',
    ];
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

// PUT — update a painting row by id
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const token = req.headers.get('x-github-token') || body.token || '';
    const lines = await readCsvLines();
    let updated = false;

    const newLines = lines.map((line, idx) => {
      if (idx === 0 || !line.trim()) return line;
      const cols = parseCsvRow(line);
      if (cols[0] === id) {
        updated = true;
        return rowToLine([
          body.id ?? cols[0],
          body.title ?? cols[1],
          body.series ?? cols[2],
          body.dimensions ?? cols[3],
          body.medium ?? cols[4],
          body.price ?? cols[5],
          body.status ?? cols[6],
          body.year ?? cols[7],
          body.images ?? cols[8],
          body.description ?? cols[9],
          body.additionalInfo ?? cols[10] ?? '',
        ]);
      }
      return line;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Painting not found' }, { status: 404 });
    }

    const newCsvContent = newLines.join('\n');
    try {
      fs.writeFileSync(CSV_PATH, newCsvContent, 'utf-8');
    } catch (diskErr) {
      console.log('Serverless environment (read-only filesystem)');
    }

    if (token) {
      await pushCsvToGitHub(newCsvContent, token);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — remove a painting row by id
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('x-github-token') || '';
    const lines = await readCsvLines();
    const newLines = lines.filter((line, idx) => {
      if (idx === 0 || !line.trim()) return true;
      const cols = parseCsvRow(line);
      return cols[0] !== id;
    });

    if (newLines.length === lines.length) {
      return NextResponse.json({ error: 'Painting not found' }, { status: 404 });
    }

    const newCsvContent = newLines.join('\n');
    try {
      fs.writeFileSync(CSV_PATH, newCsvContent, 'utf-8');
    } catch (diskErr) {
      console.log('Serverless environment (read-only filesystem)');
    }

    if (token) {
      await pushCsvToGitHub(newCsvContent, token);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
