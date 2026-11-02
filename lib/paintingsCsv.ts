import { readOracleCatalog, writeOracleCatalog } from './oracleCatalog';
import { parseCsvRows } from './csv';

export { parseCsvRows, rowToLine, rowsToCsv } from './csv';

export const PAINTINGS_CSV_PATH = 'paintings.csv';

export async function readCsvRowsLive(_token?: string): Promise<string[][]> {
  return readOracleCatalog('paintings');
}

export async function savePaintingsCsv(csvContent: string): Promise<boolean> {
  return writeOracleCatalog('paintings', parseCsvRows(csvContent));
}

// Column order used throughout paintings.csv.
export const CSV_COLUMNS = [
  'id', 'title', 'series', 'dimensions', 'medium', 'price', 'status', 'year', 'images', 'description', 'additionalInfo', 'frameCharge',
] as const;
