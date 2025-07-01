// pages/api/webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import twilio from 'twilio';

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = twilio(accountSid, authToken);

// Types
type Session = {
  state: string;
  lastInteraction: number;
  bookingData: {
    name?: string;
    contact?: string;
    package?: string;
    people?: string;
    dates?: string;
    [key: string]: any;
  };
};

type BotResponses = Record<string, string>;

const userSessions = new Map<string, Session>();

function getUserSession(phoneNumber: string): Session {
  if (!userSessions.has(phoneNumber)) {
    userSessions.set(phoneNumber, {
      state: 'new',
      lastInteraction: Date.now(),
      bookingData: {}
    });
  }
  return userSessions.get(phoneNumber)!;
}

function updateUserSession(phoneNumber: string, updates: Partial<Session>) {
  const session = getUserSession(phoneNumber);
  Object.assign(session, updates, { lastInteraction: Date.now() });
}

const botResponses: BotResponses = {
  welcome: `🏔️ Welcome to Lambda Adventures! ...`,
  packages: `🎒 Our Adventure Packages: ...`,
  booking: `📝 Ready to book your adventure? ...`,
  locations: `📍 Our Adventure Locations: ...`,
  pricing: `💰 Adventure Pricing: ...`,
  support: `🆘 Lambda Adventures Support: ...`,
  default: `I'm not sure I understand that. Here's what I can help you with: ...`
};

function processMessage(message: string, phoneNumber: string): string {
  const session = getUserSession(phoneNumber);
  const lowerMessage = message.toLowerCase().trim();

  switch (session.state) {
    case 'booking_name':
      session.bookingData.name = message;
      updateUserSession(phoneNumber, { state: 'booking_contact' });
      return 'Great! Now please provide your contact number:';

    case 'booking_contact':
      session.bookingData.contact = message;
      updateUserSession(phoneNumber, { state: 'booking_package' });
      return 'Perfect! Which adventure package interests you?';

    case 'booking_package':
      session.bookingData.package = message;
      updateUserSession(phoneNumber, { state: 'booking_people' });
      return 'Excellent choice! How many people will be joining the adventure?';

    case 'booking_people':
      session.bookingData.people = message;
      updateUserSession(phoneNumber, { state: 'booking_dates' });
      return 'Almost done! What are your preferred dates?';

    case 'booking_dates': {
      session.bookingData.dates = message;
      const booking = session.bookingData;
      updateUserSession(phoneNumber, { state: 'new', bookingData: {} });

      return `🎉 Booking Request Received!\n\n📋 Summary:
👤 Name: ${booking.name}
📞 Contact: ${booking.contact}
🎒 Package: ${booking.package}
👥 People: ${booking.people}
📅 Dates: ${booking.dates}

✅ Our team will contact you shortly.
🆔 Booking Ref: LA${Date.now().toString().slice(-6)}`;
    }

    default:
      break;
  }

  if (['hi', 'hello', 'start'].some(word => lowerMessage.includes(word)) || session.state === 'new') {
    updateUserSession(phoneNumber, { state: 'menu' });
    return botResponses.welcome;
  }

  if (lowerMessage.includes('package')) return botResponses.packages;
  if (lowerMessage.includes('book')) {
    updateUserSession(phoneNumber, { state: 'booking_name' });
    return botResponses.booking + "\n\nLet's start with your name:";
  }
  if (lowerMessage.includes('location')) return botResponses.locations;
  if (lowerMessage.includes('price')) return botResponses.pricing;
  if (lowerMessage.includes('support') || lowerMessage.includes('help')) return botResponses.support;

  return botResponses.default;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const signature = req.headers['x-twilio-signature'] as string;
    const url = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}${req.url}`;

    if (!twilio.validateRequest(authToken, signature, url, req.body)) {
      console.warn('Invalid Twilio signature');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const incoming = req.body.Body?.trim();
    const from = req.body.From;
    const to = req.body.To;

    if (!incoming || !from) return res.status(400).json({ error: 'Missing required fields' });

    const response = processMessage(incoming, from);

    await client.messages.create({
      from: to,
      to: from,
      body: response
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Session cleanup
function cleanupSessions() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hrs
  for (const [phone, session] of userSessions.entries()) {
    if (now - session.lastInteraction > maxAge) {
      userSessions.delete(phone);
    }
  }
}
setInterval(cleanupSessions, 60 * 60 * 1000);
