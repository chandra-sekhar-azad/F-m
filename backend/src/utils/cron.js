import { and, eq, inArray } from 'drizzle-orm';
import { createPostgresClient } from '../db/client.js';
import { bookings } from '../db/schema.js';
import { sendReviewRequestMessage } from './whatsapp.js';
import { parse12HourTime } from './timeUtils.js';

let cronInterval = null;
const checkAndSendReviewRequests = async () => {
  const now = new Date(); const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const date = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  const { db, client } = createPostgresClient();
  try {
    const pending = await db.select().from(bookings).where(and(eq(bookings.date, date), inArray(bookings.paymentStatus, ['paid', 'partially-paid']), eq(bookings.reviewRequested, false)));
    for (const booking of pending) {
      const end = (booking.startTimeMinutes ?? parse12HourTime(booking.timeSlot)) + booking.duration * 60;
      if (minutes >= end + 5) { await sendReviewRequestMessage(booking); await db.update(bookings).set({ reviewRequested: true, updatedAt: new Date() }).where(eq(bookings.id, booking.id)); }
    }
  } catch (error) { console.error('[Cron] Error in checkAndSendReviewRequests:', error); } finally { await client.end({ timeout: 5 }); }
};
export const startCronJobs = () => { if (cronInterval) return; cronInterval = setInterval(checkAndSendReviewRequests, 60_000); setTimeout(checkAndSendReviewRequests, 5_000); };
export const stopCronJobs = () => { if (cronInterval) { clearInterval(cronInterval); cronInterval = null; } };
