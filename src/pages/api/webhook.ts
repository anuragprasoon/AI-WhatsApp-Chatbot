// pages/api/webhook.js
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Bot responses and state management
const botResponses = {
  welcome: `🏔️ Welcome to Lambda Adventures! 

I'm here to help you plan your next adventure. What would you like to know about?

1️⃣ Adventure Packages
2️⃣ Booking Information  
3️⃣ Location Details
4️⃣ Pricing
5️⃣ Contact Support

Just type the number or keyword!`,

  packages: `🎒 Our Adventure Packages:

🏔️ *Mountain Trekking*
- Duration: 3-7 days
- Difficulty: Beginner to Expert
- Includes: Guide, Equipment, Meals

🏕️ *Camping Expeditions*  
- Duration: 2-5 days
- Perfect for families
- Includes: Tent, Food, Activities

🚣 *Water Adventures*
- Rafting, Kayaking, Fishing
- Half-day to multi-day options
- All skill levels welcome

🏃 *Adventure Sports*
- Rock climbing, Zip-lining
- Professional instructors
- Safety equipment included

Type 'booking' to reserve or 'details' for more info!`,

  booking: `📝 Ready to book your adventure?

Please provide:
1. Your Name
2. Contact Number  
3. Preferred Package
4. Number of People
5. Preferred Dates


You can also visit: www.lambdaadventures.com/book`,

  locations: `📍 Our Adventure Locations:

🏔️ *Mountain Base Camp*
- Altitude: 2,500m
- Best Season: Apr-Oct
- Activities: Trekking, Climbing

🏞️ *Riverside Valley*  
- Perfect for camping
- Year-round availability
- Activities: Rafting, Fishing

🌲 *Forest Adventure Park*
- Family-friendly
- Adventure sports hub
- Open daily 9AM-6PM

Need directions? Just ask!`,

  pricing: `💰 Adventure Pricing:

🏔️ *Mountain Packages*
- 3-day trek: $299/person
- 5-day expedition: $499/person
- 7-day adventure: $699/person

🏕️ *Camping Packages*
- Weekend camp: $149/person  
- 3-day camp: $249/person
- 5-day camp: $399/person

🚣 *Water Adventures*
- Half-day: $89/person
- Full-day: $149/person
- Multi-day: $199/person/day

💡 *Group Discounts Available!*
- 5+ people: 10% off
- 10+ people: 15% off
- 20+ people: 20% off

Ready to book? Type 'booking'!`,

  support: `🆘 Lambda Adventures Support:

📧 Email: help@lambdaadventures.com
🌐 Website: www.lambdaadventures.com

🕒 Office Hours:
Monday-Friday: 8AM-8PM
Saturday-Sunday: 9AM-6PM

For emergencies during adventures:
📞 Emergency Line: +91-555-HELP

How else can I help you today?`,

  default: `I'm not sure I understand that. Here's what I can help you with:

1️⃣ Adventure Packages
2️⃣ Booking Information
3️⃣ Location Details  
4️⃣ Pricing
5️⃣ Contact Support

Type a number or keyword like 'packages', 'booking', etc.`
};

// User session management (in production, use a database)
const userSessions = new Map();

function getUserSession(phoneNumber) {
  if (!userSessions.has(phoneNumber)) {
    userSessions.set(phoneNumber, {
      state: 'new',
      lastInteraction: Date.now(),
      bookingData: {}
    });
  }
  return userSessions.get(phoneNumber);
}

function updateUserSession(phoneNumber, updates) {
  const session = getUserSession(phoneNumber);
  Object.assign(session, updates, { lastInteraction: Date.now() });
}

