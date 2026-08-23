import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { paintings } from '../../data/paintings';
import { getUsdToInrRate } from '../../../lib/exchangeRate';

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
    const paintingId = String(body.paintingId || '');
    const payCurrency = body.currency === 'INR' ? 'INR' : 'USD';
    const payerName = String(body.payerName || '').trim();
    const payerEmail = String(body.payerEmail || '').trim();

    if (!payerName || !payerEmail) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    // Prices are never trusted from the client — look up the real, current
    // price server-side by painting id so a tampered request can't pay less
    // than the actual price.
    const painting = paintings.find((p) => p.id === paintingId);
    if (!painting) {
      return NextResponse.json({ error: 'Painting not found.' }, { status: 400 });
    }
    if (painting.status !== 'available') {
      return NextResponse.json({ error: 'This painting is no longer available.' }, { status: 400 });
    }
    if (!(painting.price > 0)) {
      return NextResponse.json({ error: 'This painting has no price set.' }, { status: 400 });
    }

    let amount: number; // smallest currency unit (cents or paise)
    let rateUsed: number | null = null;
    if (payCurrency === 'USD') {
      amount = Math.round(painting.price * 100);
    } else {
      rateUsed = await getUsdToInrRate();
      amount = Math.round(painting.price * rateUsed * 100);
    }

    if (amount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 paise / 1 unit of currency.' },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    let order;
    try {
      order = await razorpay.orders.create({
        amount,
        currency: payCurrency,
        receipt: `${painting.id}_${Date.now()}`,
        notes: {
          paintingId: painting.id,
          paintingTitle: painting.title,
          priceUsd: String(painting.price),
          payerName,
          payerEmail,
          ...(rateUsed ? { usdToInrRate: String(rateUsed) } : {}),
        },
      });
    } catch (razorpayErr) {
      console.error('Razorpay order creation error:', razorpayErr);
      const status = (razorpayErr as { statusCode?: number })?.statusCode === 401 ? 401 : 500;
      return NextResponse.json(
        { error: status === 401 ? 'Payment authentication failed.' : 'Failed to create order.' },
        { status }
      );
    }

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      rateUsed,
    });
  } catch (e) {
    console.error('create-order error:', e);
    return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 });
  }
}
