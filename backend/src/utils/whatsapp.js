import dotenv from 'dotenv';
dotenv.config();

const CHATMITRA_API_URL    = process.env.CHATMITRA_API_URL;
const CHATMITRA_API_KEY    = process.env.CHATMITRA_API_KEY;
const CHATMITRA_AUTH_TOKEN = process.env.CHATMITRA_AUTH_TOKEN;

const ADMIN_PHONE_1 = process.env.ADMIN_PHONE_1;
const ADMIN_PHONE_2 = process.env.ADMIN_PHONE_2;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalize to 91XXXXXXXXXX format */
const normalizePhone = (phone = '') => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

/** Format duration nicely */
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

// ── Core send function ────────────────────────────────────────────────────────

/**
 * Send a WhatsApp template message via ChatMitra
 * @param {string} phone - recipient phone number
 * @param {string} templateName - approved template name
 * @param {string[]} components - ordered variable values [{1}, {2}, ...]
 */
const sendTemplateMessage = async (phone, templateName, components) => {
  if (!CHATMITRA_API_URL || !CHATMITRA_API_KEY || !CHATMITRA_AUTH_TOKEN) {
    console.warn('⚠️  ChatMitra credentials missing — skipping WhatsApp.');
    return;
  }

  const normalizedPhone = normalizePhone(phone);

  const payload = {
    recipient_mobile_number: normalizedPhone,
    customer_name: components[0] || '',  // first param is always the customer name
    messages: [
      {
        kind: 'template',
        template: {
          name: templateName,
          language: 'en_US',
          components: [
            {
              type: 'body',
              parameters: components.map(value => ({
                type: 'text',
                text: String(value ?? ''),
              })),
            },
          ],
        },
      },
    ],
  };

  console.log(`📲 ChatMitra → ${normalizedPhone} | template: ${templateName}`);

  const response = await fetch(CHATMITRA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CHATMITRA_API_KEY}:${CHATMITRA_AUTH_TOKEN.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  console.log(`   response ${response.status}:`, JSON.stringify(data));

  if (!response.ok) {
    throw new Error(`ChatMitra ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send booking confirmation WhatsApp messages to customer + branch admin.
 * Uses approved ChatMitra templates.
 */
export const sendBookingWhatsAppNotifications = async (booking) => {
  if (!CHATMITRA_API_URL || !CHATMITRA_API_KEY || !CHATMITRA_AUTH_TOKEN) {
    console.warn('⚠️  ChatMitra not configured — skipping WhatsApp notifications.');
    return;
  }

  const adminPhone = booking.branch === 'branch-2' ? ADMIN_PHONE_2 : ADMIN_PHONE_1;
  const isPremium  = booking.service === 'premium-pack';
  const occasion   = booking.occasion === 'Other' && booking.customOccasion
    ? booking.customOccasion
    : (booking.occasion || 'Celebration');

  const promises = [];

  // ── 1. Customer — payment confirmation ──────────────────────────────────────
  // Template: payment_confirmation_20260525081147
  // {1}=name {2}=date {3}=time {4}=duration {5}=package {6}=bookingId
  if (booking.phone) {
    promises.push(
      sendTemplateMessage(
        booking.phone,
        'payment_confirmation_20260525081147',
        [
          booking.name,
          booking.date,
          booking.timeSlot,
          fmtDuration(booking.duration),
          fmtService(booking.service),
          booking.id,
        ]
      ).catch(err => console.error('✗ WhatsApp customer notification failed:', err.message))
    );
  }

  // ── 2. Admin notification ────────────────────────────────────────────────────
  if (adminPhone) {
    if (isPremium) {
      // Template: premium_booking_admin_20260524235632
      // {1}=customer {2}=phone {3}=date {4}=slot {5}=duration {6}=amount
      promises.push(
        sendTemplateMessage(
          adminPhone,
          'premium_booking_admin_20260524235632',
          [
            booking.name,
            booking.phone,
            booking.date,
            booking.timeSlot,
            fmtDuration(booking.duration),
            `₹${booking.totalPrice}`,
          ]
        ).catch(err => console.error('✗ WhatsApp admin (premium) notification failed:', err.message))
      );
    } else {
      // Template: standard_booking_admin_20260524235438
      // {1}=customer {2}=phone {3}=date {4}=slot {5}=duration {6}=addons {7}=occasion {8}=amount
      promises.push(
        sendTemplateMessage(
          adminPhone,
          'standard_booking_admin_20260524235438',
          [
            booking.name,
            booking.phone,
            booking.date,
            booking.timeSlot,
            fmtDuration(booking.duration),
            fmtAddons(booking),
            occasion,
            `₹${booking.totalPrice}`,
          ]
        ).catch(err => console.error('✗ WhatsApp admin (standard) notification failed:', err.message))
      );
    }
  }

  await Promise.all(promises);
};

/**
 * Send WhatsApp Campaign using ChatMitra API.
 * Uses a marketing template (e.g., 'marketing_update').
 */
export const sendWhatsAppCampaign = async ({ message, image, phones }) => {
  if (!phones || phones.length === 0) return { success: true, count: 0 };
  
  if (!CHATMITRA_API_URL || !CHATMITRA_API_KEY || !CHATMITRA_AUTH_TOKEN) {
    console.warn('⚠️  ChatMitra credentials missing — skipping WhatsApp campaign.');
    return { success: false, error: 'ChatMitra credentials missing' };
  }

  let successCount = 0;
  for (const phone of phones) {
    const normalizedPhone = normalizePhone(phone);
    try {
      const payload = {
        recipient_mobile_number: normalizedPhone,
        customer_name: "Customer",
        messages: [
          {
            kind: 'template',
            template: {
              name: 'marketing_update', // Replace with the actual approved template name on ChatMitra/Meta
              language: 'en_US',
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: message }
                  ],
                },
              ],
            },
          },
        ],
      };
      
      // If an image URL is provided, append it to the template header
      if (image) {
        payload.messages[0].template.components.push({
          type: 'header',
          parameters: [
            { type: 'image', image: { link: image } }
          ]
        });
      }

      console.log(`📲 Sending campaign to ${normalizedPhone}`);
      const response = await fetch(CHATMITRA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHATMITRA_API_KEY}:${CHATMITRA_AUTH_TOKEN.trim()}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        successCount++;
      }
    } catch (err) {
      console.error(`Failed campaign to ${phone}:`, err.message);
    }
  }

  return { success: true, count: successCount };
};
