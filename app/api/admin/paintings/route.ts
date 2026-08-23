import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'paintings.csv');

// --- CSV helpers ---

function readCsvLines(): string[] {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  return raw.split('\n');
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
  const lines = readCsvLines();
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
    const lines = readCsvLines();
    const newRow = rowToLine([
      body.id, body.title, body.series, body.dimensions,
      body.medium, body.price, body.status, body.year,
      body.images, body.description, body.additionalInfo || '',
    ]);
    lines.push(newRow);
    fs.writeFileSync(CSV_PATH, lines.join('\n'), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
