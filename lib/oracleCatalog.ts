import { parseCsvRows, rowsToCsv } from './csv';
import { fetchOracleWithRetry } from './oracleRequest';

export type CatalogName = 'paintings' | 'sold';

function catalogUrl(name: CatalogName): string {
  const base = process.env.ORACLE_UPLOAD_URL?.trim();
  if (!base) throw new Error('ORACLE_UPLOAD_URL is not configured.');
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/(?:upload|delete)\/?$/, '').replace(/\/$/, '')}/catalog/${name}.csv`;
  return url.toString();
}

function authHeaders(): Record<string, string> {
  const token = process.env.ORACLE_UPLOAD_TOKEN?.trim();
  if (!token) throw new Error('ORACLE_UPLOAD_TOKEN is not configured.');
  return { Authorization: `Bearer ${token}` };
}

export async function readOracleCatalog(name: CatalogName): Promise<string[][]> {
  const response = await fetchOracleWithRetry(catalogUrl(name), () => ({ headers: authHeaders(), cache: 'no-store', signal: AbortSignal.timeout(20_000) }));
  if (!response.ok) throw new Error(`Oracle catalog read failed (${response.status}).`);
  return parseCsvRows(await response.text());
}

export async function writeOracleCatalog(name: CatalogName, rows: string[][]): Promise<boolean> {
  const response = await fetchOracleWithRetry(catalogUrl(name), () => ({
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'text/csv; charset=utf-8' },
    body: rowsToCsv(rows),
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  }));
  return response.ok;
}

export interface LivePainting {
  id: string; title: string; series: string; size: string; medium: string;
  price: number; frameCharge: number; formattedPrice: string; description: string;
  details: string; images: string[]; status: 'available' | 'sold'; year: string;
}

export async function getLivePaintings(): Promise<LivePainting[]> {
  const rows = await readOracleCatalog('paintings');
  const header = (rows[0] || []).map((cell) => cell.toLowerCase());
  const col = (row: string[], name: string) => row[header.indexOf(name)] || '';
  return rows.slice(1).filter((row) => col(row, 'id') && col(row, 'title')).map((row) => {
    const price = Number((col(row, 'price').match(/[0-9.]+/) || ['0'])[0]) || 0;
    const frameCharge = Number((col(row, 'framecharge').match(/[0-9.]+/) || ['0'])[0]) || 0;
    return {
      id: col(row, 'id'), title: col(row, 'title'), series: col(row, 'series'),
      size: col(row, 'size') || col(row, 'dimensions'), medium: col(row, 'medium'),
      price, frameCharge, formattedPrice: price ? `$${price.toLocaleString()}` : 'Contact for Price',
      description: col(row, 'description'), details: col(row, 'details') || col(row, 'additionalinfo'),
      images: col(row, 'images').split(',').map((value) => value.trim()).filter(Boolean).map((value) => value.startsWith('/') ? value : `/images/${value}`),
      status: col(row, 'status').toLowerCase() === 'sold' ? 'sold' as const : 'available' as const,
      year: col(row, 'year'),
    };
  });
}
