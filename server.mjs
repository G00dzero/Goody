import http from 'node:http';
import sgMail from '@sendgrid/mail';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase, push, ref, update } from 'firebase/database';

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

function getFirebaseDatabase() {
  const app = getApps().length ? getApp() : initializeApp({
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyC9HdjTB1B5Cj4QG0ictB9melCVSSB0Zko',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'portfoliogoody-6f75c.firebaseapp.com',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://portfoliogoody-6f75c-default-rtdb.firebaseio.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'portfoliogoody-6f75c',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'portfoliogoody-6f75c.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '1037598964400',
    appId: process.env.FIREBASE_APP_ID || '1:1037598964400:web:9befd39f26e523f18cd975',
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
    const messageRef = push(ref(database, 'contactMessages'));
    if (!messageRef.key) throw new Error('Could not create a Firebase message ID');
    await update(messageRef, {
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
      await update(messageRef, { deliveryStatus: 'sent', sentAt: new Date().toISOString() });
    } catch (error) {
      await update(messageRef, { deliveryStatus: 'failed' });
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