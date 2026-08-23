import { readCsvRowsLive, rowsToCsv, pushCsvToGitHub, CSV_COLUMNS } from './paintingsCsv';
import { appendSoldRecord } from './soldCsv';
import { generateInvoicePdf } from './invoicePdf';
import { sendReceiptEmail } from './receiptEmail';

export interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  method?: string;
  card?: { last4?: string; network?: string };
  vpa?: string;
  bank?: string;
  wallet?: string;
  created_at: number;
  notes?: Record<string, string>;
}

export type ProcessResult =
  | { ok: true; invoiceNumber: string; alreadyProcessed?: boolean }
  | { ok: false; error: string; retryable: boolean };

// Marks the painting sold, logs the sale to sold.csv, generates the invoice
// PDF, and emails the receipt. Called from both the Razorpay webhook and the
// browser-triggered verify-payment step — both independently confirm the
// payment is genuine (webhook via its own signature, verify-payment via the
// Razorpay-signed checkout response), so either can safely be the one that
// actually completes the sale. Idempotent: if the painting is already
// marked sold, this is a no-op.
export async function processCapturedPayment(payment: RazorpayPaymentEntity): Promise<ProcessResult> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('GITHUB_TOKEN not configured — cannot mark painting sold.');
    return { ok: false, error: 'Server not fully configured.', retryable: false };
  }

  const notes = payment.notes || {};
  const paintingId = notes.paintingId;
  const buyerName = notes.payerName || 'Collector';
  const buyerEmail = notes.payerEmail;
  const shipAddress = notes.shipAddress || '';
  const shipCity = notes.shipCity || '';
  const shipState = notes.shipState || '';
  const shipPincode = notes.shipPincode || '';
  const shipCountry = notes.shipCountry || '';
  const specialRequest = notes.specialRequest || '';

  if (!paintingId || !buyerEmail) {
    console.error('Payment missing paintingId/payerEmail in notes:', payment.id);
    return { ok: false, error: 'Missing order metadata.', retryable: false };
  }

  const rows = await readCsvRowsLive(githubToken);
  const statusIdx = CSV_COLUMNS.indexOf('status');
  const idIdx = CSV_COLUMNS.indexOf('id');
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[idIdx] === paintingId);

  if (rowIdx === -1) {
    console.error('Painting not found for id', paintingId);
    return { ok: false, error: 'Painting not found.', retryable: false };
  }

  if (rows[rowIdx][statusIdx] === 'sold') {
    return { ok: true, invoiceNumber: '', alreadyProcessed: true };
  }

  const paintingTitle = notes.paintingTitle || paintingId;

  rows[rowIdx][statusIdx] = 'sold';
  const newCsvContent = rowsToCsv(rows);
  const pushed = await pushCsvToGitHub(
    newCsvContent,
    githubToken,
    `💰 Mark "${paintingTitle}" as sold (payment ${payment.id})`
  );

  if (!pushed) {
    return { ok: false, error: 'Failed to update painting status.', retryable: true };
  }

  const paidAt = new Date(payment.created_at * 1000);

  const { invoiceNumber } = await appendSoldRecord(
    {
      paintingId,
      paintingTitle,
      orderId: payment.order_id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      buyerName,
      buyerEmail,
      method: payment.method || '',
      paidAt: paidAt.toISOString(),
      shipAddress,
      shipCity,
      shipState,
      shipPincode,
      shipCountry,
    },
    githubToken
  );

  const methodDetails = payment.method === 'upi'
    ? { vpa: payment.vpa }
    : payment.method === 'card'
      ? { last4: payment.card?.last4, network: payment.card?.network }
      : payment.method === 'netbanking'
        ? { bank: payment.bank }
        : payment.method === 'wallet'
          ? { wallet: payment.wallet }
          : undefined;

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber,
    paintingTitle,
    amount: payment.amount,
    currency: payment.currency,
    paidAt,
    buyerName,
    buyerEmail,
    method: payment.method || '',
    orderId: payment.order_id,
    paymentId: payment.id,
    shipAddress,
    shipCity,
    shipState,
    shipPincode,
    shipCountry,
  });

  await sendReceiptEmail({
    invoiceNumber,
    paintingTitle,
    orderId: payment.order_id,
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    paidAt,
    buyerName,
    buyerEmail,
    method: payment.method,
    methodDetails,
    shipAddress,
    shipCity,
    shipState,
    shipPincode,
    shipCountry,
    specialRequest,
    pdfBuffer,
  });

  return { ok: true, invoiceNumber };
}
