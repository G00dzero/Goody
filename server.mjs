import http from 'node:http';
import sgMail from '@sendgrid/mail';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

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

function normalizePrivateKey(value) {
  const withoutQuotes = value.trim().replace(/^(['"])(.*)\1$/s, '$2');
  return withoutQuotes.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
}

function getFirebaseDatabase() {
  if (getApps().length) return getDatabase(getApp());

  let serviceAccount;
  try {
    serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  if (serviceAccount.privateKey) {
    serviceAccount.privateKey = normalizePrivateKey(serviceAccount.privateKey);
  }

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase Admin credentials are not configured');
  }

  const app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://portfoliogoody-6f75c-default-rtdb.firebaseio.com',
  });
  return getDatabase(app);
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

    if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM) {
      throw new Error('SENDGRID_API_KEY and MAIL_FROM must be configured');
    }

    const database = getFirebaseDatabase();
    const messageRef = database.ref('contactMessages').push();
    if (!messageRef.key) throw new Error('Could not create a Firebase message ID');
    await messageRef.update({
      name,
      email,
      message,
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString(),
    });
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    try {
      await sgMail.send({
        from: process.env.MAIL_FROM,
        to: process.env.MAIL_TO || 'goodnessefe01@icloud.com',
        replyTo: { email, name },
        subject: `Portfolio message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      });
      await messageRef.update({ deliveryStatus: 'sent', sentAt: new Date().toISOString() });
    } catch (error) {
      await messageRef.update({ deliveryStatus: 'failed' });
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
    if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM) {
      throw new Error('SENDGRID_API_KEY and MAIL_FROM must be configured');
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