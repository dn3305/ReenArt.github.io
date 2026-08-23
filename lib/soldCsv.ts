import { fetchGitHubFile, pushFileToGitHub } from './githubFile';
import { parseCsvRows, rowsToCsv } from './paintingsCsv';

export const SOLD_CSV_PATH = 'sold.csv';

export const SOLD_CSV_COLUMNS = [
  'invoiceNumber', 'paintingId', 'paintingTitle', 'orderId', 'paymentId',
  'amount', 'currency', 'buyerName', 'buyerEmail', 'method', 'paidAt',
  'shipAddress', 'shipCity', 'shipState', 'shipPincode', 'shipCountry',
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
}

function recordToRow(r: SoldRecord): string[] {
  return [
    r.invoiceNumber, r.paintingId, r.paintingTitle, r.orderId, r.paymentId,
    String(r.amount), r.currency, r.buyerName, r.buyerEmail, r.method, r.paidAt,
    r.shipAddress, r.shipCity, r.shipState, r.shipPincode, r.shipCountry,
  ];
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
  };
}

async function readSoldRowsLive(token?: string): Promise<{ rows: string[][]; sha: string | null }> {
  const live = await fetchGitHubFile(SOLD_CSV_PATH, token);
  if (live !== null) return { rows: parseCsvRows(live.content), sha: live.sha };
  return { rows: [[...SOLD_CSV_COLUMNS]], sha: null };
}

function nextInvoiceNumber(rows: string[][]): string {
  const dataRowCount = Math.max(0, rows.length - 1);
  return `INV-${String(dataRowCount + 1).padStart(4, '0')}`;
}

// Appends a new sale to sold.csv and returns the assigned invoice number.
// Caller is responsible for idempotency (checking the painting isn't already
// sold) before calling this, so a retried webhook doesn't create a duplicate
// invoice row.
export async function appendSoldRecord(
  partial: Omit<SoldRecord, 'invoiceNumber'>,
  token: string
): Promise<{ invoiceNumber: string; pushed: boolean }> {
  const { rows, sha } = await readSoldRowsLive(token);
  const invoiceNumber = nextInvoiceNumber(rows);
  const record: SoldRecord = { ...partial, invoiceNumber };
  rows.push(recordToRow(record));
  const pushed = await pushFileToGitHub(
    SOLD_CSV_PATH,
    rowsToCsv(rows),
    token,
    `🧾 ${invoiceNumber} — ${record.paintingTitle} (${record.paymentId})`,
    sha
  );
  return { invoiceNumber, pushed };
}

export async function findSoldRecordByPaymentId(paymentId: string, token?: string): Promise<SoldRecord | null> {
  const { rows } = await readSoldRowsLive(token);
  const idIdx = SOLD_CSV_COLUMNS.indexOf('paymentId');
  const found = rows.slice(1).find((r) => r[idIdx] === paymentId);
  return found ? rowToRecord(found) : null;
}
