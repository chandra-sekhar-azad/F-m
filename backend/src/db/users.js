import { createPostgresClient } from './client.js';
import { users } from './schema.js';

export const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  // Existing customer phone numbers are Indian mobile numbers. Store +91 and
  // 10-digit entries as the same canonical 10-digit value.
  const normalized = digits.replace(/^91(?=\d{10}$)/, '');
  if (!/^\d{10,15}$/.test(normalized)) {
    throw new Error('A valid mobile number is required.');
  }
  return normalized;
};

/**
 * Creates a customer once per normalized mobile number, returning its UUID.
 * Conflict-upsert makes concurrent booking attempts safe.
 */
export const upsertUser = async (db, { name, phone }) => {
  const normalizedPhone = normalizePhone(phone);
  const userName = String(name || '').trim();
  if (!userName) throw new Error('A customer name is required.');

  const [user] = await db
    .insert(users)
    .values({ phone: normalizedPhone, name: userName, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: users.phone,
      set: { name: userName, updatedAt: new Date() },
    })
    .returning({ id: users.id });
  return user.id;
};

export const findOrCreateUser = async (input) => {
  const { db, client } = createPostgresClient();
  try {
    return await upsertUser(db, input);
  } finally {
    await client.end({ timeout: 5 });
  }
};
