import nodemailer from 'nodemailer';

function json(status: number, data: Record<string, unknown>) {
  return Response.json(data, { status });
}

function readBody(payload: unknown) {
  const body = payload as Record<string, unknown> | null;
  return {
    name: String(body?.name || '').trim(),
    email: String(body?.email || '').trim(),
    message: String(body?.message || '').trim(),
  };
}

async function createTransport() {
  if (process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured in Vercel');
}

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return json(404, { error: 'Not found' });
  }

  try {
    const payload = readBody(await request.json());
    if (!payload.name || !payload.email || !payload.message) {
      return json(400, { error: 'Missing name, email, or message' });
    }

    const transporter = await createTransport();
    const toAddress = process.env.MAIL_TO || 'goodnessefe01@icloud.com';
    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || toAddress;

    await transporter.sendMail({
      from: `Portfolio Contact <${fromAddress}>`,
      to: toAddress,
      replyTo: payload.email,
      subject: `Portfolio message from ${payload.name}`,
      text: `Name: ${payload.name}\nEmail: ${payload.email}\n\n${payload.message}`,
    });

    return json(200, { ok: true });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : 'Failed to send email',
    });
  }
}