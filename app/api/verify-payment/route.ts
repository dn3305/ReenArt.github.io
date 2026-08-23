import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
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

    return NextResponse.json({ success: true, orderId: razorpay_order_id, paymentId: razorpay_payment_id });
  } catch (e) {
    console.error('verify-payment error:', e);
    return NextResponse.json({ error: 'Failed to verify payment.' }, { status: 500 });
  }
}
