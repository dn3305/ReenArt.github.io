import { NextResponse } from 'next/server';
import { findSoldRecordByPaymentId } from '../../../../lib/soldCsv';
import { generateInvoicePdf } from '../../../../lib/invoicePdf';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  if (!process.env.ORACLE_UPLOAD_TOKEN || !process.env.ORACLE_UPLOAD_URL) {
    return NextResponse.json({ error: 'Server not fully configured.' }, { status: 500 });
  }

  const record = await findSoldRecordByPaymentId(paymentId);
  if (!record) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber: record.invoiceNumber,
    paintingTitle: record.paintingTitle,
    amount: record.amount,
    currency: record.currency,
    paidAt: new Date(record.paidAt),
    buyerName: record.buyerName,
    buyerEmail: record.buyerEmail,
    method: record.method,
    orderId: record.orderId,
    paymentId: record.paymentId,
    shipAddress: record.shipAddress,
    shipCity: record.shipCity,
    shipState: record.shipState,
    shipPincode: record.shipPincode,
    shipCountry: record.shipCountry,
    frameOption: record.frameOption,
    baseAmount: record.baseAmount,
    frameAmount: record.frameAmount,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${record.invoiceNumber}.pdf"`,
    },
  });
}
