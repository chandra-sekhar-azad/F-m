/**
 * WhatsApp API Gateway Service
 *
 * Gateway: https://whatsapp.swiftproject.in
 * Architecture: Backend → WhatsApp Gateway → WhatsApp → Customer
 *
 * Auth:    token passed as query param  ?token=<WHATSAPP_API_TOKEN>
 * Session: selected via query param     &session=<WHATSAPP_SESSION>
 * Send endpoint: POST /send-message
 *
 * The gateway handles its own internal queue and randomised 2-4 s safety
 * delays between messages. Do NOT add sleep()/setTimeout() here.
 *
 * Required environment variables:
 *   WHATSAPP_GATEWAY_URL  – https://whatsapp.swiftproject.in
 *   WHATSAPP_API_TOKEN    – token from the gateway admin panel
 *   WHATSAPP_SESSION      – session name (e.g. "fm")
 *
 * Optional:
 *   WHATSAPP_SESSION_PASSWORD – only needed when pairing a new session via QR
 */

import dotenv from 'dotenv';
dotenv.config();

// ── Configuration ─────────────────────────────────────────────────────────────

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL;
const API_TOKEN   = process.env.WHATSAPP_API_TOKEN;
const SESSION     = process.env.WHATSAPP_SESSION || 'default';

const ADMIN_PHONE_1 = process.env.ADMIN_PHONE_1;
const ADMIN_PHONE_2 = process.env.ADMIN_PHONE_2;

const MAX_ATTACHMENT_BYTES = 209_715_200; // 200 MB

// ── Phone number normalisation ────────────────────────────────────────────────

/**
 * Normalise a phone number to the gateway's required format:
 * international country code + number, no leading zeros, no '+'.
 * Example: "+91 7842713943" → "917842713943"
 * @param {string} phone
 * @returns {string}
 */
const normalizePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) throw new Error('Phone number is empty after normalisation');
  // Already has 91 prefix and is 12 digits (Indian)
  if (digits.startsWith('91') && digits.length === 12) return digits;
  // 10-digit Indian mobile
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

// ── Gateway API client ────────────────────────────────────────────────────────

/**
 * Send a single request to the WhatsApp Gateway.
 * Auth token and session are added as query params — centralised here only,
 * never passed from callers.
 * @param {object} payload
 * @returns {Promise<object>} raw gateway response
 */
const gatewayRequest = async (payload) => {
  if (!GATEWAY_URL) {
    throw new Error('WHATSAPP_GATEWAY_URL is not configured');
  }
  if (!API_TOKEN) {
    throw new Error('WHATSAPP_API_TOKEN is not configured');
  }

  // Token and session travel as query params — never in logs
  const endpoint = `${GATEWAY_URL}/send-message?token=${API_TOKEN}&session=${SESSION}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Safely parse response — preserve raw when format is unknown
  let data;
  const text = await response.text().catch(() => '');
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!response.ok) {
    // Scrub token from any error messages before surfacing
    const safe = JSON.stringify(data).replace(API_TOKEN, '[REDACTED]');
    throw new Error(`Gateway HTTP ${response.status}: ${safe}`);
  }

  return data;
};

// ── Public service methods ────────────────────────────────────────────────────

/**
 * Send a plain text WhatsApp message.
 * Supports standard WhatsApp formatting: *bold*, _italics_, etc.
 * @param {string} to   – destination phone (will be normalised)
 * @param {string} message
 */
export const sendText = async (to, message) => {
  if (!to)      throw new Error('sendText: "to" is required');
  if (!message) throw new Error('sendText: "message" is required');

  const normalised = normalizePhone(to);
  console.log(`📲 WhatsApp text → ********${normalised.slice(-4)}`);

  return gatewayRequest({ to: normalised, message });
};

/**
 * Send a media message (image, video, PDF, etc.)
 * @param {string} to
 * @param {string} message  – caption
 * @param {string} attachment – public URL or data:<mime>;base64,<data>
 */
export const sendMedia = async (to, message, attachment) => {
  if (!to)         throw new Error('sendMedia: "to" is required');
  if (!attachment) throw new Error('sendMedia: "attachment" is required');

  // Validate base64 attachment size
  if (attachment.startsWith('data:')) {
    const base64Part = attachment.split(',')[1] || '';
    const estimatedBytes = Math.ceil(base64Part.length * 0.75);
    if (estimatedBytes > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Attachment exceeds 200 MB limit (estimated ${Math.round(estimatedBytes / 1_048_576)} MB)`);
    }
  }

  const normalised = normalizePhone(to);
  console.log(`📲 WhatsApp media → ********${normalised.slice(-4)} | message type: media`);

  return gatewayRequest({ to: normalised, message: message || '', attachment });
};