function processMessage(message, phoneNumber) {
  const session = getUserSession(phoneNumber);
  const lowerMessage = message.toLowerCase().trim();
  
  // Handle booking flow
  if (session.state === 'booking_name') {
    session.bookingData.name = message;
    updateUserSession(phoneNumber, { state: 'booking_contact' });
    return "Great! Now please provide your contact number:";
  }
  
  if (session.state === 'booking_contact') {
    session.bookingData.contact = message;
    updateUserSession(phoneNumber, { state: 'booking_package' });
    return "Perfect! Which adventure package interests you? (Mountain, Camping, Water, Sports)";
  }
  
  if (session.state === 'booking_package') {
    session.bookingData.package = message;
    updateUserSession(phoneNumber, { state: 'booking_people' });
    return "Excellent choice! How many people will be joining the adventure?";
  }
  
  if (session.state === 'booking_people') {
    session.bookingData.people = message;
    updateUserSession(phoneNumber, { state: 'booking_dates' });
    return "Almost done! What are your preferred dates? (e.g., March 15-17, 2024)";
  }
  
  if (session.state === 'booking_dates') {
    session.bookingData.dates = message;
    updateUserSession(phoneNumber, { state: 'new' });
    
    const booking = session.bookingData;
    const confirmation = `🎉 Booking Request Received!

📋 Summary:
👤 Name: ${booking.name}
📞 Contact: ${booking.contact}  
🎒 Package: ${booking.package}
👥 People: ${booking.people}
📅 Dates: ${booking.dates}

✅ Our team will contact you within 2 hours to confirm availability and payment details.

🆔 Booking Reference: LA${Date.now().toString().slice(-6)}

Thank you for choosing Lambda Adventures! 🏔️`;
    
    // Clear booking data
    session.bookingData = {};
    return confirmation;
  }
  
  // Handle main menu options
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || 
      lowerMessage.includes('start') || session.state === 'new') {
    updateUserSession(phoneNumber, { state: 'menu' });
    return botResponses.welcome;
  }
  
  if (lowerMessage.includes('1') || lowerMessage.includes('package') || 
      lowerMessage.includes('adventure')) {
    return botResponses.packages;
  }
  
  if (lowerMessage.includes('2') || lowerMessage.includes('book') || 
      lowerMessage.includes('reserve')) {
    updateUserSession(phoneNumber, { state: 'booking_name' });
    return botResponses.booking + "\n\nLet's start with your name:";
  }
  
  if (lowerMessage.includes('3') || lowerMessage.includes('location') || 
      lowerMessage.includes('where')) {
    return botResponses.locations;
  }
  
  if (lowerMessage.includes('4') || lowerMessage.includes('price') || 
      lowerMessage.includes('cost')) {
    return botResponses.pricing;
  }
  
  if (lowerMessage.includes('5') || lowerMessage.includes('support') || 
      lowerMessage.includes('help') || lowerMessage.includes('contact')) {
    return botResponses.support;
  }
  
  // Handle specific inquiries
  if (lowerMessage.includes('mountain') || lowerMessage.includes('trek')) {
    return `🏔️ Mountain Adventures Details:

Our mountain packages include:
- Professional mountain guides
- High-quality climbing equipment  
- Nutritious mountain meals
- Emergency safety gear
- First aid support

🎯 Difficulty Levels:
- Beginner: Easy trails, 3-4 hours daily
- Intermediate: Moderate trails, 5-6 hours daily  
- Expert: Challenging peaks, 7-8 hours daily

Best months: April to October
Group size: 4-12 people

Ready to book? Type 'booking'!`;
  }
  
  if (lowerMessage.includes('camp')) {
    return `🏕️ Camping Experience Details:

What's included:
- Premium camping equipment
- Comfortable sleeping arrangements
- Outdoor cooking facilities
- Campfire activities
- Nature walks and games

📍 Camping Locations:
- Riverside sites with water activities
- Forest clearings with hiking trails
- Mountain base camps with stunning views

Perfect for families, friends, and corporate retreats!

Interested? Type 'booking' to reserve!`;
  }
  
  if (lowerMessage.includes('water') || lowerMessage.includes('raft') || 
      lowerMessage.includes('kayak')) {
    return `🚣 Water Adventures Details:

🌊 Activities Available:
- White water rafting (Grade II-IV)
- Kayaking lessons and tours
- Fishing expeditions  
- River crossing challenges

⛑️ Safety First:
- Certified water sports instructors
- Life jackets and safety equipment
- Medical support on standby
- Weather monitoring

🎣 Fishing Packages:
- Equipment provided
- Local guide included
- Fresh catch cooking lessons

Ready for the splash? Type 'booking'!`;
  }
  
  if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
    return `🆘 EMERGENCY SUPPORT

If you're currently on an adventure and need immediate assistance:

📞 Emergency Hotline: +91-555-HELP
🚨 This line is monitored 24/7

For non-emergency support:
📞 Regular Support: +91-555-LAMBDA

Your safety is our top priority! 🛡️`;
  }
  
  return botResponses.default;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Verify Twilio signature for security
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}${req.url}`;
    
    if (!twilio.validateRequest(authToken, twilioSignature, url, req.body)) {
      console.log('Invalid Twilio signature');
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const incomingMessage = req.body.Body?.trim();
    const fromNumber = req.body.From;
    const toNumber = req.body.To;
    
    if (!incomingMessage || !fromNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Received message from ${fromNumber}: ${incomingMessage}`);
    
    // Process the message and get response
    const responseMessage = processMessage(incomingMessage, fromNumber);
    
    // Send response via Twilio
    await client.messages.create({
      from: toNumber, // Your Twilio WhatsApp number
      to: fromNumber,
      body: responseMessage
    });
    
    console.log(`Sent response to ${fromNumber}: ${responseMessage.substring(0, 100)}...`);
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Clean up old sessions periodically (run this as a cron job in production)
function cleanupSessions() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [phoneNumber, session] of userSessions.entries()) {
    if (now - session.lastInteraction > maxAge) {
      userSessions.delete(phoneNumber);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000);