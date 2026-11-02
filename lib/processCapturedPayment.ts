import { completeOracleSale, findSoldRecordByPaymentId } from './soldCsv';
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
  const oracleToken = process.env.ORACLE_UPLOAD_TOKEN;
  if (!oracleToken || !process.env.ORACLE_UPLOAD_URL) {
    console.error('Oracle catalog storage is not configured — cannot mark painting sold.');
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
  const frameOption = notes.frameOption || 'without-frame';
  const baseAmount = Number(notes.baseAmount) || payment.amount;
  const frameAmount = Number(notes.frameAmount) || 0;

  if (!paintingId || !buyerEmail) {
    console.error('Payment missing paintingId/payerEmail in notes:', payment.id);
    return { ok: false, error: 'Missing order metadata.', retryable: false };
  }

  const existingSale = await findSoldRecordByPaymentId(payment.id);
  if (existingSale) return { ok: true, invoiceNumber: existingSale.invoiceNumber, alreadyProcessed: true };

  const paintingTitle = notes.paintingTitle || paintingId;

  const paidAt = new Date(payment.created_at * 1000);

  let invoiceNumber: string;
  try {
    const sale = await completeOracleSale({
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
      frameOption,
      baseAmount,
      frameAmount,
    });
    if (sale.alreadyProcessed) return { ok: true, invoiceNumber: sale.invoiceNumber, alreadyProcessed: true };
    invoiceNumber = sale.invoiceNumber;
  } catch (error) {
    console.error('Oracle sale commit failed:', error);
    return { ok: false, error: 'Failed to update the painting sale record.', retryable: true };
  }

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
    frameOption,
    baseAmount,
    frameAmount,
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