/**
 * Send an interactive poll.
 * @param {string} to
 * @param {{ name: string, options: string[], selectableAnswersCount: number }} poll
 */
export const sendPoll = async (to, poll) => {
  if (!to)   throw new Error('sendPoll: "to" is required');
  if (!poll) throw new Error('sendPoll: "poll" is required');
  if (!poll.name)              throw new Error('sendPoll: poll.name is required');
  if (!Array.isArray(poll.options) || poll.options.length < 1) {
    throw new Error('sendPoll: poll.options must be a non-empty array');
  }

  const normalised = normalizePhone(to);
  console.log(`📲 WhatsApp poll → ********${normalised.slice(-4)} | message type: poll`);

  return gatewayRequest({ to: normalised, poll });
};

/**
 * Send a location pin.
 * @param {string} to
 * @param {{ latitude: number, longitude: number, name?: string, address?: string }} location
 */
export const sendLocation = async (to, location) => {
  if (!to)       throw new Error('sendLocation: "to" is required');
  if (!location) throw new Error('sendLocation: "location" is required');

  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  if (isNaN(lat) || lat < -90  || lat > 90)  throw new Error('sendLocation: invalid latitude');
  if (isNaN(lon) || lon < -180 || lon > 180) throw new Error('sendLocation: invalid longitude');

  const normalised = normalizePhone(to);
  console.log(`📲 WhatsApp location → ********${normalised.slice(-4)} | message type: location`);

  return gatewayRequest({ to: normalised, location: { ...location, latitude: lat, longitude: lon } });
};

/**
 * Send a contact card.
 * @param {string} to
 * @param {{ fullName: string, organization?: string, phoneNumber?: string }} contact
 */
export const sendContact = async (to, contact) => {
  if (!to)      throw new Error('sendContact: "to" is required');
  if (!contact) throw new Error('sendContact: "contact" is required');
  if (!contact.fullName) throw new Error('sendContact: contact.fullName is required');

  const normalised = normalizePhone(to);
  console.log(`📲 WhatsApp contact → ********${normalised.slice(-4)} | message type: contact`);

  return gatewayRequest({ to: normalised, contact });
};

/**
 * Send an emoji reaction to an existing message.
 * @param {string} to
 * @param {{ text: string, key: { remoteJid: string, id: string } }} reaction
 */
export const sendReaction = async (to, reaction) => {
  if (!to)       throw new Error('sendReaction: "to" is required');
  if (!reaction) throw new Error('sendReaction: "reaction" is required');
  if (!reaction.text)      throw new Error('sendReaction: reaction.text is required');
  if (!reaction.key?.id)   throw new Error('sendReaction: reaction.key.id is required');

  const normalised = normalizePhone(to);
  console.log(`📲 WhatsApp reaction → ********${normalised.slice(-4)} | message type: reaction`);

  return gatewayRequest({ to: normalised, reaction });
};

/**
 * Simulate typing / composing presence.
 * @param {string} to
 * @param {{ status: 'composing'|'paused'|'recording', duration?: number }} presence
 */
export const sendPresence = async (to, presence) => {
  if (!to)       throw new Error('sendPresence: "to" is required');
  if (!presence) throw new Error('sendPresence: "presence" is required');
  if (!presence.status) throw new Error('sendPresence: presence.status is required');

  const normalised = normalizePhone(to);
  console.log(`📲 WhatsApp presence → ********${normalised.slice(-4)} | status: ${presence.status}`);

  return gatewayRequest({ to: normalised, presence });
};

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Format duration */
const fmtDuration = (d) => `${d} hr${d > 1 ? 's' : ''}`;

/** Format service name */
const fmtService = (s = '') => {
  if (s === 'private-theatre-party-hall') return 'Standard Pack';
  if (s === 'premium-pack') return 'Premium Pack';
  return s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
};

/** Format extra add-ons list */
const fmtAddons = (booking) => {
  const parts = [];
  if (booking.selectedCake?.name) parts.push(`Cake: ${booking.selectedCake.name}`);
  if (booking.decorationRequired) parts.push('Basic Decoration');
  if (Array.isArray(booking.extraDecorations) && booking.extraDecorations.length > 0) {
    parts.push(...booking.extraDecorations.map(d => d.name));
  }
  return parts.length > 0 ? parts.join(', ') : 'None';
};

