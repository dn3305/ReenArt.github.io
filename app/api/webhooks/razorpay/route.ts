import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { readCsvRowsLive, rowsToCsv, pushCsvToGitHub, CSV_COLUMNS } from '../../../../lib/paintingsCsv';
import { appendSoldRecord } from '../../../../lib/soldCsv';
import { generateInvoicePdf } from '../../../../lib/invoicePdf';
import { sendReceiptEmail } from '../../../../lib/receiptEmail';

interface RazorpayPaymentEntity {
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

export async function POST(req: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET not configured.');
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  // Signature is computed over the raw request body — must read as text
  // before any JSON parsing, or the signature won't match.
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const isValid =
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

  if (!isValid) {
    console.error('Razorpay webhook signature mismatch.');
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: { event: string; payload?: { payment?: { entity?: RazorpayPaymentEntity } } };
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  // Only payment.captured actually means money has settled — ignore everything else.
  if (event.event !== 'payment.captured') {
    return NextResponse.json({ received: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment) {
    return NextResponse.json({ error: 'Missing payment entity.' }, { status: 400 });
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

  if (!paintingId || !buyerEmail) {
    console.error('Webhook payment missing paintingId/payerEmail in notes:', payment.id);
    return NextResponse.json({ error: 'Missing order metadata.' }, { status: 400 });
  }

  if (!githubToken) {
    console.error('GITHUB_TOKEN not configured — cannot mark painting sold.');
    return NextResponse.json({ error: 'Server not fully configured.' }, { status: 500 });
  }

  // Idempotency: Razorpay can and does retry webhook delivery. If this
  // painting is already marked sold, this event was already processed —
  // acknowledge without re-emailing or re-committing.
  const rows = await readCsvRowsLive(githubToken);
  const statusIdx = CSV_COLUMNS.indexOf('status');
  const idIdx = CSV_COLUMNS.indexOf('id');
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[idIdx] === paintingId);

  if (rowIdx === -1) {
    console.error('Webhook: painting not found for id', paintingId);
    return NextResponse.json({ error: 'Painting not found.' }, { status: 400 });
  }

  if (rows[rowIdx][statusIdx] === 'sold') {
    return NextResponse.json({ received: true, alreadyProcessed: true });
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
    // Return 500 so Razorpay retries — safe to retry since we re-check
    // status above each time.
    return NextResponse.json({ error: 'Failed to update painting status.' }, { status: 500 });
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
    pdfBuffer,
  });

  return NextResponse.json({ received: true, invoiceNumber });
}
