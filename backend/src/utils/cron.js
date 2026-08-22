import { branchDbs } from '../config/constants.js';
import { getBranchModels } from '../config/mongo.js';
import { sendReviewRequestMessage } from './whatsapp.js';
import { parse12HourTime } from './timeUtils.js';

let cronInterval = null;

const checkAndSendReviewRequests = async () => {
  try {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStr = `${istTime.getFullYear()}-${String(istTime.getMonth() + 1).padStart(2, '0')}-${String(istTime.getDate()).padStart(2, '0')}`;
    const currentMinutes = istTime.getHours() * 60 + istTime.getMinutes();

    // Check all branches
    for (const branchId in branchDbs) {
      const models = getBranchModels(branchId);

      let pendingBookings = [];

      if (models) {
        pendingBookings = await models.Booking.find({
          date: todayStr,
          paymentStatus: { $in: ['paid', 'partially-paid'] },
          reviewRequested: { $ne: true }
        });
      } else {
        const branchDb = branchDbs[branchId];
        if (branchDb && branchDb.bookings) {
          pendingBookings = branchDb.bookings.filter(b =>
            b.date === todayStr &&
            ['paid', 'partially-paid'].includes(b.paymentStatus) &&
            !b.reviewRequested
          );
        }
      }

      for (const booking of pendingBookings) {
        // Use startTimeMinutes if available, else parse from timeSlot
        let startMins = booking.startTimeMinutes;
        if (startMins === undefined || startMins === null) {
          startMins = parse12HourTime(booking.timeSlot);
        }

        if (startMins !== null && booking.duration) {
          const actualEndMins = startMins + booking.duration * 60;

          // If current time is 5 or more minutes after the end time
          if (currentMinutes >= actualEndMins + 5) {
            console.log(`[Cron] Triggering review request for booking ${booking.id} (${booking.name})`);

            try {
              await sendReviewRequestMessage(booking);

              // Mark as requested
              if (models) {
                await models.Booking.updateOne({ id: booking.id }, { reviewRequested: true });
              } else {
                const b = branchDbs[branchId].bookings.find(x => x.id === booking.id);
                if (b) b.reviewRequested = true;
              }
            } catch (err) {
              console.error(`[Cron] Failed to send review request for booking ${booking.id}:`, err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Cron] Error in checkAndSendReviewRequests:', error);
  }
};

export const startCronJobs = () => {
  if (cronInterval) return;
  console.log('🚀 Starting background cron jobs (Review requests)');

  // Run every 1 minute
  cronInterval = setInterval(checkAndSendReviewRequests, 60 * 1000);

  // Also run immediately on start after a short delay
  setTimeout(checkAndSendReviewRequests, 5000);
};

export const stopCronJobs = () => {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('🛑 Stopped background cron jobs');
  }
};
