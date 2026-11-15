import '../config/env.js';
import { eq } from 'drizzle-orm';
import { createPostgresClient } from '../db/client.js';
import { bookings } from '../db/schema.js';
import { upsertUser } from '../db/users.js';

const main = async () => {
  const { db, client } = createPostgresClient();
  try {
    const bookingRows = await db.select({ id: bookings.id, name: bookings.name, phone: bookings.phone }).from(bookings);
    let linked = 0;
    for (const booking of bookingRows) {
      const userId = await upsertUser(db, booking);
      await db.update(bookings).set({ userId }).where(eq(bookings.id, booking.id));
      linked += 1;
    }
    console.log(`Backfilled ${linked} bookings with UUID customer records.`);
  } finally {
    await client.end({ timeout: 10 });
  }
};

main().catch((error) => {
  console.error('User backfill failed:', error.message);
  process.exitCode = 1;
});
