import mongoose from 'mongoose';

export const defaultCakes = [
  { id: 'cake-1', name: 'Classic Chocolate Truffle', price: 799, description: 'Rich dark chocolate layers' },
  { id: 'cake-2', name: 'Red Velvet Dream', price: 899, description: 'Cream cheese frosted perfection' },
  { id: 'cake-3', name: 'Butterscotch Crunch', price: 749, description: 'Caramel & crunchy butterscotch' },
  { id: 'cake-4', name: 'Fresh Fruit Delight', price: 999, description: 'Seasonal fruits with cream' },
  { id: 'cake-5', name: 'Black Forest Premium', price: 849, description: 'Cherry-filled chocolate classic' },
];

export const defaultDecorations = [
  { id: 'extra-1', name: 'Balloon Bouquet Setup', price: 1500, description: '100+ premium balloons' },
  { id: 'extra-2', name: 'LED Neon Sign', price: 800, description: 'Custom message neon display' },
  { id: 'extra-3', name: 'Photo Wall / Backdrop', price: 2000, description: 'Instagram-worthy backdrop' },
  { id: 'extra-4', name: 'Fog Machine Effect', price: 500, description: 'Dramatic fog entrance' },
  { id: 'extra-5', name: 'Rose Petal Pathway', price: 1200, description: 'Romantic rose petal setup' },
  { id: 'extra-6', name: 'Confetti Cannon', price: 600, description: 'Party poppers & confetti' },
];

export const defaultPricing = {
  'private-theatre-party-hall': { 1: 1999, 2: 3499, 3: 4999 },
};

/**
 * Gets the effective price for an item (offer price if available, otherwise regular price)
 * @param {object} item - Item with price fields
 * @returns {number} The price to use
 */
export const getEffectivePrice = (item) => {
  return item?.offerPrice !== undefined && item.offerPrice !== null ? item.offerPrice : item?.price || 0;
};

export const bookingSchema = new mongoose.Schema({
  id: String,
  branch: String,
  hall: String,       // hall identifier within a branch (e.g. 'hall-1', 'hall-2')
  service: String,
  date: String,
  duration: Number,
  timeSlot: String,
  startTime: String,
  endTime: String,
  membersCount: { type: Number, default: 0 },
  extraPersonsCharge: { type: Number, default: 0 },
  endTimeWithBuffer: String,
  startTimeMinutes: Number,
  endTimeWithBufferMinutes: Number,
  name: String,
  phone: String,
  decorationRequired: Boolean,
  occasion: String,
  customOccasion: String,
  cakeRequired: Boolean,
  selectedCake: mongoose.Schema.Types.Mixed,
  extraDecorations: [mongoose.Schema.Types.Mixed],
  totalPrice: Number,
  paymentStatus: String,
  paymentType: String, // 'full' or 'advance'
  paymentMode: String, // 'razorpay' | 'manual' etc.
  amountPaid: { type: Number, default: 0 },
  reviewRequested: { type: Boolean, default: false },
  balanceAmount: { type: Number, default: 0 },
  notes: String,
  createdAt: Date,
  updatedAt: Date,
});

export const timeSlotSchema = new mongoose.Schema({
  id: String,
  date: String,
  timeSlot: String,
  service: String,
  isBooked: Boolean,
  bookingId: String,
  createdAt: Date,
});

export const branchCatalogSchema = new mongoose.Schema(
  {
    branch: { type: String, required: true, unique: true },
    name: { type: String },
    address: { type: String },
    phone: { type: String },
    mapLink: { type: String },
    halls: { type: [mongoose.Schema.Types.Mixed], default: [] }, // [{id, name}] — empty means single hall
    pricing: { type: mongoose.Schema.Types.Mixed, default: () => JSON.parse(JSON.stringify(defaultPricing)) },
    decorationPrice: { type: Number, default: 1500 },
    cakes: { type: [mongoose.Schema.Types.Mixed], default: () => JSON.parse(JSON.stringify(defaultCakes.map(c => ({ ...c, quantity: '1kg' })))) },
    decorations: { type: [mongoose.Schema.Types.Mixed], default: () => JSON.parse(JSON.stringify(defaultDecorations)) },
    testimonials: { type: [mongoose.Schema.Types.Mixed], default: [] },
    heroImages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    branchVideos: { type: [mongoose.Schema.Types.Mixed], default: [] },
    galleryVideos: { type: [mongoose.Schema.Types.Mixed], default: [] },
    socialLinks: { type: mongoose.Schema.Types.Mixed, default: { 
      instagram: "https://instagram.com/friends_and_memories_elr",
      facebook: "https://facebook.com",
      whatsapp: "" // Default to branch phone
    }},
    bookingsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  branch: { type: String },
  createdAt: { type: Date, default: Date.now },
});
