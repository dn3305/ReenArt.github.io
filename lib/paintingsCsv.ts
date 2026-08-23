import { fetchGitHubFile, pushFileToGitHub } from './githubFile';

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

export async function readCsvRowsLive(token?: string): Promise<string[][]> {
  const live = await fetchGitHubFile(PAINTINGS_CSV_PATH, token);
  if (live !== null) return parseCsvRows(live.content);
  return [
    ['id', 'title', 'series', 'dimensions', 'medium', 'price', 'status', 'year', 'images', 'description', 'additionalInfo'],
  ];
}

export async function pushCsvToGitHub(csvContent: string, token: string, message: string, sha?: string | null): Promise<boolean> {
  return pushFileToGitHub(PAINTINGS_CSV_PATH, csvContent, token, message, sha);
}

// Column order used throughout paintings.csv.
export const CSV_COLUMNS = [
  'id', 'title', 'series', 'dimensions', 'medium', 'price', 'status', 'year', 'images', 'description', 'additionalInfo',
] as const;
