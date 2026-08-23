import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { processCapturedPayment, RazorpayPaymentEntity } from '../../../../lib/processCapturedPayment';

export async function POST(req: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

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

  const result = await processCapturedPayment(payment);
  if (!result.ok) {
    // Return 500 (so Razorpay retries) only for genuinely retryable failures —
    // idempotency in processCapturedPayment makes retries safe.
    return NextResponse.json({ error: result.error }, { status: result.retryable ? 500 : 400 });
  }

  return NextResponse.json({ received: true, invoiceNumber: result.invoiceNumber, alreadyProcessed: result.alreadyProcessed });
}
