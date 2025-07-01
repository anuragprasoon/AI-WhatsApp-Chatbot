// pages/api/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { twiml } from 'twilio';

export const config = {
  api: {
    bodyParser: {
      extended: false,
      sizeLimit: '1mb',
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const MessagingResponse = twiml.MessagingResponse;
  const twimlResponse = new MessagingResponse();

  const body = req.body as { Body?: string };
  const incomingMsg = body.Body?.trim().toLowerCase() || '';

  let reply = '';

  switch (incomingMsg) {
    case 'hi':
      reply = 'Hello! 👋 Welcome to Lambda Adventure. Type "help" to see what I can do.';
      break;
    case 'help':
      reply =
        `Here's what I can help you with:\n` +
        `• "tours" - View available adventure tours 🏞️\n` +
        `• "contact" - Get in touch with us ☎️\n` +
        `• "book" - Book your next adventure 🚀`;
      break;
    case 'tours':
      reply =
        `🏕️ *Our Popular Tours:*\n` +
        `1. Himalayan Trekking\n` +
        `2. Spiti Valley Expedition\n` +
        `3. Rishikesh River Rafting\n` +
        `Type "book" to plan your adventure!`;
      break;
    case 'contact':
      reply = '📞 You can reach us at +91-9876543210 or email us at travel@lambdaadventure.com';
      break;
    case 'book':
      reply = 'Awesome! 🧭 Please visit https://lambdaadventure.com/book to confirm your booking.';
      break;
    default:
      reply = `Sorry, I didn’t understand that. Type "help" to see available commands.`;
  }

  twimlResponse.message(reply);
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twimlResponse.toString());
}