// ── Application-level notification helpers ────────────────────────────────────

/**
 * Check whether the gateway is configured.
 * Used to provide an early, friendly warning in all notification paths.
 */
const isGatewayConfigured = () => {
  if (!GATEWAY_URL || !API_TOKEN) {
    console.warn('⚠️  WhatsApp Gateway not configured (WHATSAPP_GATEWAY_URL / WHATSAPP_API_TOKEN missing) — skipping.');
    return false;
  }
  return true;
};

/**
 * Send booking confirmation messages to the customer and the branch admin.
 * Fires-and-forgets individual sends so one failure doesn't block the other.
 * @param {object} booking
 */
export const sendBookingWhatsAppNotifications = async (booking) => {
  if (!isGatewayConfigured()) return;

  const adminPhone = booking.branch === 'branch-2' ? ADMIN_PHONE_2 : ADMIN_PHONE_1;
  const isPremium  = booking.service === 'premium-pack';
  const occasion   = booking.occasion === 'Other' && booking.customOccasion
    ? booking.customOccasion
    : (booking.occasion || 'Celebration');

  const promises = [];

  // ── 1. Customer confirmation ──────────────────────────────────────────────
  if (booking.phone) {
    const customerMsg =
      `✅ *Booking Confirmed!*\n\n` +
      `Hi *${booking.name}*! 🎉\n\n` +
      `📅 *Date:* ${booking.date}\n` +
      `⏰ *Time:* ${booking.timeSlot}\n` +
      `⏳ *Duration:* ${fmtDuration(booking.duration)}\n` +
      `🎬 *Package:* ${fmtService(booking.service)}\n` +
      `🎊 *Occasion:* ${occasion}\n` +
      `🆔 *Booking ID:* ${booking.id}\n\n` +
      `_Friends & Memories — creating moments that last a lifetime._`;

    promises.push(
      sendText(booking.phone, customerMsg)
        .catch(err => console.error('✗ WhatsApp customer notification failed:', err.message))
    );
  }

  // ── 2. Admin notification ─────────────────────────────────────────────────
  if (adminPhone) {
    let adminMsg;
    if (isPremium) {
      adminMsg =
        `🌟 *New Premium Booking!*\n\n` +
        `👤 *Customer:* ${booking.name}\n` +
        `📞 *Phone:* ${booking.phone}\n` +
        `📅 *Date:* ${booking.date}\n` +
        `⏰ *Slot:* ${booking.timeSlot}\n` +
        `⏳ *Duration:* ${fmtDuration(booking.duration)}\n` +
        `💰 *Amount:* ₹${booking.totalPrice}`;
    } else {
      adminMsg =
        `🎬 *New Standard Booking!*\n\n` +
        `👤 *Customer:* ${booking.name}\n` +
        `📞 *Phone:* ${booking.phone}\n` +
        `📅 *Date:* ${booking.date}\n` +
        `⏰ *Slot:* ${booking.timeSlot}\n` +
        `⏳ *Duration:* ${fmtDuration(booking.duration)}\n` +
        `🎁 *Add-ons:* ${fmtAddons(booking)}\n` +
        `🎊 *Occasion:* ${occasion}\n` +
        `💰 *Amount:* ₹${booking.totalPrice}`;
    }

    promises.push(
      sendText(adminPhone, adminMsg)
        .catch(err => console.error('✗ WhatsApp admin notification failed:', err.message))
    );
  }

  await Promise.all(promises);
};

/**
 * Send a WhatsApp campaign message to a list of phone numbers.
 * The gateway handles rate-limiting / queuing internally — no manual delays.
 * @param {{ message: string, image?: string, phones: string[] }} opts
 */
export const sendWhatsAppCampaign = async ({ message, image, phones }) => {
  if (!phones || phones.length === 0) return { success: true, count: 0 };
  if (!isGatewayConfigured()) return { success: false, error: 'WhatsApp Gateway not configured' };

  let successCount = 0;
  const errors = [];

  for (const phone of phones) {
    try {
      if (image) {
        await sendMedia(phone, message, image);
      } else {
        await sendText(phone, message);
      }
      successCount++;
    } catch (err) {
      const masked = String(phone).replace(/\d(?=\d{4})/g, '*');
      console.error(`✗ Campaign send failed for ${masked}:`, err.message);
      errors.push({ phone: masked, error: err.message });
    }
  }

  return { success: true, count: successCount, errors: errors.length ? errors : undefined };
};
