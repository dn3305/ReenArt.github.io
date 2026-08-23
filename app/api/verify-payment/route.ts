import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { processCapturedPayment, RazorpayPaymentEntity } from '../../../lib/processCapturedPayment';

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Payments are not configured on the server yet.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const razorpay_order_id = body.razorpay_order_id;
    const razorpay_payment_id = body.razorpay_payment_id;
    const razorpay_signature = body.razorpay_signature;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required payment fields.' },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid =
      expectedSignature.length === String(razorpay_signature).length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(String(razorpay_signature))
      );

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Signature verification failed.' }, { status: 400 });
    }

    // Signature confirms this really is a Razorpay-signed response for a
    // genuine payment — that's just as trustworthy as the webhook's own
    // signature. Rather than depend solely on the webhook (whose delivery
    // depends on dashboard config we don't control end-to-end), fetch the
    // full payment record and complete the sale right here too.
    // processCapturedPayment is idempotent, so if the webhook also fires
    // for the same payment, it's a harmless no-op.
    try {
      const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        },
      });
      if (paymentRes.ok) {
        const payment = (await paymentRes.json()) as RazorpayPaymentEntity;
        if (payment.id) {
          await processCapturedPayment(payment);
        }
      } else {
        console.error('verify-payment: failed to fetch payment details', await paymentRes.text());
      }
    } catch (processErr) {
      // Don't fail the response over this — the payment itself is genuine
      // and already verified; the webhook remains a second chance to
      // complete fulfillment if this fails.
      console.error('verify-payment: processCapturedPayment failed', processErr);
    }

    return NextResponse.json({ success: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id });
  } catch (e) {
    console.error('verify-payment error:', e);
    return NextResponse.json({ error: 'Failed to verify payment.' }, { status: 500 });
  }
}
