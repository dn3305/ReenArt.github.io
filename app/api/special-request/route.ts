import { NextResponse } from 'next/server';
import { findSoldRecordByPaymentId } from '../../../lib/soldCsv';

const ARTIST_EMAIL = 'naureennaz00@gmail.com';
const FROM_EMAIL = 'ReenArt Studio <onboarding@resend.dev>';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    if (!apiKey || !githubToken) {
      return NextResponse.json({ error: 'Not configured.' }, { status: 500 });
    }

    const body = await req.json();
    const paymentId = String(body.paymentId || '').trim();
    const message = String(body.message || '').trim().slice(0, 2000);

    if (!paymentId || !message) {
      return NextResponse.json({ error: 'Missing payment ID or message.' }, { status: 400 });
    }

    const record = await findSoldRecordByPaymentId(paymentId, githubToken);
    if (!record) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ARTIST_EMAIL],
        subject: `[Special Request] ${record.invoiceNumber} — ${record.paintingTitle}`,
        html: `
          <p><strong>Invoice:</strong> ${escapeHtml(record.invoiceNumber)}</p>
          <p><strong>Artwork:</strong> ${escapeHtml(record.paintingTitle)}</p>
          <p><strong>Payment ID:</strong> ${escapeHtml(paymentId)}</p>
          <p><strong>Request:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
        `,
      }),
    });

    if (!res.ok) {
      console.error('special-request email error:', await res.text());
      return NextResponse.json({ error: 'Failed to send request.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('special-request error:', e);
    return NextResponse.json({ error: 'Failed to send request.' }, { status: 500 });
  }
}
