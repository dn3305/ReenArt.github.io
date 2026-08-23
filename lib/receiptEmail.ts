const ARTIST_EMAIL = 'naureennaz00@gmail.com';
const FROM_EMAIL = 'ReenArt Studio <onboarding@resend.dev>';
const SITE_URL = 'https://reenart.com';

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
  invoiceNumber: string;
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
  shipAddress: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipCountry: string;
  pdfBuffer: Buffer;
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
  const downloadUrl = `${SITE_URL}/api/invoice/${encodeURIComponent(details.paymentId)}`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto;">
      <h2 style="font-weight: 300; letter-spacing: 0.05em;">Payment Receipt</h2>
      <p>Thank you for your purchase, ${escapeHtml(details.buyerName)}.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px;">
        <tr><td style="padding: 8px 0; color: #888;">Invoice Number</td><td style="padding: 8px 0; text-align: right;"><strong>${escapeHtml(details.invoiceNumber)}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Artwork</td><td style="padding: 8px 0; text-align: right;"><strong>${escapeHtml(details.paintingTitle)}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Amount Paid</td><td style="padding: 8px 0; text-align: right;"><strong>${amountFormatted} ${details.currency}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Date</td><td style="padding: 8px 0; text-align: right;">${dateFormatted}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Payment Method</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(methodFormatted)}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Order ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${escapeHtml(details.orderId)}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Payment ID</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${escapeHtml(details.paymentId)}</td></tr>
      </table>

      <div style="margin-top: 20px; padding: 12px 16px; background: #f7f5f2; font-size: 13px; color: #444;">
        <strong>Shipping To</strong><br/>
        ${escapeHtml(details.shipAddress)}<br/>
        ${escapeHtml(details.shipCity)}, ${escapeHtml(details.shipState)} ${escapeHtml(details.shipPincode)}<br/>
        ${escapeHtml(details.shipCountry)}
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${downloadUrl}" style="display: inline-block; padding: 12px 28px; background: #c9a84c; color: #fff; text-decoration: none; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">
          Download Invoice (PDF)
        </a>
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #666;">
        Nazia will be in touch shortly with shipping updates. A PDF copy of this invoice is attached, and always available at the link above.
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
        subject: `Invoice ${details.invoiceNumber} — ${details.paintingTitle} — ${amountFormatted} ${details.currency}`,
        html,
        attachments: [
          {
            filename: `${details.invoiceNumber}.pdf`,
            content: details.pdfBuffer.toString('base64'),
          },
        ],
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
