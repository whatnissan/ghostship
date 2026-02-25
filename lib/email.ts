const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? 'alerts@probationcall.com'
const FROM_NAME = process.env.BREVO_FROM_NAME ?? 'Ghost Ship'

async function sendEmail(to: { email: string; name: string }, subject: string, htmlContent: string) {
  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [to],
      subject,
      htmlContent,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo error: ${err}`)
  }
}

export async function sendQRCodeEmail({
  toEmail, toName, qrCodeUrl, carrier, service, trackingNumber, routingCode,
}: {
  toEmail: string; toName: string; qrCodeUrl: string
  carrier: string; service: string; trackingNumber?: string; routingCode: string
}) {
  await sendEmail(
    { email: toEmail, name: toName },
    '👻 Your Ghost Ship QR Code is Ready',
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:40px;border-radius:16px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:28px;margin:0;">👻 Ghost Ship</h1>
        <p style="color:#94a3b8;margin-top:8px;">Your QR code is ready for drop-off</p>
      </div>
      <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;">
        <h2 style="margin:0 0 16px;font-size:20px;">✅ Payment Confirmed</h2>
        <p style="color:#94a3b8;margin:0 0 8px;">Routing code: <strong style="color:#a78bfa;">${routingCode}</strong></p>
        <p style="color:#94a3b8;margin:0 0 8px;">Carrier: ${carrier} · ${service}</p>
        ${trackingNumber ? `<p style="color:#94a3b8;margin:0;">Tracking: <strong>${trackingNumber}</strong></p>` : ''}
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${qrCodeUrl}" alt="Shipping QR Code" style="width:220px;height:220px;border-radius:12px;border:3px solid #7c3aed;background:white;padding:8px;" />
      </div>
      <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;">
        <h3 style="margin:0 0 12px;font-size:16px;">📦 How to drop off</h3>
        <ol style="color:#94a3b8;margin:0;padding-left:20px;line-height:2;">
          <li>Bring your sealed package to any USPS location</li>
          <li>Show this QR code to the clerk</li>
          <li>They scan it and print the label automatically</li>
          <li>You never see the destination address</li>
        </ol>
      </div>
      <p style="color:#475569;font-size:12px;text-align:center;margin:0;">Screenshot or save this email — the QR code expires after drop-off.<br/>Powered by Ghost Ship</p>
    </div>`
  )
}

export async function sendPackageNotificationEmail({
  toEmail, toName, senderName, carrier, service, trackingNumber,
}: {
  toEmail: string; toName: string; senderName: string
  carrier: string; service: string; trackingNumber?: string
}) {
  await sendEmail(
    { email: toEmail, name: toName },
    '📦 Someone sent you a package via Ghost Ship',
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:40px;border-radius:16px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:28px;margin:0;">👻 Ghost Ship</h1>
        <p style="color:#94a3b8;margin-top:8px;">A package is on its way</p>
      </div>
      <div style="background:#1e293b;border-radius:12px;padding:24px;">
        <h2 style="margin:0 0 16px;font-size:20px;">📬 Incoming Package</h2>
        <p style="color:#94a3b8;margin:0 0 8px;">From: <strong style="color:#f1f5f9;">${senderName}</strong></p>
        <p style="color:#94a3b8;margin:0 0 8px;">Carrier: ${carrier} · ${service}</p>
        ${trackingNumber ? `<p style="color:#94a3b8;margin:0;">Tracking: <strong style="color:#a78bfa;">${trackingNumber}</strong></p>` : ''}
      </div>
      <p style="color:#475569;font-size:12px;text-align:center;margin-top:32px;">Powered by Ghost Ship</p>
    </div>`
  )
}
