/**
 * SMS / Admin notification via WhatsApp Gateway.
 *
 * The previous third-party SMS implementation is replaced by the centralized
 * WhatsApp Gateway service (whatsapp.js). Admin alerts are now delivered as
 * WhatsApp text messages through the same gateway.
 */

import { sendText } from './whatsapp.js';

const ADMIN_PHONE_1 = process.env.ADMIN_PHONE_1;
const ADMIN_PHONE_2 = process.env.ADMIN_PHONE_2;

/**
 * Send a WhatsApp text alert to the relevant branch admin when a booking is
 * confirmed. Falls back gracefully if the gateway is not configured.
 * @param {object} booking - The confirmed booking document
 */
export const sendAdminSmsNotification = async (booking) => {
  const adminPhone = booking.branch === 'branch-2' ? ADMIN_PHONE_2 : ADMIN_PHONE_1;

  if (!adminPhone) {
    console.warn(`⚠️  No admin phone configured for branch: ${booking.branch}. Skipping admin notification.`);
    return;
  }

  const branchName   = booking.branch === 'branch-2' ? 'Bhimavaram' : 'Eluru';
  const occasion     = booking.occasion === 'Other' && booking.customOccasion
    ? booking.customOccasion
    : (booking.occasion || 'N/A');
  const paymentInfo  = booking.paymentType === 'advance'
    ? `ADVANCE (Paid: ₹${booking.amountPaid}, Bal: ₹${booking.balanceAmount})`
    : `FULL PAYMENT (Paid: ₹${booking.amountPaid})`;

  const message =
    `🌟 *NEW BOOKING CONFIRMED!*\n\n` +
    `🏢 *Branch:* ${branchName}\n` +
    `🆔 *ID:* ${booking.id}\n` +
    `👤 *Customer:* ${booking.name} (${booking.phone})\n` +
    `🎬 *Service:* ${booking.service}\n` +
    `📅 *Date:* ${booking.date}\n` +
    `⏰ *Time:* ${booking.timeSlot} (${booking.duration}hr)\n` +
    `💰 *Total:* ₹${booking.totalPrice}\n` +
    `💳 *Payment:* ${paymentInfo}\n` +
    `🎊 *Occasion:* ${occasion}`;

  try {
    await sendText(adminPhone, message);
    console.log(`✅ Admin WhatsApp notification sent for booking ${booking.id}`);
  } catch (error) {
    console.error(`✗ Failed to send admin notification for booking ${booking.id}:`, error?.message || error);
  }
};
