import nodemailer from 'nodemailer';
import type { IncomingMessage, ServerResponse } from 'node:http';

function sendJson(res: ServerResponse, status: number, data: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function readBody(payload: unknown) {
  const body = payload as Record<string, unknown> | null;
  return {
    name: String(body?.name || '').trim(),
    email: String(body?.email || '').trim(),
    message: String(body?.message || '').trim(),
  };
}

function readRequestBody(req: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

async function createTransport() {
  if (process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  try {
    const payload = readBody(await readRequestBody(req));
    if (!payload.name || !payload.email || !payload.message) {
      sendJson(res, 400, { error: 'Missing name, email, or message' });
      return;
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

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to send email',
    });
  }
}