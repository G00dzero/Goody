import http from 'node:http';
import sgMail from '@sendgrid/mail';
import pg from 'pg';

const { Pool } = pg;

const host = '127.0.0.1';
const port = Number(process.env.PORT || 3001);

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const database = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function ensureTable() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    )
  `);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/contact') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const payload = await readJson(req);
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim();
    const message = String(payload.message || '').trim();

    if (!name || !email || !message) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing name, email, or message' }));
      return;
    }

    if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM || !process.env.DATABASE_URL) {
      throw new Error('SENDGRID_API_KEY, MAIL_FROM, and DATABASE_URL must be configured');
    }

    await ensureTable();
    const inserted = await database.query(
      `INSERT INTO contact_messages (name, email, message)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name, email, message],
    );
    const messageId = inserted.rows[0].id;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    try {
      await sgMail.send({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO || 'goodnessefe01@icloud.com',
        replyTo: { email, name },
        subject: `Portfolio message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
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

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send email' }));
  }
});

async function main() {
  try {
    if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM || !process.env.DATABASE_URL) {
      throw new Error('SENDGRID_API_KEY, MAIL_FROM, and DATABASE_URL must be configured');
    }
    server.listen(port, host, () => {
      console.log(`Email API running at http://${host}:${port}`);
    });
  } catch (err) {
    console.error('Failed to set up mail transporter:', err);
    process.exit(1);
  }
}

main();