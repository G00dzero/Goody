import http from 'node:http';
import nodemailer from 'nodemailer';

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

let transporter;
let usingEthereal = false;

async function setupTransport() {
  if (process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_PASS)) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
    usingEthereal = false;
    console.log('Using SMTP host:', process.env.SMTP_HOST || '(auth only)');
  } else {
    // Fall back to Ethereal for local development/testing when no SMTP configured
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    usingEthereal = true;
    console.log('No SMTP configured — using Ethereal test account for email previews.');
    console.log('Ethereal user:', testAccount.user);
  }
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

    const toAddress = process.env.MAIL_TO || 'goodnessefe01@icloud.com';
    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || toAddress;

    const info = await transporter.sendMail({
      from: `Portfolio Contact <${fromAddress}>`,
      to: toAddress,
      replyTo: email,
      subject: `Portfolio message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    if (usingEthereal) {
      const preview = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL (Ethereal):', preview);
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
    await setupTransport();
    server.listen(port, host, () => {
      console.log(`Email API running at http://${host}:${port}`);
    });
  } catch (err) {
    console.error('Failed to set up mail transporter:', err);
    process.exit(1);
  }
}

main();