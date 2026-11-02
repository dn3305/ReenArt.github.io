import { readOracleCatalog } from './oracleCatalog';
import { fetchOracleWithRetry } from './oracleRequest';

export const SOLD_CSV_PATH = 'sold.csv';

export const SOLD_CSV_COLUMNS = [
  'invoiceNumber', 'paintingId', 'paintingTitle', 'orderId', 'paymentId',
  'amount', 'currency', 'buyerName', 'buyerEmail', 'method', 'paidAt',
  'shipAddress', 'shipCity', 'shipState', 'shipPincode', 'shipCountry', 'frameOption', 'baseAmount', 'frameAmount',
] as const;

export interface SoldRecord {
  invoiceNumber: string;
  paintingId: string;
  paintingTitle: string;
  orderId: string;
  paymentId: string;
  amount: number; // smallest currency unit
  currency: string;
  buyerName: string;
  buyerEmail: string;
  method: string;
  paidAt: string; // ISO string
  shipAddress: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipCountry: string;
  frameOption: string;
  baseAmount: number;
  frameAmount: number;
}

export function rowToRecord(row: string[]): SoldRecord {
  return {
    invoiceNumber: row[0] || '',
    paintingId: row[1] || '',
    paintingTitle: row[2] || '',
    orderId: row[3] || '',
    paymentId: row[4] || '',
    amount: Number(row[5]) || 0,
    currency: row[6] || '',
    buyerName: row[7] || '',
    buyerEmail: row[8] || '',
    method: row[9] || '',
    paidAt: row[10] || '',
    shipAddress: row[11] || '',
    shipCity: row[12] || '',
    shipState: row[13] || '',
    shipPincode: row[14] || '',
    shipCountry: row[15] || '',
    frameOption: row[16] || 'without-frame',
    baseAmount: Number(row[17]) || Number(row[5]) || 0,
    frameAmount: Number(row[18]) || 0,
  };
}

async function readSoldRowsLive(_token?: string): Promise<string[][]> {
  try {
    const rows = await readOracleCatalog('sold');
    const header = rows[0] || [];
    const frameOptionIdx = header.indexOf('frameOption');
    const baseAmountIdx = header.indexOf('baseAmount');
    const frameAmountIdx = header.indexOf('frameAmount');
    if (frameOptionIdx === -1 || baseAmountIdx === -1 || frameAmountIdx === -1) {
      rows[0] = [...header, ...SOLD_CSV_COLUMNS.slice(header.length)];
      for (const row of rows.slice(1)) {
        row[16] = row[16] || 'without-frame';
        row[17] = row[17] || row[5] || '0';
        row[18] = row[18] || '0';
      }
    }
    return rows;
  } catch (error) {
    if (error instanceof Error && error.message.includes('(404)')) return [[...SOLD_CSV_COLUMNS]];
    throw error;
  }
}

export async function completeOracleSale(record: Omit<SoldRecord, 'invoiceNumber'>): Promise<{ invoiceNumber: string; pushed: boolean; alreadyProcessed: boolean }> {
  const base = process.env.ORACLE_UPLOAD_URL?.trim();
  const token = process.env.ORACLE_UPLOAD_TOKEN?.trim();
  if (!base || !token) throw new Error('Oracle catalog storage is not configured.');
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/(?:upload|delete)\/?$/, '').replace(/\/$/, '')}/catalog/sale`;
  const response = await fetchOracleWithRetry(url, () => ({
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  }));
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || 'Could not save the sale to Oracle and Drive.');
  return { invoiceNumber: result.invoiceNumber, pushed: true, alreadyProcessed: result.alreadyProcessed === true };
}

export async function findSoldRecordByPaymentId(paymentId: string, token?: string): Promise<SoldRecord | null> {
  const rows = await readSoldRowsLive(token);
  const idIdx = SOLD_CSV_COLUMNS.indexOf('paymentId');
  const found = rows.slice(1).find((r) => r[idIdx] === paymentId);
  return found ? rowToRecord(found) : null;
}
