import sgMail from '@sendgrid/mail';
import { Pool } from 'pg';
import type { IncomingMessage, ServerResponse } from 'node:http';

let pool: Pool | undefined;
let tableReady: Promise<void> | undefined;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 3,
  });
  return pool;
}

async function ensureTable() {
  tableReady ??= getPool().query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    )
  `).then(() => undefined);
  return tableReady;
}

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

    if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM) {
      throw new Error('SENDGRID_API_KEY and MAIL_FROM must be configured');
    }

    await ensureTable();
    const database = getPool();
    const result = await database.query<{ id: number }>(
      `INSERT INTO contact_messages (name, email, message)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [payload.name, payload.email, payload.message],
    );
    const messageId = result.rows[0].id;
    const toAddress = process.env.MAIL_TO || 'goodnessefe01@icloud.com';
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    try {
      await sgMail.send({
      from: process.env.MAIL_FROM,
      to: toAddress,
      replyTo: { email: payload.email, name: payload.name },
      subject: `Portfolio message from ${payload.name}`,
      text: `Name: ${payload.name}\nEmail: ${payload.email}\n\n${payload.message}`,
      });
      await database.query(
        `UPDATE contact_messages SET delivery_status = 'sent', sent_at = NOW() WHERE id = $1`,
        [messageId],
      );
    } catch (error) {
      await database.query(
        `UPDATE contact_messages SET delivery_status = 'failed' WHERE id = $1`,
        [messageId],
      );
      throw error;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to send email',
    });
  }
}