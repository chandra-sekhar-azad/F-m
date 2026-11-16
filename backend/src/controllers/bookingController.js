import { and, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { createPostgresClient } from '../db/client.js';
import { bookings, branches, timeSlots } from '../db/schema.js';
import { defaultCakes, defaultDecorations, defaultPricing, globalDb } from '../config/constants.js';
import { canFitBookingInOperatingHours, getBlockedSlotsForBooking, parse12HourTime, isOverlappingWithBuffer, getAvailableStartSlots, calculateBookingTimes } from '../utils/timeUtils.js';
import { getCatalogForBranch } from './catalogController.js';
import { findOrCreateUser } from '../db/users.js';
import { sendBookingWhatsAppNotifications } from '../utils/whatsapp.js';

const withDb = async (work) => { const { db, client } = createPostgresClient(); try { return await work(db); } finally { await client.end({ timeout: 5 }); } };
const normalizeBooking = (b) => b && ({ ...b, totalPrice: Number(b.totalPrice), amountPaid: Number(b.amountPaid), balanceAmount: Number(b.balanceAmount), extraPersonsCharge: Number(b.extraPersonsCharge) });
const allBranchIds = ['branch-1', 'branch-2'];
const createSlots = (booking) => getBlockedSlotsForBooking(booking.timeSlot, booking.duration).map((slot) => ({ id: uuidv4(), branch: booking.branch, bookingId: booking.id, date: booking.date, timeSlot: slot, service: booking.service, isBooked: true, createdAt: new Date() }));
const getIndiaDateTime = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
};

export const createBooking = async (req, res) => {
  const { branch } = req.body;
  if (!allBranchIds.includes(branch)) return res.status(400).json({ error: 'Invalid branch' });
  const catalog = await getCatalogForBranch(branch);
  if (catalog?.bookingsEnabled === false) return res.status(403).json({ error: 'Bookings are currently paused for this branch. Please try again later.' });
  if (req.body.hall && catalog?.halls?.find((hall) => hall.id === req.body.hall)?.bookingsEnabled === false) return res.status(403).json({ error: 'Bookings are currently paused for this screen. Please try again later.' });
  const now = getIndiaDateTime();
  if (req.body.date < now.date && !req.body.isAdminBooking) return res.status(400).json({ error: 'Cannot create a booking for a past date.' });
  if (req.body.date === now.date && parse12HourTime(req.body.timeSlot) <= now.minutes && !req.body.isAdminBooking) return res.status(400).json({ error: 'Cannot create a booking for a time slot that has already started.' });
  const memberLimit = branch === 'branch-2' ? 15 : 20;
  if (Number(req.body.membersCount) > memberLimit) return res.status(400).json({ error: `Maximum ${memberLimit} persons allowed for this branch` });
  const booking = { id: `B${uuidv4().slice(0, 8).toUpperCase()}`, ...req.body, ...calculateBookingTimes(req.body.timeSlot, req.body.duration), paymentStatus: req.body.paymentStatus || 'pending', createdAt: new Date(), updatedAt: new Date() };
  if (!canFitBookingInOperatingHours(booking.timeSlot, booking.duration)) return res.status(400).json({ error: 'Selected time is outside available hours (10:00 AM - 12:00 AM)' });
  try {
    booking.userId = await findOrCreateUser({ name: booking.name, phone: booking.phone });
    const result = await withDb(async (db) => {
      const existing = await db.select().from(bookings).where(and(eq(bookings.branch, branch), eq(bookings.date, booking.date), inArray(bookings.paymentStatus, ['paid', 'pending'])));
      const conflict = existing.map(normalizeBooking).find((item) => (!booking.hall || !item.hall || item.hall === booking.hall) && isOverlappingWithBuffer(parse12HourTime(booking.timeSlot), booking.duration, item.timeSlot, item.duration));
      if (conflict) {
        if (conflict.phone === booking.phone && conflict.timeSlot === booking.timeSlot && conflict.paymentStatus === 'pending') return { retry: conflict };
        return { conflict };
      }
      const row = { ...booking, extraPersonsCharge: String(Number(booking.extraPersonsCharge || 0)), totalPrice: String(Number(booking.totalPrice || 0)), amountPaid: String(Number(booking.amountPaid || 0)), balanceAmount: String(Number(booking.balanceAmount || 0)), membersCount: Number(booking.membersCount || 0), extraDecorations: booking.extraDecorations || [], decorationRequired: Boolean(booking.decorationRequired), cakeRequired: Boolean(booking.cakeRequired), reviewRequested: false };
      await db.insert(bookings).values(row);
      const slots = createSlots(booking); if (slots.length) await db.insert(timeSlots).values(slots);
      return { booking: normalizeBooking(row) };
    });
    if (result.retry) return res.status(200).json(result.retry);
    if (result.conflict) return res.status(409).json({ error: `Slot not available at ${booking.timeSlot} for ${booking.duration}h. It overlaps with another booking.`, conflictingId: result.conflict.id });
    if (['paid', 'partially-paid'].includes(booking.paymentStatus)) sendBookingWhatsAppNotifications(booking).catch(() => {});
    res.status(201).json(result.booking);
  } catch (error) { console.error('Error creating booking:', error); res.status(500).json({ error: 'Failed to create booking' }); }
};

