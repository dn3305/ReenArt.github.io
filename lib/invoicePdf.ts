import PDFDocument from 'pdfkit';

const BUSINESS_NAME = 'ReenArt Studio by Nazia Naureen';
const BUSINESS_ADDRESS = 'Ramprastha Greens, Vaishali, India — Near Vaishali Metro';
const BUSINESS_EMAIL = 'naureennaz00@gmail.com';

export interface InvoiceDetails {
  invoiceNumber: string;
  paintingTitle: string;
  amount: number; // smallest currency unit
  currency: string;
  paidAt: Date;
  buyerName: string;
  buyerEmail: string;
  method: string;
  orderId: string;
  paymentId: string;
  shipAddress: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  shipCountry: string;
}

function formatAmount(amountSmallestUnit: number, currency: string): string {
  const major = amountSmallestUnit / 100;
  const symbol = currency === 'INR' ? 'Rs. ' : currency === 'USD' ? '$' : `${currency} `;
  const formatted = currency === 'INR'
    ? major.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : major.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

export function generateInvoicePdf(details: InvoiceDetails): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Header
  doc.font('Helvetica-Bold').fontSize(20).text(BUSINESS_NAME);
  doc.font('Helvetica').fontSize(10).fillColor('#555')
    .text(BUSINESS_ADDRESS)
    .text(BUSINESS_EMAIL);
  doc.moveDown(1.5);

  // Invoice title + number/date
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(16).text('INVOICE');
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  const topY = doc.y;
  doc.text(`Invoice Number: ${details.invoiceNumber}`);
  doc.text(`Date: ${details.paidAt.toLocaleDateString('en-US', { dateStyle: 'long' })}`);
  doc.moveDown(1.5);

  // Bill To / Ship To (side by side)
  const infoTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Bill To', 56, infoTop);
  doc.font('Helvetica').fontSize(10).fillColor('#333')
    .text(details.buyerName, 56)
    .text(details.buyerEmail, 56);

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Ship To', 300, infoTop);
  doc.font('Helvetica').fontSize(10).fillColor('#333')
    .text(details.shipAddress, 300, undefined, { width: 240 })
    .text(`${details.shipCity}, ${details.shipState} ${details.shipPincode}`, 300, undefined, { width: 240 })
    .text(details.shipCountry, 300, undefined, { width: 240 });

  doc.moveDown(1.5);

  // Line item table
  const tableTop = doc.y;
  const col1 = 56;
  const col2 = 420;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
  doc.text('Description', col1, tableTop);
  doc.text('Amount', col2, tableTop, { width: 100, align: 'right' });
  doc.moveTo(56, tableTop + 16).lineTo(539, tableTop + 16).strokeColor('#ccc').stroke();

  const rowY = tableTop + 26;
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(details.paintingTitle, col1, rowY, { width: 340 });
  doc.text(formatAmount(details.amount, details.currency), col2, rowY, { width: 100, align: 'right' });

  const totalY = rowY + 30;
  doc.moveTo(56, totalY - 6).lineTo(539, totalY - 6).strokeColor('#ccc').stroke();
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
  doc.text('Total Paid', col1, totalY);
  doc.text(`${formatAmount(details.amount, details.currency)} ${details.currency}`, col2, totalY, { width: 100, align: 'right' });

  doc.moveDown(3);

  // Payment details — reset x to the left margin; the table above left the
  // cursor sitting at the right-aligned amount column.
  const paymentTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Payment Details', 56, paymentTop);
  doc.font('Helvetica').fontSize(9).fillColor('#555')
    .text(`Payment Method: ${details.method}`, 56)
    .text(`Order ID: ${details.orderId}`, 56)
    .text(`Payment ID: ${details.paymentId}`, 56);

  doc.moveDown(2);
  const footerTop = doc.y;
  doc.font('Helvetica').fontSize(9).fillColor('#999')
    .text('Thank you for supporting original art. This invoice confirms your purchase from ReenArt Studio.', 56, footerTop, { width: 483 });

  doc.end();
  return done;
}
