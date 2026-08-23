const ARTIST_EMAIL = 'naureennaz00@gmail.com';
const FROM_EMAIL = 'ReenArt Studio <onboarding@resend.dev>';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAmount(amountSmallestUnit: number, currency: string): string {
  const major = amountSmallestUnit / 100;
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
  const formatted = currency === 'INR'
    ? major.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : major.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

function describeMethod(method?: string, details?: Record<string, unknown>): string {
  if (!method) return '—';
  switch (method) {
    case 'upi':
      return `UPI${details?.vpa ? ` (${details.vpa})` : ''}`;
    case 'card':
      return `Card${details?.last4 ? ` ending ${details.last4}` : ''}${details?.network ? ` (${details.network})` : ''}`;
    case 'netbanking':
      return `Net Banking${details?.bank ? ` (${details.bank})` : ''}`;
    case 'wallet':
      return `Wallet${details?.wallet ? ` (${details.wallet})` : ''}`;
    default:
      return method;
  }
}

export interface ReceiptDetails {
  paintingTitle: string;
  orderId: string;
  paymentId: string;
  amount: number; // smallest currency unit
  currency: string;
  paidAt: Date;
  buyerName: string;
  buyerEmail: string;
  method?: string;
  methodDetails?: Record<string, unknown>;
}

export async function sendReceiptEmail(details: ReceiptDetails): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Cannot send receipt: RESEND_API_KEY not configured.');
    return false;
  }

  const amountFormatted = formatAmount(details.amount, details.currency);
  const dateFormatted = details.paidAt.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const methodFormatted = describeMethod(details.method, details.methodDetails);

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
      <h2 style="font-weight: 300; letter-spacing: 0.05em;">Payment Receipt</h2>
      <p>Thank you for your purchase, ${escapeHtml(details.buyerName)}.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
        <tr><td style="padding: 8px 0; color: #888;">Artwork</td><td style="padding: 8px 0; text-align: right;"><strong>${escapeHtml(details.paintingTitle)}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Amount Paid</td><td style="padding: 8px 0; text-align: right;"><strong>${amountFormatted} ${details.currency}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Date</td><td style="padding: 8px 0; text-align: right;">${dateFormatted}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Payment Method</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(methodFormatted)}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Order ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${escapeHtml(details.orderId)}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Payment ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${escapeHtml(details.paymentId)}</td></tr>
      </table>
      <p style="margin-top: 24px; font-size: 13px; color: #666;">
        Nazia will be in touch shortly with shipping details. Keep this receipt for your records.
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [details.buyerEmail],
        bcc: [ARTIST_EMAIL],
        subject: `Payment Receipt — ${details.paintingTitle} — ${amountFormatted} ${details.currency}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error('Resend receipt email error:', await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to send receipt email:', e);
    return false;
  }
}