export const getBookingById = async (req, res) => { try { const booking = await withDb((db) => db.select().from(bookings).where(eq(bookings.id, req.params.id)).limit(1)); if (!booking[0]) return res.status(404).json({ error: 'Booking not found' }); res.json(normalizeBooking(booking[0])); } catch { res.status(500).json({ error: 'Failed to fetch booking' }); } };
export const getAllBookings = async (req, res) => { try { const { status, branch, startDate, endDate } = req.query; const filters = []; if (status) filters.push(eq(bookings.paymentStatus, status)); if (branch) filters.push(eq(bookings.branch, branch)); if (startDate) filters.push(gte(bookings.date, startDate)); if (endDate) filters.push(lte(bookings.date, endDate)); const rows = await withDb((db) => db.select().from(bookings).where(filters.length ? and(...filters) : undefined)); res.json(rows.map(normalizeBooking).sort((a,b) => a.date.localeCompare(b.date) || (parse12HourTime(a.timeSlot) || 0) - (parse12HourTime(b.timeSlot) || 0))); } catch { res.status(500).json({ error: 'Failed to fetch bookings' }); } };

export const updateBooking = async (req, res) => { try { const result = await withDb(async (db) => { const [current] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)); if (!current) return null; const next = { ...normalizeBooking(current), ...req.body }; if (req.body.timeSlot || req.body.duration) Object.assign(next, calculateBookingTimes(next.timeSlot, next.duration)); if (!canFitBookingInOperatingHours(next.timeSlot, next.duration)) throw new Error('Selected time is outside available hours (10:00 AM - 12:00 AM)'); const update = { ...req.body, ...calculateBookingTimes(next.timeSlot, next.duration), updatedAt: new Date() }; await db.update(bookings).set(update).where(eq(bookings.id, req.params.id)); if (req.body.timeSlot || req.body.duration || req.body.date || req.body.service || req.body.paymentStatus) { await db.delete(timeSlots).where(eq(timeSlots.bookingId, req.params.id)); if (['paid','partially-paid'].includes(next.paymentStatus)) { const slots = createSlots(next); if (slots.length) await db.insert(timeSlots).values(slots); } } const [saved] = await db.select().from(bookings).where(eq(bookings.id, req.params.id)); return normalizeBooking(saved); }); if (!result) return res.status(404).json({ error: 'Booking not found' }); res.json(result); } catch (error) { res.status(400).json({ error: error.message || 'Failed to update booking' }); } };
export const deleteBooking = async (req, res) => { try { const deleted = await withDb(async (db) => { await db.delete(timeSlots).where(eq(timeSlots.bookingId, req.params.id)); return db.delete(bookings).where(eq(bookings.id, req.params.id)).returning({ id: bookings.id }); }); if (!deleted.length) return res.status(404).json({ error: 'Booking not found' }); res.json({ message: 'Booking cancelled' }); } catch { res.status(500).json({ error: 'Failed to cancel booking' }); } };
export const deleteMultipleBookings = async (req, res) => { if (req.body.code !== 'sai@932') return res.status(403).json({ error: 'Invalid security code' }); if (!Array.isArray(req.body.ids) || !req.body.ids.length) return res.status(400).json({ error: 'No IDs provided' }); try { const ids = req.body.ids; const deleted = await withDb(async (db) => { await db.delete(timeSlots).where(inArray(timeSlots.bookingId, ids)); return db.delete(bookings).where(inArray(bookings.id, ids)).returning({ id: bookings.id }); }); res.json({ success: true, deletedCount: deleted.length }); } catch { res.status(500).json({ error: 'Failed to delete bookings' }); } };
export const getAvailability = async (req, res) => { const { branchId, date } = req.params; const duration = Number(req.query.duration || 1); const hall = req.query.hall || null; try { const rows = await withDb((db) => db.select().from(bookings).where(and(eq(bookings.branch, branchId), eq(bookings.date, date), inArray(bookings.paymentStatus, ['pending', 'paid', 'partially-paid'])))); const relevant = rows.map(normalizeBooking).filter((b) => !hall || !b.hall || b.hall === hall); const now = getIndiaDateTime(); const availableSlots = getAvailableStartSlots(relevant, duration).filter((slot) => date !== now.date || parse12HourTime(slot) > now.minutes); res.json({ availableSlots, bookedSlots: relevant.flatMap((b) => getBlockedSlotsForBooking(b.timeSlot, b.duration)) }); } catch { res.status(500).json({ error: 'Failed to fetch availability' }); } };
export const getBookingInit = async (req, res) => { try { const catalog = await getCatalogForBranch(req.params.branchId); if (!catalog) return res.status(404).json({ error: 'Branch not found' }); const branchRows = await withDb((db) => db.select().from(branches)); res.json({ branches: branchRows.map((b) => ({ id: b.id, name: b.name, address: b.address || '', phone: b.phone || '', mapLink: b.mapLink || '', bookingsEnabled: b.bookingsEnabled })), occasions: globalDb.occasions, pricing: catalog.pricing || defaultPricing, cakes: catalog.cakes || defaultCakes, decorations: catalog.decorations || defaultDecorations, decorationPrice: catalog.decorationPrice ?? 1500 }); } catch { res.status(500).json({ error: 'Failed to initialize booking data' }); } };
