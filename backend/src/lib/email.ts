import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function send(to: string, subject: string, text: string): Promise<void> {
  const client = getTransporter();
  if (!client) {
    console.log(`[email:dev] To: ${to} | Subject: ${subject}\n${text}`);
    return;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  try {
    await client.sendMail({ from, to, subject, text });
  } catch (err) {
    console.error('[email] Gönderilemedi:', err);
  }
}

export async function sendActivationEmail(email: string, token: string): Promise<void> {
  const link = `http://localhost:5173/verify-email?token=${token}`;
  await send(email, 'YOL - Hesabını doğrula', `Hesabını doğrulamak için: ${link}`);
}

export async function sendReservationOfferEmail(
  email: string,
  details: {
    pickupAddress: string;
    dropoffAddress: string;
    scheduledFor: Date;
    priceTry: number;
    distanceKm: number;
  },
): Promise<void> {
  const when = details.scheduledFor.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const subject = `YOL - Yeni randevu talebi (${when})`;
  const text = [
    `Yeni bir randevulu yolculuk talebin var.`,
    ``,
    `Tarih/Saat: ${when}`,
    `Kalkış: ${details.pickupAddress}`,
    `Varış: ${details.dropoffAddress}`,
    `Mesafe: ${details.distanceKm} km`,
    `Ücret: ₺${details.priceTry}`,
    ``,
    `Kabul etmek veya reddetmek için YOL uygulamasını aç.`,
  ].join('\n');
  await send(email, subject, text);
}
