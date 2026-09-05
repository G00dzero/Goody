import sgMail from '@sendgrid/mail';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase, push, ref, update } from 'firebase/database';
import type { IncomingMessage, ServerResponse } from 'node:http';

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

    const database = getFirebaseDatabase();
    const messageRef = push(ref(database, 'contactMessages'));
    if (!messageRef.key) throw new Error('Could not create a Firebase message ID');
    await update(messageRef, {
      name: payload.name,
      email: payload.email,
      message: payload.message,
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString(),
    });
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
      await update(messageRef, { deliveryStatus: 'sent', sentAt: new Date().toISOString() });
    } catch (error) {
      await update(messageRef, { deliveryStatus: 'failed' });
      throw error;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Failed to send email',
    });
  }
}